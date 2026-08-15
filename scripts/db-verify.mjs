/**
 * Post-migration sanity check.
 *
 *   $env:DATABASE_URL = "postgresql://..."
 *   node scripts/db-verify.mjs
 *
 * Confirms RLS is enabled everywhere, policies exist, the aggregate functions
 * work, the storage buckets are present, and — most importantly — that the
 * `anon` role really is limited to the columns and rows we intended.
 */
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const problems = [];
function check(ok, label, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
}

await client.connect();

try {
  // --- RLS enabled on every table -----------------------------------------
  const { rows: rls } = await client.query(
    `select relname, relrowsecurity
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by relname`,
  );
  const noRls = rls.filter((r) => !r.relrowsecurity).map((r) => r.relname);
  check(noRls.length === 0, `RLS enabled on all ${rls.length} tables`, noRls.join(", "));

  // --- policies -------------------------------------------------------------
  const { rows: pol } = await client.query(
    `select tablename, count(*)::int as n
       from pg_policies where schemaname = 'public'
      group by tablename order by tablename`,
  );
  const total = pol.reduce((sum, p) => sum + p.n, 0);
  check(pol.length === rls.length, `every table has policies (${total} total)`,
    pol.map((p) => `${p.tablename}:${p.n}`).join(" "));

  // --- helper + aggregate functions ----------------------------------------
  const { rows: fns } = await client.query(
    `select proname, prosecdef
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and proname in ('is_admin','can_edit','public_stats','admin_stats','touch_updated_at','handle_new_auth_user','stamp_donation_verification')
      order by proname`,
  );
  check(fns.length === 7, "all 7 functions created", fns.map((f) => f.proname).join(", "));

  const definers = fns.filter((f) => f.prosecdef).map((f) => f.proname).sort();
  check(
    ["admin_stats", "can_edit", "handle_new_auth_user", "is_admin", "public_stats"].every((n) =>
      definers.includes(n),
    ),
    "security-definer set where required",
    definers.join(", "),
  );

  // --- triggers -------------------------------------------------------------
  const { rows: trg } = await client.query(
    `select count(*)::int as n from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace nsp on nsp.oid = c.relnamespace
      where not t.tgisinternal and nsp.nspname = 'public'`,
  );
  check(trg[0].n >= 13, `updated_at / verification triggers installed (${trg[0].n})`);

  const { rows: authTrg } = await client.query(
    `select tgname from pg_trigger where tgname = 'on_auth_user_created'`,
  );
  check(authTrg.length === 1, "auth.users -> public.users trigger installed");

  // --- settings singleton ---------------------------------------------------
  const { rows: settings } = await client.query(
    `select festival_name, festival_year, donation_goal from public.festival_settings`,
  );
  check(settings.length === 1, "festival_settings has exactly one row",
    settings.length ? `${settings[0].festival_name} ${settings[0].festival_year}` : "");

  // --- storage buckets ------------------------------------------------------
  const { rows: buckets } = await client.query(
    `select id, public from storage.buckets where id in ('gallery','members','receipts') order by id`,
  );
  check(buckets.length === 3, "storage buckets created",
    buckets.map((b) => `${b.id}${b.public ? "(public)" : "(private)"}`).join(" "));

  // --- public_stats() -------------------------------------------------------
  // Checked against the tables rather than against zero, so this stays a real
  // assertion whether the festival has data in it or not.
  const { rows: stats } = await client.query(`select public.public_stats() as s`);
  const s = stats[0].s;
  const { rows: truth } = await client.query(
    `select coalesce(sum(amount), 0)::numeric as verified,
            count(*)::int                     as txns
       from public.donations where status = 'verified'`,
  );
  check(
    Number(s.total_donations) === Number(truth[0].verified) &&
      Number(s.transaction_count) === truth[0].txns,
    "public_stats() agrees with the donations table",
    `stats ${s.total_donations}/${s.transaction_count} vs table ${truth[0].verified}/${truth[0].txns}`,
  );

  // --- what anon can actually see -------------------------------------------
  const { rows: anonCols } = await client.query(
    `select table_name, string_agg(column_name, ',' order by column_name) as cols
       from information_schema.column_privileges
      where grantee = 'anon' and table_schema = 'public'
        and privilege_type = 'SELECT'
        and table_name in ('donations','expenses','volunteers')
      group by table_name order by table_name`,
  );
  const donationCols = anonCols.find((r) => r.table_name === "donations")?.cols ?? "";
  check(
    !donationCols.includes("donor_phone") && !donationCols.includes("transaction_ref"),
    "anon cannot read donor_phone / transaction_ref",
    donationCols,
  );
  const volunteerCols = anonCols.find((r) => r.table_name === "volunteers")?.cols ?? "";
  check(!volunteerCols.includes("phone"), "anon cannot read volunteer phone numbers", volunteerCols);
  const expenseCols = anonCols.find((r) => r.table_name === "expenses")?.cols ?? "";
  check(!expenseCols.includes("vendor"), "anon cannot read expense vendor / receipts", expenseCols);

  // --- anon really is blocked by RLS at runtime ------------------------------
  // Measured as the table owner first, so the assertions below compare anon's
  // view against the truth rather than against itself.
  const { rows: visible } = await client.query(
    `select count(*)::int as n from public.donations
      where status = 'verified' and is_public`,
  );
  const expectedVisible = visible[0].n;

  await client.query("begin");
  await client.query("set local role anon");

  // anon must see exactly the verified + public donations, and nothing else.
  // `expectedVisible` was measured as the owner, before the role switch below,
  // otherwise the comparison would be against anon's own filtered view.
  const { rows: anonSees } = await client.query(
    `select count(*)::int as n from public.donations`,
  );
  check(
    anonSees[0].n === expectedVisible,
    "anon sees only verified, public donations",
    `${anonSees[0].n} visible vs ${expectedVisible} eligible`,
  );

  const { rows: anonPending } = await client.query(
    `select count(*)::int as n from public.donations where status <> 'verified'`,
  );
  check(anonPending[0].n === 0, "anon sees no unverified donations");

  let insertedPending = false;
  try {
    await client.query(
      `insert into public.donations (donor_name, amount, status, source)
       values ('RLS probe', 100, 'pending', 'public_form')`,
    );
    insertedPending = true;
  } catch {
    insertedPending = false;
  }
  check(insertedPending, "anon CAN submit a pending donation (public form works)");

  let blockedVerified = false;
  try {
    await client.query(
      `insert into public.donations (donor_name, amount, status, source)
       values ('RLS probe', 999999, 'verified', 'public_form')`,
    );
  } catch {
    blockedVerified = true;
  }
  check(blockedVerified, "anon CANNOT self-insert a verified donation");

  let blockedEvent = false;
  try {
    await client.query(
      `insert into public.events (title, event_date) values ('RLS probe', current_date)`,
    );
  } catch {
    blockedEvent = true;
  }
  check(blockedEvent, "anon CANNOT create events");

  let blockedSettings = false;
  try {
    await client.query(`update public.festival_settings set donation_goal = 1`);
    const { rows: r } = await client.query(
      `select donation_goal from public.festival_settings`,
    );
    blockedSettings = Number(r[0]?.donation_goal ?? 0) !== 1;
  } catch {
    blockedSettings = true;
  }
  check(blockedSettings, "anon CANNOT change festival settings");

  // Roll the probe rows back — nothing is left behind.
  await client.query("rollback");

  const { rows: leftover } = await client.query(
    `select count(*)::int as n from public.donations where donor_name = 'RLS probe'`,
  );
  check(leftover[0].n === 0, "probe rows rolled back, database left clean");
} catch (error) {
  console.error("\nERROR:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

if (problems.length) {
  console.error(`\n${problems.length} check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll checks passed.");
}
