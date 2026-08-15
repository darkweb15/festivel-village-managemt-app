# Sri Vinayaka Grama Committee

A mobile-first progressive web app for the village Ganesh Chaturthi / Vinayaka
Chavithi committee: festival information, pooja timings and couple bookings,
events, announcements, transparent donation and expense accounts, gallery,
committee and volunteer lists, sponsors, live darshan and directions — plus an
admin panel the committee runs it all from.

It also ships an AI assistant: villagers can ask about timings, availability or
the fund in plain language and book a pooja through the conversation, and the
committee gets a separate admin copilot over the same data. Both answer only
from tool calls against Postgres, never from the model's own recollection.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**,
**Supabase** (Postgres + Auth + Storage + Row Level Security), **Groq** for the
assistant and **Lucide** icons.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill in the two Supabase values
npm run dev                    # http://localhost:3000
```

The app boots without Supabase and shows a "Database not connected" banner with
a link to an in-app setup guide at `/setup`, so nothing white-screens while you
are still wiring it up.

### 1. Create the Supabase project

Create a free project at [supabase.com](https://supabase.com), then open
**Project Settings → API** and copy into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> The `service_role` key is **never** needed by this app. Every write happens as
> a signed-in committee member and is authorised by Row Level Security.

The assistant needs a [Groq key](https://console.groq.com/keys) as well. Leave it
blank and the app still runs — every AI surface just reports that it is not
configured yet:

```
GROQ_API_KEYS=<one key, or several comma-separated for failover>
GROQ_MODEL=llama-3.3-70b-versatile
AI_RATE_LIMIT_PER_MIN=12
```

`GROQ_API_KEYS` is server-only and never reaches the browser. Extra keys buy
failover if one is revoked, not extra throughput — Groq meters per organisation,
so keys from one account share a budget. Check them with `npm run ai:keys`.

### 2. Run the migrations

Either paste the files into the Supabase **SQL editor** in order, or apply them
over a direct connection (Project Settings → Database → Connection string):

```powershell
$env:DATABASE_URL = "postgresql://postgres.<ref>:<password>@<host>:5432/postgres"
npm run db:push -- --seed     # apply migrations + the settings row
npm run db:verify             # confirm RLS, policies, grants and functions
```

1. `supabase/migrations/20260101000000_init.sql` — tables, enums, triggers,
   aggregate functions
2. `supabase/migrations/20260101000100_rls.sql` — Row Level Security policies,
   column grants and storage buckets
3. `supabase/migrations/20260201000000_enums.sql` — booking and AI enums
4. `supabase/migrations/20260201000100_bookings.sql` — the pooja booking tables
   and `book_pooja_slot()`, plus the AI action audit log
5. `supabase/migrations/20260201000200_bookings_rls.sql` — policies for both
6. `supabase/seed.sql` *(optional)* — creates the single `festival_settings`
   row. It seeds **no** demo events, donations, members or photos; all real
   content is entered through the admin panel.

`db:verify` checks RLS is on for every table, that the security-definer
functions exist, and — by switching to the `anon` role inside a transaction —
that an anonymous visitor really can submit a *pending* donation but cannot
forge a verified one, create events or edit settings.

`DATABASE_URL` is only ever read from the shell environment. Don't put it in
`.env.local`; the app never needs it.

### 3. Create the first admin

1. Supabase → **Authentication → Users → Add user** (email + password). There is
   deliberately no public sign-up.
2. Supabase → **SQL editor**:

   ```sql
   update public.users set role = 'admin' where email = 'you@example.com';
   ```

   A trigger creates the `public.users` row automatically with the powerless
   `viewer` role; promotion is always a manual SQL action.

3. Sign in at `/admin`.

### 4. Fill in the festival

Everything the public app shows comes from the database. Start at
**/admin/settings** (festival name, dates, donation goal, UPI ID, venue,
nimajjanam, live-stream link), then add events, pooja timings, announcements,
committee members and gallery items from the sidebar.

---

## Roles

| Role | Can do |
| --- | --- |
| `admin` | Everything, including managing other users |
| `editor` | Create/edit/delete all committee content and finance records |
| `viewer` | Nothing beyond what an anonymous visitor sees (default for new accounts) |

Authorisation is enforced in three places: `src/proxy.ts` redirects anonymous
visitors away from `/admin`, `src/app/admin/(protected)/layout.tsx` re-checks the
role server-side on every render, and — the boundary that actually matters —
Postgres RLS policies gate every read and write.

---

## About donations

**This application does not process or verify payments.** It shows a UPI QR code
and UPI ID; the donor pays from their own UPI app, entirely between them and
their bank.

A visitor may optionally *record* a donation they have already sent. That row is
stored with `status = 'pending'` and is invisible to the public. A committee
member matches it against the bank/UPI statement and marks it **verified** in
`/admin/donations`. Only verified donations count towards the public totals, the
progress meter, the donor count or the published list — and the UI says so on
every screen where a figure appears.

If you later integrate a payment gateway with real verification, that assumption
lives in `public.donations.status` and `src/app/(app)/donate/actions.ts`.

---

## Pooja bookings

A pooja row carries `max_couples`, and couples reserve a place from `/book` or
through the assistant. Every booking — whichever route it arrives by — goes
through the `public.book_pooja_slot()` security-definer function, which takes a
`for update` row lock on the pooja before counting what is already reserved. Two
people tapping *Confirm* at the same instant therefore queue behind one another
rather than both reading a stale count, so capacity cannot be oversold. The
function returns a JSON envelope (`ok`, `code`, `message`) instead of raising,
so the UI and the agent can both act on the same refusal codes.

`npm run test:booking` fires concurrent bookings at one pooja and asserts the
count never exceeds capacity. `pooja_bookings.source` records whether a row came
from `public_form` or `ai_agent`.

---

## The AI assistant

Two surfaces share one agent loop in `src/lib/ai/orchestrator.ts`:

| Surface | Who | Tools |
| --- | --- | --- |
| `assistant` | any visitor, at `/assistant` | read the published festival, check slots, book/look up/cancel their own booking |
| `copilot` | signed-in admin or editor, at `/admin/copilot` | the above plus booking status changes, creating poojas and events, drafting announcements, assigning volunteers |

The surface is decided server-side in `src/app/api/ai/chat/route.ts`: a public
caller asking for `copilot` is refused with a 403, never quietly upgraded, and
the tool list is chosen from the resolved actor rather than from anything the
client sends. Both surfaces answer strictly from tool results, so the model has
no way to invent a pooja time or a donation figure.

Every tool call is written to `public.ai_action_logs` — visible at
`/admin/ai-activity` — with personal details redacted, so the committee can
audit what the agent did without the log becoming a second copy of everyone's
phone number. Callers are rate limited to `AI_RATE_LIMIT_PER_MIN` messages a
minute (12 by default); it is abuse protection, not a throughput dial.

`npm run test:agent` checks the authorisation and validation contract, and — when
the server holds a Groq key and `DATABASE_URL` is exported — that the agent
really calls tools, books against a temporary pooja, respects capacity, refuses
what it has no tool for, and redacts its audit log.

---

## Project layout

```
src/
  app/
    (app)/            public screens — the mobile app shell + bottom navigation
    admin/
      login/          sign-in (outside the auth gate)
      (protected)/    dashboard, bookings, copilot, AI activity, [resource] CRUD
      actions.ts      server actions for every admin write
    api/ai/chat/      the agent endpoint — surface authorisation, rate limiting
    manifest.ts       PWA manifest
  components/
    brand/            Ganesha mark + vector devotional artwork
    layout/           AppHeader, PageHeader, TabHeader, bottom + side navigation
    ui/               button, card, list rows, progress, filter chips, states
    admin/            sidebar, resource manager, schema-driven form, charts
    booking/          the booking flow, lookup and availability badge
    ai/               the chat surface shared by assistant and copilot
  lib/
    admin/resources.ts  declarative schema for every editable table
    data/queries.ts     all public reads, each returning a typed result envelope
    ai/                 agent loop, prompt, Groq client, key pool
    ai/tools/           the public and admin tool sets, one file each
    supabase/           browser/server clients, env guard, database types
supabase/
  migrations/         schema + RLS
  seed.sql            the single settings row
scripts/
  generate-icons.mjs  renders the PWA icon set from the app's own logo mark
```

Admin CRUD is schema-driven: `src/lib/admin/resources.ts` declares the fields for
each table, and both the form UI and the server-side validation read from that
one definition, so the browser can only ever write declared columns of
allow-listed tables.

---

## Design system

Tokens live in `src/app/globals.css` under `@theme`, so they are available as
Tailwind utilities (`bg-saffron-600`, `text-ink-500`, `rounded-card`, …).

- **Primary** saffron `#ea5308`, **secondary** soft gold, warm charcoal text
- White / warm-white surfaces, hairline borders, very soft shadows — light only
- Radii: `rounded-card` (20px), `rounded-tile` (16px), pill buttons
- Type: **Inter**, with **Noto Sans Telugu** applied automatically to any element
  marked `lang="te"`
- Motion is subtle and respects `prefers-reduced-motion`

Mobile is the primary target (390 × 844). From `md` up, the bottom navigation is
promoted to a left rail and the column widens into a dashboard layout using the
same components and tokens.

---

## PWA

`src/app/manifest.ts` plus `public/sw.js` make the app installable and usable
offline for already-visited pages. The service worker registers in production
only, never caches `/admin`, and falls back to `/offline`.

Regenerate icons after changing the logo mark:

```bash
npm run icons
```

---

## Scripts

```bash
npm run dev           # dev server
npm run build         # production build (also typechecks)
npm run start         # serve the production build
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run icons         # regenerate PWA icons from the Ganesha mark
npm run db:push       # apply migrations (needs DATABASE_URL in the shell)
npm run db:verify     # prove RLS, policies, grants and functions hold
npm run ai:keys       # check each Groq key, and whether they share a budget
npm run test:booking  # concurrent bookings cannot oversell a pooja
npm run test:agent    # agent authorisation, tool use and audit redaction
```

The three `test:`/`db:` scripts run against a live server or database rather
than a fixture, so they need `DATABASE_URL` exported in the shell, and
`test:agent` additionally needs `npm run dev` running in another terminal.

---

## Images

Committee photos and gallery media are uploaded to Supabase Storage from the
admin panel (`gallery` and `members` buckets are public; `receipts` is private).
`next.config.ts` only allows remote images from your own Supabase host.

Until a real hero photograph is uploaded in Festival Settings, the Home screen
shows vector devotional artwork drawn in-app and labelled **Placeholder art** —
no stock photography is bundled.

If uploaded photos come back broken in development with

```
upstream image … hostname resolved to private IP ["64:ff9b::…"]
```

you are on an IPv6-only network — a phone hotspot, typically. DNS64 rewrites the
Supabase host into the NAT64 range `64:ff9b::/96`, and the Next.js 16 image
optimiser treats anything in it as private and refuses to fetch. `next.config.ts`
sets `images.dangerouslyAllowLocalIP` in development for exactly this reason.
Production keeps the SSRF guard, so a local `npm run start` on such a network
will still show broken images; use ordinary WiFi to check a production build.
