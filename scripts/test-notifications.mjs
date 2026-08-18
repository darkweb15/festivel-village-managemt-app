/**
 * Notifications: schema, triggers and RLS, checked against a real database.
 *
 *   $env:DATABASE_URL = "postgresql://..."   # PowerShell
 *   node scripts/test-notifications.mjs
 *
 * Run this after `node scripts/db-push.mjs` has applied
 * supabase/migrations/20260301000000_notifications.sql.
 *
 * Everything that writes runs inside one transaction that is rolled back at the
 * end, so this is safe against the live database: no announcement, pooja or
 * event created here survives the script. The only lasting effect is the output.
 *
 * What it is actually asserting, in plain terms:
 *
 *   - a notification appears exactly when the committee publishes something,
 *     and never when they save a draft;
 *   - retracting or deleting the source takes its notification with it;
 *   - moving a pooja or an event is news; editing its description is not;
 *   - the public can read the feed and cannot write to it, forge an entry, or
 *     see which internal row it came from.
 */
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Set it to the project's Postgres connection string and run this again:\n" +
      '  $env:DATABASE_URL = "postgresql://..."\n' +
      "  node scripts/test-notifications.mjs",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  // Supabase terminates TLS at the pooler with a chain Node doesn't ship.
  ssl: { rejectUnauthorized: false },
  statement_timeout: 60_000,
});

const failures = [];
let checks = 0;

function check(ok, label, detail = "") {
  checks += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

/** Runs a statement that is expected to be refused, and reports why. */
async function refused(sql, label) {
  try {
    await client.query("savepoint probe");
    await client.query(sql);
    await client.query("rollback to savepoint probe");
    check(false, label, "the statement succeeded");
  } catch (error) {
    await client.query("rollback to savepoint probe");
    check(true, label, error.message.split("\n")[0]);
  }
}

const rowsFor = (source) =>
  client
    .query(
      `select kind::text, subject, detail, meta, href, published_at
         from public.notifications
        where source_table = $1 and source_id = $2
        order by published_at, created_at`,
      source,
    )
    .then((r) => r.rows);

await client.connect();

try {
  // ---------------------------------------------------------------------------
  // Schema
  // ---------------------------------------------------------------------------
  const { rows: table } = await client.query(
    `select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'notifications'`,
  );
  if (table.length === 0) {
    console.error(
      "\npublic.notifications does not exist.\n" +
        "Apply the migration first:  node scripts/db-push.mjs",
    );
    process.exit(1);
  }
  check(true, "public.notifications exists");

  const { rows: kinds } = await client.query(
    `select enumlabel from pg_enum e
       join pg_type t on t.oid = e.enumtypid
      where t.typname = 'notification_kind' order by enumsortorder`,
  );
  check(
    kinds.map((k) => k.enumlabel).join(",") === "announcement,notice,pooja,event",
    "notification_kind enum has the four kinds",
    kinds.map((k) => k.enumlabel).join(","),
  );

  const { rows: triggers } = await client.query(
    `select tgname from pg_trigger
      where tgname in ('announcements_notify','pooja_schedule_notify','events_notify')
      order by tgname`,
  );
  check(
    triggers.length === 3,
    "all three source triggers installed",
    triggers.map((t) => t.tgname).join(", "),
  );

  const { rows: definer } = await client.query(
    `select proname, prosecdef from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and proname in ('notify_announcement','notify_pooja_schedule','notify_event')`,
  );
  check(
    definer.length === 3 && definer.every((f) => f.prosecdef),
    "trigger functions are security definer",
    definer.map((f) => f.proname).join(", "),
  );

  const { rows: rls } = await client.query(
    `select relrowsecurity from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'notifications'`,
  );
  check(rls[0]?.relrowsecurity === true, "RLS is enabled on notifications");

  const { rows: policies } = await client.query(
    `select policyname, cmd from pg_policies
      where schemaname = 'public' and tablename = 'notifications'
      order by policyname`,
  );
  check(
    policies.some((p) => p.cmd === "SELECT"),
    "a read policy exists",
    policies.map((p) => `${p.policyname}(${p.cmd})`).join(" "),
  );
  check(
    !policies.some((p) => ["INSERT", "UPDATE"].includes(p.cmd)),
    "no INSERT or UPDATE policy exists — triggers are the only writer",
  );

  // ---------------------------------------------------------------------------
  // Column grants: what the public is allowed to see
  // ---------------------------------------------------------------------------
  const { rows: grants } = await client.query(
    `select grantee, privilege_type, string_agg(column_name, ',' order by column_name) as cols
       from information_schema.column_privileges
      where table_schema = 'public' and table_name = 'notifications'
        and grantee in ('anon','authenticated')
      group by grantee, privilege_type
      order by grantee, privilege_type`,
  );
  const anonSelect =
    grants.find((g) => g.grantee === "anon" && g.privilege_type === "SELECT")?.cols ??
    "";
  check(anonSelect.length > 0, "anon may read the feed", anonSelect);
  check(
    !anonSelect.includes("source_table") && !anonSelect.includes("source_id"),
    "anon cannot read source_table / source_id",
    anonSelect,
  );
  check(
    !grants.some(
      (g) => g.grantee === "anon" && ["INSERT", "UPDATE", "DELETE"].includes(g.privilege_type),
    ),
    "anon has no write grant of any kind",
  );
  check(
    !grants.some(
      (g) =>
        g.grantee === "authenticated" && ["INSERT", "UPDATE"].includes(g.privilege_type),
    ),
    "even signed-in committee accounts cannot insert or update a notification",
  );

  // ---------------------------------------------------------------------------
  // Behaviour. Everything below is rolled back.
  // ---------------------------------------------------------------------------
  await client.query("begin");

  // --- announcements ---------------------------------------------------------
  const { rows: draft } = await client.query(
    `insert into public.announcements (title, body, category, is_published)
     values ('NOTIF TEST draft', 'Body of the draft.', 'general', false)
     returning id`,
  );
  check(
    (await rowsFor(["announcements", draft[0].id])).length === 0,
    "a draft announcement notifies nobody",
  );

  await client.query(`update public.announcements set is_published = true where id = $1`, [
    draft[0].id,
  ]);
  const published = await rowsFor(["announcements", draft[0].id]);
  check(
    published.length === 1 && published[0].kind === "announcement",
    "publishing a draft creates exactly one notification",
    published.map((r) => r.kind).join(","),
  );
  check(
    published[0]?.href === `/announcements#announcement-${draft[0].id}`,
    "the notification deep-links to the announcement it is about",
    published[0]?.href ?? "",
  );
  check(
    published[0]?.subject === "NOTIF TEST draft" &&
      published[0]?.detail === "Body of the draft.",
    "the committee's own words are carried through untouched",
    published[0]?.detail ?? "",
  );

  // Editing a published announcement must not produce a second notification.
  await client.query(
    `update public.announcements set body = 'Edited body.' where id = $1`,
    [draft[0].id],
  );
  check(
    (await rowsFor(["announcements", draft[0].id])).length === 1,
    "editing a published announcement does not notify again",
  );

  await client.query(`update public.announcements set is_published = false where id = $1`, [
    draft[0].id,
  ]);
  check(
    (await rowsFor(["announcements", draft[0].id])).length === 0,
    "retracting an announcement withdraws its notification",
  );

  const { rows: important } = await client.query(
    `insert into public.announcements (title, body, category, is_published)
     values ('NOTIF TEST notice', 'Nimajjanam route changed.', 'important', true)
     returning id`,
  );
  const noticeRows = await rowsFor(["announcements", important[0].id]);
  check(
    noticeRows.length === 1 && noticeRows[0].kind === "notice",
    "an important announcement is filed as a notice, not an announcement",
    noticeRows[0]?.kind ?? "",
  );

  await client.query(`delete from public.announcements where id = $1`, [important[0].id]);
  check(
    (await rowsFor(["announcements", important[0].id])).length === 0,
    "deleting an announcement deletes its notification",
  );

  // --- pooja schedule --------------------------------------------------------
  const { rows: pooja } = await client.query(
    `insert into public.pooja_schedule (title, pooja_date, start_time, is_published)
     values ('NOTIF TEST pooja', current_date + 2, '18:30', true)
     returning id`,
  );
  const poojaAdded = await rowsFor(["pooja_schedule", pooja[0].id]);
  check(
    poojaAdded.length === 1 &&
      poojaAdded[0].kind === "pooja" &&
      poojaAdded[0].meta.reason === "added",
    "publishing a pooja announces it",
    JSON.stringify(poojaAdded[0]?.meta ?? {}),
  );
  check(
    poojaAdded[0]?.href === `/pooja#pooja-${pooja[0].id}`,
    "the pooja notification deep-links to that pooja",
    poojaAdded[0]?.href ?? "",
  );

  await client.query(
    `update public.pooja_schedule set description = 'Bring flowers.' where id = $1`,
    [pooja[0].id],
  );
  check(
    (await rowsFor(["pooja_schedule", pooja[0].id])).length === 1,
    "editing a pooja's description is not news",
  );

  await client.query(
    `update public.pooja_schedule set start_time = '19:15' where id = $1`,
    [pooja[0].id],
  );
  const poojaMoved = await rowsFor(["pooja_schedule", pooja[0].id]);
  const moved = poojaMoved.find((r) => r.meta.reason === "rescheduled");
  check(
    poojaMoved.length === 2 && Boolean(moved),
    "moving a pooja's time notifies again",
    poojaMoved.map((r) => r.meta.reason).join(","),
  );
  check(
    moved?.meta.start_time === "19:15:00" && moved?.meta.previous_time === "18:30:00",
    "the reschedule carries both the new time and the old one",
    JSON.stringify(moved?.meta ?? {}),
  );

  await client.query(`update public.pooja_schedule set is_published = false where id = $1`, [
    pooja[0].id,
  ]);
  check(
    (await rowsFor(["pooja_schedule", pooja[0].id])).length === 0,
    "unpublishing a pooja withdraws every notification about it",
  );

  // --- events ----------------------------------------------------------------
  const { rows: event } = await client.query(
    `insert into public.events (title, event_date, start_time, venue, is_published)
     values ('NOTIF TEST event', current_date + 3, '17:00', 'Mandapam', true)
     returning id`,
  );
  const eventAdded = await rowsFor(["events", event[0].id]);
  check(
    eventAdded.length === 1 &&
      eventAdded[0].kind === "event" &&
      eventAdded[0].detail === "Mandapam",
    "publishing an event announces it, with its venue",
    JSON.stringify(eventAdded[0]?.meta ?? {}),
  );

  await client.query(
    `update public.events set event_date = current_date + 4 where id = $1`,
    [event[0].id],
  );
  const eventMoved = await rowsFor(["events", event[0].id]);
  check(
    eventMoved.length === 2 &&
      eventMoved.some((r) => r.meta.reason === "rescheduled" && r.meta.previous_date),
    "moving an event's date notifies again, remembering the old date",
    eventMoved.map((r) => r.meta.reason).join(","),
  );

  await client.query(`delete from public.events where id = $1`, [event[0].id]);
  check(
    (await rowsFor(["events", event[0].id])).length === 0,
    "deleting an event deletes both of its notifications",
  );

  // ---------------------------------------------------------------------------
  // What an anonymous visitor can actually do
  // ---------------------------------------------------------------------------
  // A row that exists for anon to find, measured as the owner first so the
  // comparison below is against the truth rather than against anon's own view.
  await client.query(
    `insert into public.announcements (title, body, is_published)
     values ('NOTIF TEST public', 'Visible to the village.', true)`,
  );
  const { rows: ownerCount } = await client.query(
    `select count(*)::int as n from public.notifications`,
  );

  await client.query("set local role anon");

  const { rows: anonCount } = await client.query(
    `select count(*)::int as n from public.notifications`,
  );
  check(
    anonCount[0].n === ownerCount[0].n,
    "anon reads the whole public feed",
    `${anonCount[0].n} of ${ownerCount[0].n}`,
  );

  await refused(
    `select source_table from public.notifications limit 1`,
    "anon CANNOT read source_table",
  );
  await refused(
    `insert into public.notifications (kind, subject, href, source_table, source_id)
     values ('notice', 'Forged notice', '/', 'announcements', gen_random_uuid())`,
    "anon CANNOT forge a notification",
  );
  await refused(
    `update public.notifications set subject = 'Tampered'`,
    "anon CANNOT rewrite a notification",
  );
  await refused(
    `delete from public.notifications`,
    "anon CANNOT delete notifications",
  );

  await client.query("reset role");

  // ---------------------------------------------------------------------------
  // Leave nothing behind
  // ---------------------------------------------------------------------------
  await client.query("rollback");

  const { rows: leftover } = await client.query(
    `select count(*)::int as n from public.notifications where subject like 'NOTIF TEST%'`,
  );
  check(leftover[0].n === 0, "every test row rolled back, database left clean");

  const { rows: leftoverSources } = await client.query(
    `select
       (select count(*) from public.announcements where title like 'NOTIF TEST%')
     + (select count(*) from public.pooja_schedule where title like 'NOTIF TEST%')
     + (select count(*) from public.events where title like 'NOTIF TEST%') as n`,
  );
  check(Number(leftoverSources[0].n) === 0, "no test announcements, poojas or events remain");
} catch (error) {
  console.error("\nERROR:", error.message);
  if (error.detail) console.error("detail:", error.detail);
  try {
    await client.query("rollback");
  } catch {
    // Already rolled back, or the connection is gone.
  }
  process.exitCode = 1;
} finally {
  await client.end();
}

if (failures.length) {
  console.error(`\n${failures.length} of ${checks} check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${checks} checks passed.`);
}
