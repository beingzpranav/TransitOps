---
trigger: always_on
---

# AGENTS.md — TransitOps

Rules for any AI coding agent (Claude Code, Cursor, Copilot, etc.) working in this repo. Read this before generating or editing code. Related docs: `TransitOps_PRD.md`, `TransitOps_FRD.md`, `TransitOps_Tech_Stack.md`.

---

## 1. Project Summary

TransitOps is a fleet operations platform: vehicle registry, driver management, trip dispatch, maintenance, fuel/expense tracking, dashboard + reports. Four roles: Fleet Manager, Driver, Safety Officer, Financial Analyst.

## 2. Tech Stack (do not substitute without asking)

- **Framework:** Next.js (App Router) — frontend + API routes in one project
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Data fetching:** TanStack Query
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT (access token) + bcrypt for password hashing
- **CSV export:** `json2csv` or `papaparse`

## 3. Non-Negotiable Business Rules

These map directly to FRD Sections 5–6. Any agent writing trip/maintenance logic must enforce them **server-side**, never only in the UI:

1. Vehicle `registrationNumber` is unique — reject duplicates at the DB and API layer.
2. Retired or In Shop vehicles must never appear in dispatch selection queries.
3. A driver with an expired license or `Suspended` status cannot be assigned to a trip.
4. A vehicle or driver already `On Trip` cannot be assigned to another trip.
5. `cargoWeight` must not exceed the vehicle's `maxLoadCapacity`.
6. Dispatching a trip sets both vehicle and driver status to `On Trip` — **in the same DB transaction** as the trip status change, to prevent race conditions.
7. Completing a trip sets both back to `Available` and writes odometer + fuel data.
8. Cancelling a dispatched trip restores vehicle and driver to `Available`.
9. Creating an active maintenance record sets vehicle status to `In Shop`.
10. Closing maintenance restores vehicle to `Available` unless it is `Retired`.

**Rule of thumb:** if a change touches Trip, Vehicle, or Driver status together, it belongs in a `prisma.$transaction([...])` block inside a service function — never as separate sequential queries from a route handler.

## 4. Data Model

Entities: `User`, `Vehicle`, `Driver`, `Trip`, `MaintenanceLog`, `FuelLog`, `Expense`. Status enums:
- Vehicle: `Available | OnTrip | InShop | Retired`
- Driver: `Available | OnTrip | OffDuty | Suspended`
- Trip: `Draft | Dispatched | Completed | Cancelled`

Do not add fields or entities not covered in the FRD without flagging it — one known open item: the ROI metric needs a `revenue` field (recommend adding to `Trip`, summed per vehicle — see FRD FR-8.4).

## 5. RBAC

Every API route must check the caller's role via JWT before executing. Default posture: **deny unless explicitly allowed**. Permission matrix lives in PRD Section 6 — don't invent new permissions without checking it first.

## 6. Folder Structure

```
transitops/
├── app/
│   ├── (auth)/              # login
│   ├── (dashboard)/         # protected routes
│   │   ├── vehicles/
│   │   ├── drivers/
│   │   ├── trips/
│   │   ├── maintenance/
│   │   ├── fuel-expenses/
│   │   └── reports/
│   └── api/
│       ├── auth/
│       ├── vehicles/
│       ├── drivers/
│       ├── trips/
│       ├── maintenance/
│       ├── fuel/
│       ├── expenses/
│       └── reports/
├── lib/
│   ├── prisma.ts            # single PrismaClient instance
│   ├── auth.ts              # JWT sign/verify helpers
│   └── rbac.ts              # role-check middleware/helper
├── services/                 # business logic, transactions live here
│   ├── trip.service.ts
│   ├── maintenance.service.ts
│   └── report.service.ts
├── components/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── AGENTS.md
```

**Rule:** route handlers stay thin — they parse the request, call a service function, return the response. Business logic and transactions live in `services/`, not in `app/api/**/route.ts`.

## 7. Coding Conventions

- TypeScript everywhere, strict mode on.
- One `PrismaClient` instance shared via `lib/prisma.ts` — never instantiate a new client per request.
- Validate request bodies with `zod` before touching the database.
- Never trust client-sent `status` fields for Vehicle/Driver/Trip — status is always derived server-side per Section 3.
- Return errors as `{ error: string }` with an appropriate HTTP status — don't leak stack traces to the client.
- Prefer server components for read-only pages; use client components only where interactivity (forms, filters, charts) requires it.

## 8. Build Order (match this priority — don't jump ahead)

1. Prisma schema + migrations + seed data
2. Auth + RBAC middleware
3. Vehicle & Driver CRUD
4. Trip creation/dispatch/complete/cancel (the core rule-enforcement work)
5. Maintenance workflow
6. Fuel & expense logging + cost rollup
7. Dashboard KPIs
8. Reports + charts + CSV export
9. Bonus features (PDF export, email reminders, document uploads, search/sort, dark mode) — only after 1–8 are working

## 9. What NOT to do

- Don't implement bonus features (Section 8, item 9) before core scope is done and demoable.
- Don't put status-mutation logic in more than one place — one service function per lifecycle transition (dispatch, complete, cancel, open maintenance, close maintenance).
- Don't skip the uniqueness/validation checks "to save time" — these are the graded/demoed business rules per the Example Workflow in the FRD.
- Don't add authentication via NextAuth/Clerk/etc. unless asked — spec calls for simple email+password JWT auth.