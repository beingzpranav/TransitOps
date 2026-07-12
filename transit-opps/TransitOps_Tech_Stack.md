# Tech Stack Document
## TransitOps — Smart Transport Operations Platform

**Version:** 1.0
**Date:** July 12, 2026
**Related documents:** TransitOps_PRD.md, TransitOps_FRD.md

---

## 1. Stack Overview

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **React (Vite)** or **Next.js** | Fast scaffold; Next.js optional if you want frontend + API routes in one repo/server, saving setup time in an 8-hour window |
| Styling | **Tailwind CSS** | Utility-first, no custom CSS needed for a functional UI fast |
| UI components | **shadcn/ui** or **Mantine** | Pre-built tables, forms, modals, dropdowns — avoids building form/table components from scratch |
| Charts | **Recharts** | Simple React charting for fuel efficiency, utilization, cost, ROI (FR-8.2) |
| Data fetching/cache | **TanStack Query (React Query)** | Handles loading/error/cache state for dashboard and list views |
| Backend runtime | **Node.js + Express** (or Next.js API routes) | Familiar, minimal boilerplate, easy to wire validation middleware |
| Database | **PostgreSQL** | Relational integrity for unique constraints, foreign keys, and status enums — matches the strict business rules in the FRD |
| ORM | **Prisma** | Schema-first migrations + type-safe queries; fastest way to get a working DB layer in a hackathon |
| Auth | **JWT** (access token) + **bcrypt** for password hashing | Simple stateless auth, easy RBAC middleware (checks `role` claim on each request) |
| File storage (bonus: FR-12.1, FR-12.3) | **Local disk / S3-compatible bucket** (e.g. Supabase Storage, Cloudinary) | For vehicle documents and generated PDFs, only needed if bonus features are built |
| Email (bonus: FR-12.2) | **Resend** or **Nodemailer + SMTP** | For license-expiry reminders |
| CSV export | **`json2csv`** (Node) or client-side `papaparse` | Straightforward tabular export from report queries |
| PDF export (bonus) | **`pdf-lib`** or **Puppeteer** (HTML → PDF) | Puppeteer is easiest if you already have a report view to render |

---

## 2. Why This Stack (Reasoning)

- **Relational over NoSQL:** Nearly every business rule (FRD Sections 3–7) depends on foreign-key relationships and atomic status updates across Vehicle, Driver, and Trip. Postgres + Prisma enforces uniqueness and referential integrity natively; MongoDB would require re-implementing those checks manually.
- **Prisma over raw SQL/other ORMs:** One schema file generates migrations, a type-safe client, and (optionally) a DB browser (`prisma studio`) — cuts setup time significantly versus hand-writing SQL under an 8-hour clock.
- **JWT over session-based auth:** No session store needed; role is embedded in the token and checked in middleware, which keeps RBAC (FR-1.2) simple to implement quickly.
- **Server-side rule enforcement:** All status-transition logic (dispatch, complete, cancel, maintenance open/close) must run inside Prisma `$transaction` blocks — this is an architecture decision, not just a library choice, and is what prevents the double-booking risk called out in the PRD.

---

## 3. High-Level Architecture

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│   React/Next.js      │  ───────────────────────▶ │   Express / Next API  │
│   (Tailwind + shadcn) │                           │   Routes               │
│   - Dashboard         │  ◀─────────────────────── │   - Auth middleware    │
│   - Vehicle/Driver UI │                           │   - RBAC middleware    │
│   - Trip management   │                           │   - Business rule      │
│   - Reports/Charts    │                           │     validation         │
└─────────────────────┘                           └──────────┬────────────┘
                                                                │ Prisma Client
                                                                ▼
                                                     ┌──────────────────────┐
                                                     │   PostgreSQL           │
                                                     │   - Users/Roles        │
                                                     │   - Vehicles           │
                                                     │   - Drivers            │
                                                     │   - Trips              │
                                                     │   - Maintenance Logs   │
                                                     │   - Fuel Logs/Expenses │
                                                     └──────────────────────┘
```

---

## 4. Suggested Repo Structure

```
transitops/
├── client/                 # React/Next frontend
│   ├── src/
│   │   ├── pages/           # Dashboard, Vehicles, Drivers, Trips, Maintenance, Reports
│   │   ├── components/      # Shared UI (tables, forms, modals, charts)
│   │   ├── hooks/           # React Query hooks per entity
│   │   └── lib/             # API client, auth context
├── server/                  # Express backend (skip if using Next.js API routes)
│   ├── src/
│   │   ├── routes/           # /auth, /vehicles, /drivers, /trips, /maintenance, /fuel, /expenses, /reports
│   │   ├── middleware/        # auth.ts, rbac.ts
│   │   ├── services/          # trip.service.ts (dispatch/complete/cancel transactions), etc.
│   │   └── prisma/            # schema.prisma, migrations, seed.ts
└── README.md
```

---

## 5. Deployment (if a live demo is needed)

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend API | Railway or Render |
| Database | Railway/Render Postgres, or Supabase |

Both Railway and Render offer free tiers that deploy directly from a GitHub push — appropriate for a same-day hackathon demo.

---

## 6. Alternatives Considered

| Instead of | Could use | Trade-off |
|---|---|---|
| PostgreSQL + Prisma | MongoDB + Mongoose | Faster to start with no schema, but you'd hand-roll uniqueness/status-transition integrity that Postgres gives for free — not worth it given how rule-heavy this spec is |
| Express | Fastify | Marginal performance gain, not worth the smaller ecosystem for a time-boxed build |
| Recharts | Chart.js / D3 | Recharts is more idiomatic in React and faster to wire up; D3 offers more control but costs more setup time |
| JWT | Session + Redis | More secure for production but adds infra (Redis) with no real benefit for an 8-hour hackathon scope |
