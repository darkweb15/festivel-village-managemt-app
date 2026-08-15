/**
 * TEMPORARY sample content, used only to review how populated screens look.
 *
 *   $env:DATABASE_URL = "postgresql://..."
 *   node scripts/dev-sample-data.mjs --dry-run   # insert inside a transaction, then roll back
 *   node scripts/dev-sample-data.mjs --insert    # insert and record the ids
 *   node scripts/dev-sample-data.mjs --delete    # remove exactly what was inserted
 *
 * Every inserted primary key is recorded in .sample-data-ids.json so --delete
 * removes precisely those rows and nothing else. This is a development aid; it
 * is NOT seed data and must not be left in a committee's live database.
 */
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const mode = args.has("--delete") ? "delete" : args.has("--insert") ? "insert" : "dry-run";
const idsFile = path.join(process.cwd(), ".sample-data-ids.json");

/* -------------------------------------------------------------------------- */
/* Content                                                                     */
/* -------------------------------------------------------------------------- */

const EVENTS = [
  ["Maha Ganapathi Pooja", "Abhishekam and archana to Lord Vinayaka, followed by prasadam distribution.", "2026-08-24", "09:00", "11:30", "Morning", "Sri Vinayaka Mandapam", "pooja", false, true],
  ["Maha Aarti", "Evening aarti with bhajans by the village bhajana mandali.", "2026-08-25", "19:00", "20:00", "Evening", "Sri Vinayaka Mandapam", "pooja", false, true],
  ["Annadanam", "Community lunch served to all devotees. Volunteers assemble by 11:00 AM.", "2026-08-26", "12:30", "15:00", "Afternoon", "Mandapam grounds", "seva", false, false],
  ["Cultural Evening", "Kolatam, classical dance and singing by children of the village.", "2026-08-27", "18:30", "21:00", "Evening", "Mandapam grounds", "cultural", true, false],
  ["Bhajana Sandhya", "Devotional singing through the evening. All families welcome.", "2026-08-26", "18:00", "20:30", "Evening", "Mandapam grounds", "cultural", true, false],
  ["Nimajjanam", "Procession from the mandapam to the village tank for immersion.", "2026-08-28", "10:00", "14:00", "Morning", "Starts at Sri Vinayaka Mandapam", "nimajjanam", false, true],
];

// title, description, date, start, end, priest, order, max_couples, booking_enabled, instructions
const POOJAS = [
  ["Suprabhatam", "Morning awakening of the Lord with Vedic chanting.", "2026-08-15", "06:00", "06:45", "Sri Rama Sarma", 0, 0, false, null],
  ["Madhyahna Pooja", "Midday archana and naivedyam.", "2026-08-15", "12:00", "12:45", "Sri Rama Sarma", 1, 0, false, null],
  ["Maha Aarti", "Evening aarti with deeparadhana.", "2026-08-15", "19:00", "19:45", "Sri Rama Sarma", 2, 0, false, null],
  ["Maha Ganapathi Pooja", "Dhampathula pooja performed by couples together.", "2026-08-16", "09:00", "11:00", "Sri Rama Sarma", 0, 10, true,
    "Couples should arrive 15 minutes early. Please bring flowers and a coconut."],
  ["Maha Aarti", "Evening aarti with deeparadhana.", "2026-08-16", "19:00", "19:45", "Sri Rama Sarma", 2, 0, false, null],
  ["Maha Ganapathi Pooja", "Dhampathula pooja performed by couples together.", "2026-08-24", "09:00", "11:00", "Sri Venkata Sastry", 0, 10, true,
    "Couples should arrive 15 minutes early. Please bring flowers and a coconut."],
  ["Ganapathi Homam", "Homam for the wellbeing of the village.", "2026-08-25", "07:30", "09:00", "Sri Venkata Sastry", 1, 6, true,
    "Homam is performed jointly; one couple per slot."],
];

const ANNOUNCEMENTS = [
  ["Maha Aarti Tomorrow", "Maha Aarti will be performed tomorrow at 07:00 PM. All families are requested to attend with their children.", "pooja", true],
  ["Annadanam Seva", "Annadanam will be held on 26th Aug at 12:30 PM. Families wishing to sponsor a day may contact the treasurer.", "events", false],
  ["Nimajjanam Route", "Nimajjanam will start from the mandapam at 10:00 AM and proceed via the main bazaar road to the village tank.", "general", false],
  ["Volunteer Meeting", "All volunteers are requested to attend today's meeting at 06:00 PM at the mandapam to finalise duty rosters.", "general", false],
  ["Pandal Decoration", "Decoration work begins on 22nd Aug. Volunteers from the decoration team please report by 4:00 PM.", "events", false],
];

const MEMBERS = [
  ["Ramesh Babu", "President", "+91 98480 11111", "Leading the committee for the fourth year.", 0],
  ["Suresh Reddy", "Secretary", "+91 98480 22222", null, 1],
  ["Mahesh Kumar", "Treasurer", "+91 98480 33333", "Maintains the donation and expense accounts.", 2],
  ["Satish Yadav", "Joint Secretary", "+91 98480 44444", null, 3],
  ["Kiran Kumar", "Event Coordinator", "+91 98480 55555", null, 4],
  ["Praveen Reddy", "Public Relations", "+91 98480 66666", null, 5],
];

const VOLUNTEERS = [
  ["Anil Kumar", "Annadanam", "Mornings"], ["Naveen Rao", "Annadanam", "Afternoons"],
  ["Srinivas M", "Annadanam", "All day"], ["Lakshmi Devi", "Decoration", "Evenings"],
  ["Padma Sri", "Decoration", "Evenings"], ["Ravi Teja", "Security", "Nights"],
  ["Vijay Kumar", "Security", "Nights"], ["Harish B", "Sound & Lights", "Evenings"],
  ["Sandeep Y", "Procession", "28th Aug"], ["Manoj K", "Procession", "28th Aug"],
];

const SPONSORS = [
  ["Sri Lakshmi Traders", "platinum", 25000, 0],
  ["Village Farmers Society", "gold", 15000, 1],
  ["Anjaneya Rice Mill", "gold", 12000, 2],
  ["Balaji Medical Store", "silver", 5000, 3],
  ["Sai Kirana Stores", "supporter", 2500, 4],
];

const CONTACTS = [
  ["President", "Ramesh Babu", "+91 98480 11111", false, 0],
  ["Secretary", "Suresh Reddy", "+91 98480 22222", false, 1],
  ["Treasurer", "Mahesh Kumar", "+91 98480 33333", false, 2],
  ["Emergency", "Committee Helpline", "+91 98480 99999", true, 3],
];

const EXPENSES = [
  ["Idol and mandapam decoration", "idol", 32000, "2026-08-12", "Sri Ganesh Arts"],
  ["Pandal and shamiana", "decoration", 18500, "2026-08-13", "Nandi Tent House"],
  ["Sound system and lighting", "sound", 14000, "2026-08-14", "Balaji Sounds"],
  ["Annadanam provisions", "prasadam", 21000, "2026-08-15", "Sai Kirana Stores"],
  ["Priest dakshina", "priest", 6000, "2026-08-15", null],
  ["Cultural program arrangements", "cultural", 8500, "2026-08-14", null],
];

const DONOR_NAMES = [
  "Ramesh Babu", "Suresh Reddy", "Mahesh Kumar", "Satish Yadav", "Kiran Kumar",
  "Praveen Reddy", "Lakshmi Devi", "Venkata Rao", "Srinivas M", "Anil Kumar",
  "Padma Sri", "Ravi Teja", "Naveen Rao", "Harish B", "Sandeep Y",
  "Manoj K", "Sarita Devi", "Gopal Krishna", "Bhaskar Rao", "Ananth Reddy",
  "Vijaya Lakshmi", "Chandra Sekhar", "Prasad Babu", "Sunitha Rani", "Murali Mohan",
  "Jagadeesh K", "Rajeswari", "Nagendra Rao", "Swathi Reddy", "Kishore Kumar",
  "Yadagiri", "Saraswathi", "Narsimha Rao", "Divya Sri", "Ramakrishna",
  "Uma Maheswari", "Balaraju", "Shivaji Rao", "Radhika Devi", "Prabhakar",
  "Sridevi", "Vamsi Krishna", "Jyothi Rani", "Hanumantha Rao", "Kavitha Devi",
  "Subba Rao", "Malleswari", "Rajendra Prasad",
];

/**
 * Builds a donation list totalling exactly ₹1,24,500 with no single gift above
 * ₹2,500 — the figures used throughout the design brief (83% of a ₹1,50,000 goal).
 */
function buildDonations() {
  const target = 124500;
  const cap = 2500;
  // Weighted towards larger gifts so the count lands near 50–60 transactions
  // rather than a few hundred token amounts.
  const tiers = [2500, 2100, 2500, 1500, 2500, 2100, 1100, 2500, 2100, 1501];
  const rows = [];
  let total = 0;
  let i = 0;

  while (total < target) {
    const remaining = target - total;
    let amount = tiers[i % tiers.length];
    if (amount > remaining) amount = remaining;
    if (amount > cap) amount = cap;
    if (amount <= 0) break;

    const name = DONOR_NAMES[i % DONOR_NAMES.length];
    const day = 10 + (i % 6);
    rows.push([name, amount, `2026-08-${String(day).padStart(2, "0")}`, i % 7 === 0 ? "cash" : "upi"]);
    total += amount;
    i += 1;
  }

  if (total !== target) throw new Error(`donation total ${total} != ${target}`);
  return rows;
}

/* -------------------------------------------------------------------------- */

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120_000,
});

await client.connect();

async function insertAll() {
  const ids = {};

  const collect = async (table, sql, values) => {
    const { rows } = await client.query(sql, values);
    ids[table] = (ids[table] ?? []).concat(rows.map((r) => r.id));
  };

  for (const e of EVENTS) {
    await collect("events",
      `insert into public.events
         (title, description, event_date, start_time, end_time, day_part, venue, category, is_cultural, is_featured, is_published)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) returning id`, e);
  }
  for (const p of POOJAS) {
    await collect("pooja_schedule",
      `insert into public.pooja_schedule
         (title, description, pooja_date, start_time, end_time, priest_name, display_order,
          max_couples, booking_enabled, special_instructions, is_published, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,'scheduled') returning id`, p);
  }
  for (const a of ANNOUNCEMENTS) {
    await collect("announcements",
      `insert into public.announcements (title, body, category, is_pinned, is_published)
       values ($1,$2,$3,$4,true) returning id`, a);
  }
  for (const m of MEMBERS) {
    await collect("committee_members",
      `insert into public.committee_members (name, position, phone, bio, display_order, is_active)
       values ($1,$2,$3,$4,$5,true) returning id`, m);
  }
  for (const v of VOLUNTEERS) {
    await collect("volunteers",
      `insert into public.volunteers (name, team, availability, is_active, is_public)
       values ($1,$2,$3,true,true) returning id`, v);
  }
  for (const s of SPONSORS) {
    await collect("sponsors",
      `insert into public.sponsors (name, tier, contribution_amount, display_order, is_active)
       values ($1,$2,$3,$4,true) returning id`, s);
  }
  for (const c of CONTACTS) {
    await collect("contact_information",
      `insert into public.contact_information (label, contact_name, phone, is_emergency, display_order, is_active)
       values ($1,$2,$3,$4,$5,true) returning id`, c);
  }
  for (const x of EXPENSES) {
    await collect("expenses",
      `insert into public.expenses (title, category, amount, expense_date, vendor, is_public)
       values ($1,$2,$3,$4,$5,true) returning id`, x);
  }
  for (const d of buildDonations()) {
    await collect("donations",
      `insert into public.donations
         (donor_name, amount, donation_date, payment_method, status, is_public, source)
       values ($1,$2,$3,$4,'verified',true,'admin') returning id`, d);
  }

  // Give the festival settings realistic values for the visual review.
  const { rows: prev } = await client.query(
    `select donation_goal, venue_name, venue_address, latitude, longitude,
            upi_id, upi_payee_name, start_date, end_date, about,
            nimajjanam_date, nimajjanam_time, nimajjanam_route
       from public.festival_settings`,
  );
  ids.__settings_before = prev[0] ?? null;

  await client.query(
    `update public.festival_settings set
       donation_goal = 150000,
       venue_name = 'Sri Vinayaka Mandapam',
       venue_address = 'Mana Ooru, Andhra Pradesh, India',
       latitude = 16.506200, longitude = 80.648000,
       upi_id = 'srivinayakacommittee@upi',
       upi_payee_name = 'Sri Vinayaka Grama Committee',
       start_date = '2026-08-24', end_date = '2026-08-28',
       about = 'Our village has celebrated Vinayaka Chavithi together for over forty years. The committee organises the daily poojas, annadanam, cultural programs and the nimajjanam procession, funded entirely by donations from families of the village.',
       nimajjanam_date = '2026-08-28',
       nimajjanam_time = '10:00',
       nimajjanam_route = 'Mandapam -> Main Bazaar Road -> Temple Street -> Village tank'`,
  );

  return ids;
}

async function deleteAll(ids) {
  // Bookings reference poojas, so they must go first.
  const poojaIds = ids.pooja_schedule ?? [];
  if (poojaIds.length > 0) {
    const { rowCount } = await client.query(
      `delete from public.pooja_bookings where pooja_id = any($1::uuid[])`, [poojaIds],
    );
    if (rowCount > 0) console.log(`  pooja_bookings: removed ${rowCount}`);
  }

  const order = [
    "donations", "expenses", "contact_information", "sponsors",
    "volunteers", "committee_members", "announcements", "pooja_schedule", "events",
  ];
  let removed = 0;
  for (const table of order) {
    const list = ids[table] ?? [];
    if (list.length === 0) continue;
    const { rowCount } = await client.query(
      `delete from public.${table} where id = any($1::uuid[])`, [list],
    );
    console.log(`  ${table}: removed ${rowCount}`);
    removed += rowCount;
  }

  const before = ids.__settings_before;
  if (before) {
    await client.query(
      `update public.festival_settings set
         donation_goal = $1, venue_name = $2, venue_address = $3,
         latitude = $4, longitude = $5, upi_id = $6, upi_payee_name = $7,
         start_date = $8, end_date = $9, about = $10,
         nimajjanam_date = $11, nimajjanam_time = $12, nimajjanam_route = $13`,
      [before.donation_goal, before.venue_name, before.venue_address,
       before.latitude, before.longitude, before.upi_id, before.upi_payee_name,
       before.start_date, before.end_date, before.about,
       before.nimajjanam_date, before.nimajjanam_time, before.nimajjanam_route],
    );
    console.log("  festival_settings: restored to previous values");
  }
  return removed;
}

try {
  if (mode === "delete") {
    const ids = JSON.parse(await readFile(idsFile, "utf8"));
    console.log("Deleting sample content...");
    const removed = await deleteAll(ids);
    await unlink(idsFile);
    console.log(`Removed ${removed} rows. ${idsFile} deleted.`);
  } else if (mode === "insert") {
    const ids = await insertAll();
    await writeFile(idsFile, JSON.stringify(ids, null, 2));
    const counts = Object.entries(ids)
      .filter(([k]) => !k.startsWith("__"))
      .map(([k, v]) => `${k}:${v.length}`);
    console.log(`Inserted ${counts.join(" ")}`);
    const { rows } = await client.query("select public.public_stats() as s");
    console.log("public_stats():", JSON.stringify(rows[0].s));
    console.log(`Ids recorded in ${idsFile} — run --delete to remove them.`);
  } else {
    console.log("Dry run: inserting inside a transaction, then rolling back...");
    await client.query("begin");
    const ids = await insertAll();
    const counts = Object.entries(ids)
      .filter(([k]) => !k.startsWith("__"))
      .map(([k, v]) => `${k}:${v.length}`);
    console.log(`Would insert ${counts.join(" ")}`);
    const { rows } = await client.query("select public.public_stats() as s");
    console.log("public_stats() would be:", JSON.stringify(rows[0].s));
    await client.query("rollback");
    const { rows: check } = await client.query(
      "select count(*)::int as n from public.donations",
    );
    console.log(`Rolled back. donations table now has ${check[0].n} rows.`);
  }
} catch (error) {
  console.error("\nFAILED:", error.message);
  if (error.detail) console.error("detail:", error.detail);
  process.exitCode = 1;
} finally {
  await client.end();
}
