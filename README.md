# Big Data IQ Minds — learning platform

The website and learning platform for **BDIM Ltd (Big Data IQ Mind Ltd)**, public brand **Big Data IQ Minds** —
*We Turn Data Into Decisions. · Data • Insights • Impact.*

It includes a course catalogue, learning paths, a free practice zone, a question bank, a browser-based coding lab (Python, SQL, R and Excel formulas), a learning management system, bookings for live sessions, consulting inquiries, and a protected admin area.

> **Status:** The application works end to end in **demo mode** (no external services) and in **Supabase mode**. Supabase mode has been tested against a live project: sign-in, enrollment, lesson access rules, server-graded quizzes, certificate issuing and verification, discussions, bookings with database-level conflict prevention, inquiries, and the admin and learner-management pages. See [Implemented vs. awaiting configuration](#implemented-vs-awaiting-configuration).

---

## Quick start (local development)

Requirements: **Node.js 20.9 or newer** (developed on Node 24 LTS).

```bash
npm install
cp .env.example .env.local      # then edit .env.local
npm run dev                      # http://localhost:3000
```

With no Supabase values in `.env.local`, the site runs in **demo mode**:

- Content (courses, questions, paths…) is read from `src/content/`. Admin edits, bookings and inquiries are written to `.data/bdim-db.json`, which is git-ignored.
- Learner progress (enrollments, lessons, notes, quizzes, certificates) is saved **in each visitor's browser**. A banner says so.
- Certificates are watermarked **"Demonstration only"**.
- The admin area uses a local password (see below).

### Local admin access

Set both values in `.env.local`, then sign in at `/admin/login`:

```
LOCAL_ADMIN_PASSWORD=<8+ characters>
ADMIN_SESSION_SECRET=<32+ random characters, e.g. from: openssl rand -hex 32>
```

The local admin only works when Supabase is **not** configured. It sets a signed, `httpOnly` cookie that lasts 8 hours. In production, use Supabase staff accounts instead.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next.js + React Compiler rules) |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm test` | Unit tests: formula engine, booking slots and conflicts, data integrity, validation, answer-key protection |
| `npm run check` | Lint + typecheck + tests |
| `npm run seed:supabase` | Load the starter content into a Supabase project |
| `npx tsx scripts/grant-role.ts <email> admin` | Give an existing account the admin (or `instructor`) role |

---

## Production setup with Supabase

1. **Create a Supabase project** at supabase.com.
2. **Apply the schema.** Run every file in `supabase/migrations/`, in filename order, in the SQL editor, or use `supabase db push` with the Supabase CLI. It creates the tables, row-level security policies, the database functions (quiz grading, certificate issuing, availability, certificate verification) and a private `course-materials` storage bucket.
3. **Set the environment variables** (in `.env.local`, or in your host's settings):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...      # server-only, never expose it
   NEXT_PUBLIC_SITE_URL=https://your-domain
   ```
4. **Seed the content:** `npm run seed:supabase`. This is safe to re-run, because it upserts by id.
5. **Configure Auth** (Supabase → Authentication → URL configuration):
   - Site URL: your domain.
   - Redirect URLs: `https://your-domain/auth/callback`, plus `http://localhost:3000/auth/callback` for development.
   - Configure a custom SMTP sender so confirmation and reset emails come from BDIM.
6. **Create the first administrator.** Sign up on the site, then either run `npx tsx scripts/grant-role.ts admin@your-domain admin` (uses the secret key from `.env.local`) or run this in the Supabase SQL editor as the database owner:
   ```sql
   insert into public.staff_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'admin@your-domain';
   ```
   For instructors, use `'instructor'`. They can edit courses, questions and paths, approve enrollments and review assignments, but cannot manage bookings, inquiries, instructor profiles or testimonials. **Public sign-up never grants staff access.**
7. **Review in `/admin`:** the instructor profile, the booking schedule (it starts as an unreviewed default), and all sample content.

---

## Deployment

**Recommended:** deploy on **Vercel** (or any Node host) with **Supabase**.

1. Push the `bdim-platform` folder to a Git repository and import it in Vercel.
2. Add the environment variables from `.env.example`. Leave `LOCAL_ADMIN_*` empty.
3. Deploy. The build runs `next build`; 139 pages are prerendered and dynamic sections stream at request time.

**Self-hosting on one server** (`npm run build && npm start`) also works in demo mode, because the server can write `.data/`. Serverless hosts such as Vercel have a read-only file system, so demo-mode writes (bookings, inquiries, admin edits) fail there **with a clear error message**. Use Supabase on serverless hosts.

---

## Replacing demo content with verified BDIM information

| What | Where |
|---|---|
| **Logo** | ✅ Done. The official logo is in `public/brand/` (`bdim-logo.png` full, `bdim-mark*.png` icon only, `bdim-icon-512.png` app icon). Colour tokens in `src/app/globals.css` are matched to it. To replace it, overwrite those files, keeping the names. |
| **Instructor profile and photo** | ✅ Done (verified profile, photo in `public/brand/`). Edit in `/admin/instructors`. |
| **Contact details** | ✅ Email, WhatsApp and LinkedIn are set in `src/lib/site.ts` (`NEXT_PUBLIC_CONTACT_*` variables override them). |
| **Courses, lessons, quizzes, assignments** | `/admin/courses`. 30 courses ship with 170 outlined lessons; 17 lessons have full sample content (13 are free previews), and the others show an honest "materials in preparation" notice. |
| **Practice questions** | `/admin/questions`. All 38 are original and labelled *Sample content*. |
| **Learning paths** | `/admin/paths`. The seven homepage career goals are in `src/content/paths.ts`. |
| **Booking schedule and services** | `/admin/bookings`. Set real hours, services and pricing notes. |
| **Testimonials** | `/admin/testimonials`. None exist. The homepage section stays hidden until a **verified** testimonial is published (the database enforces this). |
| **Portfolio projects** | `src/content/projects.ts`. All are labelled *Example* and use synthetic data. |
| **Consulting services and FAQ** | `src/content/services.ts`, `src/content/faqs.ts` |
| **Privacy policy and terms** | `src/app/(site)/privacy` and `terms`. These are **templates** with `[placeholders]`; have them reviewed (Rwanda: Law No. 058/2021 on personal data protection) before launch. |
| **Prices** | Every course shows *Request a quote*. To publish a price, switch a course to "Fixed price" in the course editor. |

---

## Integrations requiring credentials

| Integration | Variables | Without it |
|---|---|---|
| Supabase: database, auth, storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Demo mode: local data file and browser-held progress |
| Email notifications | **Gmail/SMTP:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (App Password), or **Resend:** `RESEND_API_KEY`; plus optional `EMAIL_FROM`, `BDIM_NOTIFICATION_EMAIL` | No emails are sent. Confirmation screens say so and show the reference number. |
| Payments | *Not implemented.* `NEXT_PUBLIC_PAYMENTS_ENABLED` is reserved | Pricing is quote-based, as requested |
| Coding Lab runtimes | None. Loaded from public CDNs (Pyodide 314, sql.js 1.15, webR 0.6) | The lab needs internet access on first use |

---

## Implemented vs. awaiting configuration

| Feature | Demo mode | With Supabase |
|---|---|---|
| Public site, navigation, SEO (metadata, Open Graph image, sitemap, robots, JSON-LD) | ✅ verified | ✅ |
| Course catalogue with search and filters, course pages, quote requests | ✅ verified | ✅ |
| Interactive hero analysis demo, career-path roadmap selector | ✅ verified | ✅ |
| Learning paths with progress | ✅ verified | ✅ |
| Question bank: search, filters, save, complete, attempts, hints, solutions | ✅ verified (browser storage) | ✅ stored per account (RLS) |
| Excel formula practice (real evaluation) | ✅ verified | ✅ |
| Coding Lab: Python, SQL and R execute in the browser, with output checks | ✅ verified | ✅ |
| Question discussions | Hidden ("open once accounts are enabled") | ✅ verified live |
| Accounts: sign-up, sign-in, password reset | Explains demo mode | ✅ verified live |
| Enrollment (self-enroll or approval), lessons, notes, bookmarks | ✅ verified (browser storage) | ✅ verified live (RLS) |
| Quizzes graded on the server (answer keys never sent to the browser) | ✅ verified (Server Action) | ✅ `submit_quiz()` database function |
| Certificates issued only when requirements are met | ✅ verified, watermarked "Demonstration" | ✅ `issue_certificate()` checks progress in the database; public verification page |
| Profile pictures (cropped in the browser, stored in a public `avatars` bucket; users can only write their own folder) | Kept in this browser | ✅ verified live |
| Light / dark mode toggle (remembers the choice, follows the device by default) | ✅ | ✅ |
| Assignments, portfolio, profile, streaks, learner dashboard | ✅ verified | ✅ implemented |
| Downloadable materials | Public links only | ✅ private bucket with signed URLs |
| Bookings: availability, conflict prevention, reschedule and cancel by private link | ✅ verified (file store) | ✅ database exclusion constraint |
| Inquiries (contact, course, consulting, training) with consent and honeypot | ✅ verified | ✅ |
| Admin: courses, lessons, quizzes, questions, paths, instructors, testimonials, bookings, schedule, inquiries | ✅ verified | ✅ RLS staff policies |
| Admin: approve enrollments, review assignments, engagement stats | Notice (needs accounts) | ✅ implemented |
| Email notifications (branded HTML + text) | Off until configured | Gmail SMTP or Resend |
| Online payments | Not built (quote-based pricing) | — |

**Verified** means exercised in a browser during development: page loads on every route, form validation and submission, booking with conflict checks plus reschedule and cancel, quiz grading, certificate gating, admin sign-in and edits reaching public pages, real Python/SQL/R execution, and layout at 375px phone width.

---

## Architecture

- **Next.js 16** (App Router, Cache Components, Partial Prefetching), **React 19**, **TypeScript**, **Tailwind CSS 4**
- **Supabase** (`@supabase/ssr`) for Postgres, auth and storage; **Zod** for validation; **React Hook Form** for complex forms; **Recharts** for charts; **CodeMirror 6** for the editor
- **Data layer** (`src/lib/data/`): one `Store` interface with two implementations, `local-store.ts` (JSON file) and `supabase-store.ts`. Public reads are cached with `"use cache"` and tags, and admin saves invalidate them with `updateTag()`.
- **Learner state** (`src/lib/learner/provider.tsx`): one client API that stores data in the browser (demo) or in Supabase (members).
- **Code execution** (`src/lib/runners/`, `public/workers/`): WebAssembly runtimes in Web Workers inside the learner's browser, with load and run time limits enforced by terminating the worker. **No user code ever runs on the server.** To add a server-side sandbox later, implement the `CodeRunner` interface.

```
src/
  app/(site)/        public pages (home, courses, learn, practice, questions, coding-lab, …)
  app/admin/         admin login + protected admin pages
  app/actions/       Server Actions (forms, learning, admin) — each validates and authorises
  components/        ui/, layout/, home/, courses/, practice/, lab/, learner/, booking/, forms/, admin/
  content/           seed content (courses, lessons, questions, paths, exercises, datasets, services)
  lib/               data layer, auth, Supabase clients, validation, booking slots, formula engine, runners
supabase/migrations/ database schema, RLS policies and functions
scripts/             seed script
tests/               unit tests
```

## Security notes

- Every admin **page** and every admin **Server Action** checks authorisation on the server. With Supabase, row-level security enforces it again in the database. A hidden button is never the only protection.
- The service-role key is only used server-side (`server-only` module), for public bookings and inquiries after validation.
- Quiz answer keys and locked lesson bodies are never sent to the browser. In demo mode, locked-lesson gating happens in the browser because there are no accounts.
- Forms use Zod validation, a honeypot field and in-memory rate limiting. For stronger protection in production, add a shared rate-limit store or a WAF.
- Security headers are set in `next.config.ts`. A Content Security Policy is **not yet configured**: the Coding Lab loads runtimes from CDNs and webR uses dynamic `import()`. Add a CSP that allows `cdn.jsdelivr.net`, `webr.r-wasm.org` and `'wasm-unsafe-eval'` when hardening.

## Suggested next steps

1. Connect a Supabase project and run through sign-up, enrollment, quizzes and certificates on a staging URL.
2. Add the official logo, instructor photo and verified biography, and the real contact details.
3. Review the booking schedule, the legal templates and the sample content.
4. Configure Resend for email notifications.
5. Commission a manual accessibility audit (keyboard and screen reader) before public launch.
