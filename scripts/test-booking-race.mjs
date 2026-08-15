/**
 * Concurrency test for public.book_pooja_slot().
 *
 *   $env:DATABASE_URL = "postgresql://..."
 *   node scripts/test-booking-race.mjs
 *
 * Creates a temporary pooja with a small capacity, then fires many booking
 * calls simultaneously on SEPARATE connections (so they are genuinely
 * concurrent transactions, not queued on one socket) and asserts that exactly
 * `capacity` of them succeed. Also checks the duplicate-phone guard and the
 * cancel-then-rebook path. Everything it creates is deleted afterwards.
 */
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const CAPACITY = 3;
const CONTENDERS = 12;

const newClient = () =>
  new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

const problems = [];
function check(ok, label, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(label);
}

const admin = newClient();
await admin.connect();

let poojaId;

try {
  // Clear anything a previous aborted run may have left behind.
  await admin.query(
    `delete from public.pooja_bookings
      where pooja_id in (select id from public.pooja_schedule where title = '__race_test_pooja')`,
  );
  await admin.query(`delete from public.pooja_schedule where title = '__race_test_pooja'`);

  const { rows } = await admin.query(
    `insert into public.pooja_schedule
       (title, pooja_date, start_time, end_time, max_couples, booking_enabled,
        is_published, status, description)
     values ('__race_test_pooja', current_date + 1, '09:00', '10:00', $1, true,
             true, 'scheduled', 'temporary row created by test-booking-race.mjs')
     returning id`,
    [CAPACITY],
  );
  poojaId = rows[0].id;
  console.log(`temporary pooja ${poojaId} with capacity ${CAPACITY}\n`);

  // --- the race -------------------------------------------------------------
  const clients = await Promise.all(
    Array.from({ length: CONTENDERS }, async () => {
      const c = newClient();
      await c.connect();
      return c;
    }),
  );

  // Every connection is parked and ready before any of them fires.
  const results = await Promise.all(
    clients.map((c, i) =>
      c
        .query(
          `select public.book_pooja_slot($1, $2, $3, $4, null, null, null, 'public_form') as r`,
          [poojaId, `Racer ${i}`, `Partner ${i}`, `90000000${String(i).padStart(2, "0")}`],
        )
        .then((res) => res.rows[0].r)
        .catch((err) => ({ ok: false, code: "exception", message: err.message })),
    ),
  );
  await Promise.all(clients.map((c) => c.end()));

  const ok = results.filter((r) => r.ok);
  const full = results.filter((r) => !r.ok && r.code === "full");
  const other = results.filter((r) => !r.ok && r.code !== "full");

  console.log(
    `${CONTENDERS} concurrent attempts -> ${ok.length} booked, ${full.length} told "full", ${other.length} other`,
  );
  if (other.length) console.log("  other:", JSON.stringify(other.slice(0, 3)));

  check(ok.length === CAPACITY, `exactly ${CAPACITY} bookings succeeded`, `got ${ok.length}`);
  check(other.length === 0, "no unexpected errors during the race");

  const { rows: counted } = await admin.query(
    `select count(*)::int as n from public.pooja_bookings
      where pooja_id = $1 and status in ('pending','confirmed','rescheduled','completed')`,
    [poojaId],
  );
  check(counted[0].n === CAPACITY, `database holds exactly ${CAPACITY} bookings`, `got ${counted[0].n}`);

  const refs = ok.map((r) => r.booking_ref);
  check(new Set(refs).size === refs.length, "booking references are unique", refs.join(" "));
  check(refs.every((r) => /^SK\d{4}-\d{4}$/.test(r)), "references match SK<year>-<seq>", refs.join(" "));

  // --- availability view agrees --------------------------------------------
  const { rows: avail } = await admin.query(
    `select booked, available, is_bookable from public.pooja_availability where pooja_id = $1`,
    [poojaId],
  );
  check(
    avail[0].booked === CAPACITY && avail[0].available === 0 && avail[0].is_bookable === false,
    "availability view reports full and not bookable",
    JSON.stringify(avail[0]),
  );

  // --- a further attempt is refused ----------------------------------------
  const { rows: extra } = await admin.query(
    `select public.book_pooja_slot($1, 'Late Comer', 'Partner', '9111111111') as r`,
    [poojaId],
  );
  check(extra[0].r.ok === false && extra[0].r.code === "full",
    "a later booking attempt is refused with code 'full'", JSON.stringify(extra[0].r));

  // --- cancel one, then the slot frees up ----------------------------------
  const firstRef = refs[0];
  const firstPhone = `90000000${String(results.findIndex((r) => r.booking_ref === firstRef)).padStart(2, "0")}`;
  const { rows: cancelled } = await admin.query(
    `select public.cancel_pooja_booking($1, $2, 'test') as r`, [firstRef, firstPhone],
  );
  check(cancelled[0].r.ok === true, "booking cancelled by ref + phone", JSON.stringify(cancelled[0].r));

  const { rows: rebook } = await admin.query(
    `select public.book_pooja_slot($1, 'Second Chance', 'Partner', '9222222222') as r`,
    [poojaId],
  );
  check(rebook[0].r.ok === true, "freed slot can be rebooked", JSON.stringify(rebook[0].r?.booking_ref ?? rebook[0].r));

  // --- duplicate phone guard ------------------------------------------------
  // Checked on a pooja that still has room, so a "full" result cannot mask the
  // duplicate result.
  const { rows: roomy } = await admin.query(
    `insert into public.pooja_schedule
       (title, pooja_date, start_time, max_couples, booking_enabled, is_published, status)
     values ('__race_test_pooja', current_date + 2, '10:00', 5, true, true, 'scheduled')
     returning id`,
  );
  const roomyId = roomy[0].id;
  await admin.query(
    `select public.book_pooja_slot($1, 'Repeat Caller', 'Partner', '9222222222')`, [roomyId],
  );
  const { rows: dup } = await admin.query(
    `select public.book_pooja_slot($1, 'Repeat Caller Again', 'Partner', '9222222222') as r`,
    [roomyId],
  );
  check(dup[0].r.ok === false && dup[0].r.code === "duplicate",
    "same phone cannot book the same pooja twice", JSON.stringify(dup[0].r));

  const { rows: otherPhone } = await admin.query(
    `select public.book_pooja_slot($1, 'Different Couple', 'Partner', '9444444444') as r`,
    [roomyId],
  );
  check(otherPhone[0].r.ok === true,
    "a different phone can still book the same pooja", otherPhone[0].r?.booking_ref ?? "");

  await admin.query(`delete from public.pooja_bookings where pooja_id = $1`, [roomyId]);
  await admin.query(`delete from public.pooja_schedule where id = $1`, [roomyId]);

  // --- wrong phone cannot read or cancel someone else's booking ------------
  const { rows: wrong } = await admin.query(
    `select public.get_booking_by_ref($1, '9999999999') as r`, [refs[1]],
  );
  check(wrong[0].r.ok === false, "lookup with the wrong phone is refused", JSON.stringify(wrong[0].r));

  const { rows: right } = await admin.query(
    `select public.get_booking_by_ref($1, $2) as r`,
    [refs[1], `90000000${String(results.findIndex((r) => r.booking_ref === refs[1])).padStart(2, "0")}`],
  );
  check(right[0].r.ok === true, "lookup with the correct phone succeeds");

  // --- validation -----------------------------------------------------------
  const { rows: badPhone } = await admin.query(
    `select public.book_pooja_slot($1, 'No Phone', null, 'abc') as r`, [poojaId],
  );
  check(badPhone[0].r.code === "invalid_input", "invalid phone rejected", JSON.stringify(badPhone[0].r));

  // --- anonymous role cannot touch the table directly ----------------------
  // A failed statement poisons the whole transaction, so each expected failure
  // is wrapped in its own savepoint and rolled back to it.
  const expectDenied = async (label, sql, params = []) => {
    await admin.query("savepoint probe");
    try {
      await admin.query(sql, params);
      await admin.query("rollback to savepoint probe");
      check(false, label, "was ALLOWED");
    } catch {
      await admin.query("rollback to savepoint probe");
      check(true, label);
    }
  };

  await admin.query("begin");
  await admin.query("set local role anon");

  await expectDenied(
    "anon cannot read pooja_bookings directly",
    `select count(*) from public.pooja_bookings`,
  );
  await expectDenied(
    "anon cannot insert into pooja_bookings directly",
    `insert into public.pooja_bookings (booking_ref, pooja_id, partner1_name, phone)
     values ('SK9999-9999', $1, 'Sneaky', '9000000000')`,
    [poojaId],
  );
  await expectDenied(
    "anon cannot read ai_action_logs",
    `select count(*) from public.ai_action_logs`,
  );

  const { rows: anonView } = await admin.query(
    `select booked, available from public.pooja_availability where pooja_id = $1`, [poojaId],
  );
  check(anonView.length === 1, "anon CAN read aggregate availability", JSON.stringify(anonView[0]));

  const { rows: anonBook } = await admin.query(
    `select public.book_pooja_slot($1, 'Anon Caller', 'Partner', '9333333333') as r`, [poojaId],
  );
  check(
    typeof anonBook[0].r?.ok === "boolean",
    "anon CAN call book_pooja_slot (the only booking path)",
    JSON.stringify(anonBook[0].r?.code ?? anonBook[0].r?.booking_ref),
  );

  await admin.query("rollback");
} catch (error) {
  console.error("\nERROR:", error.message);
  process.exitCode = 1;
} finally {
  // The connection may be sitting in an aborted transaction; clear it before
  // cleaning up, otherwise the deletes fail too and test rows are left behind.
  try {
    await admin.query("rollback");
  } catch {
    /* not in a transaction */
  }

  try {
    await admin.query(
      `delete from public.pooja_bookings
        where pooja_id in (select id from public.pooja_schedule where title = '__race_test_pooja')`,
    );
    await admin.query(`delete from public.pooja_schedule where title = '__race_test_pooja'`);
    const { rows } = await admin.query(
      `select (select count(*)::int from public.pooja_bookings) as bookings,
              (select count(*)::int from public.pooja_schedule where title = '__race_test_pooja') as test_poojas`,
    );
    console.log(
      `\ncleanup: pooja_bookings=${rows[0].bookings} leftover test poojas=${rows[0].test_poojas}`,
    );
    if (rows[0].bookings !== 0 || rows[0].test_poojas !== 0) {
      problems.push("cleanup left rows behind");
    }
  } catch (cleanupError) {
    console.error("cleanup FAILED:", cleanupError.message);
    problems.push("cleanup failed");
  }

  await admin.end();
}

if (problems.length) {
  console.error(`\n${problems.length} check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll booking checks passed.");
}
