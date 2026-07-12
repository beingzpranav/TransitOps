# 🚛 TransitOps — Smart Transport Operations Platform

TransitOps is a centralized fleet operations and management platform designed to replace manual spreadsheet- and logbook-based systems. It covers the full lifecycle of logistics and transport operations, including vehicle registry, driver management, trip dispatch, maintenance workflows, fuel/expense tracking, and interactive analytics dashboards.

---

## 🚀 Key Features

* **Role-Based Access Control (RBAC):** Scope and permission matrix enforced across four roles (Fleet Manager, Dispatcher, Safety Officer, and Financial Analyst).
* **Live KPI Dashboard & Charts:** View active/available/in-shop vehicles, active/pending trips, driver duty statuses, and real-time fleet utilization.
* **Strict Business Logic Validation:** Enforces capacity limits, license validity, double-booking prevention, and atomic transactions.
* **Vehicle & Driver CRUD:** Manage vehicle lifecycles and driver compliance profiles.
* **Atomic Trip Dispatch Lifecycle:** Seamlessly transition statuses (`Draft` ➔ `Dispatched` ➔ `Completed`/`Cancelled`) using secure server-side transaction logic.
* **Maintenance & Cost Rollups:** Lock vehicles in shop and automatically aggregate fuel and operational expenses into cost summaries per vehicle.

---

## 🛠️ Technology Stack

* **Framework:** Next.js 16 (App Router, Turbopack)
* **Database & ORM:** PostgreSQL 16 + Prisma 7
* **Styling:** Tailwind CSS + shadcn/ui
* **State & Data Fetching:** TanStack Query (React Query)
* **Charts & Visuals:** Recharts
* **Authentication:** JWT + bcryptjs

---

## 📁 Repository Structure

```text
TransitOps/
├── transit-opps/               # Main Next.js application directory
│   ├── app/
│   │   ├── (auth)/             # Login pages
│   │   ├── (dashboard)/        # Layout and dashboards (vehicles, trips, etc.)
│   │   └── api/                # Sub-routes for all business entities
│   ├── components/             # Reusable UI components (shaden/ui, confirm dialogs)
│   ├── hooks/                  # Custom state hooks
│   ├── lib/
│   │   ├── prisma.ts           # Shared PrismaClient database instance
│   │   ├── auth.ts             # JWT signing and bcrypt helpers
│   │   └── rbac.ts             # Role authentication middleware helpers
│   ├── prisma/
│   │   ├── migrations/         # Database migrations directory
│   │   ├── schema.prisma       # Database design schemas
│   │   └── seed.ts             # Database seeder script
│   ├── services/               # Core business services & transactions
│   │   ├── vehicle.service.ts
│   │   ├── driver.service.ts
│   │   ├── trip.service.ts
│   │   ├── maintenance.service.ts
│   │   ├── fuel.service.ts
│   │   ├── expense.service.ts
│   │   └── report.service.ts
│   └── package.json
└── TransitOps_codebase_digest.txt # Filtered repository digest for LLM context
```

---

## 🔒 Strict Business Rules & Database Integrity

TransitOps enforces the following rules server-side inside `services/` within atomic `prisma.$transaction()` blocks to prevent race conditions (e.g., double-booking):

1. **Unique Registrations:** Vehicle `registrationNumber` is unique at both the database and API layers.
2. **Dispatch Pool Exclusion:** Retired or "In Shop" vehicles are automatically excluded from dispatch selection queries.
3. **Driver Compliance:** A driver with an expired license or `Suspended` status cannot be assigned to any trip.
4. **Double-Booking Prevention:** A vehicle or driver already `On Trip` is blocked from other assignments.
5. **Load Validation:** `cargoWeight` must not exceed the vehicle's `maxLoadCapacity`.
6. **Atomic State Propagation:** Dispatching a trip marks both vehicle and driver as `On Trip` atomically alongside the trip status update.
7. **Trip Resolution:** Completing a trip reverts vehicle/driver to `Available` and persists final odometer and fuel consumption details. Cancelling returns both back to `Available`.
8. **Maintenance States:** Creating active maintenance logs locks a vehicle to `In Shop`. Closing maintenance restores the vehicle to `Available` (unless marked `Retired`).

---

## ⚡ Quickstart Setup Guide

Follow these steps to configure and run the application locally on macOS:

### 1. Database Setup (PostgreSQL)
Ensure PostgreSQL 16 is installed and running on port 5432:
```bash
# Install Postgres using Homebrew
brew install postgresql@16

# Start the Postgres background service
brew services start postgresql@16

# Create the transitops database
createdb transitops
```

### 2. Configure Environment Variables
Create a `.env` file in the `transit-opps` directory:
```env
DATABASE_URL="postgresql://apple@127.0.0.1:5432/transitops"
JWT_SECRET="transitops-dev-secret-super-secret-key-123456"
NODE_ENV="development"
```

### 3. Install Dependencies & Generate Client
Navigate to the `transit-opps` subdirectory, install packages, and generate your Prisma client:
```bash
cd transit-opps
npm install
npx prisma generate
```
> **Note on ESM Workaround:** If you run into build-time `ERR_REQUIRE_ESM` errors with the Prisma CLI, you can bypass it by renaming/backing up the custom TSX loader config (`mv prisma.config.ts prisma.config.ts.bak`), running `npx prisma generate`, and restoring it afterwards.

### 4. Run Migrations & Seed Data
Initialize your database schemas and seed the initial dummy data:
```bash
# Run Prisma Migrations
npx prisma migrate dev --name init

# Run Seeder
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔑 Demo Access & Seeded Credentials

All roles use the password: **`Password123!`**

| Role | Email | Description |
| --- | --- | --- |
| **Fleet Manager** | `manager@transitops.com` | Full asset and maintenance management control |
| **Dispatcher** | `dispatch@transitops.com` | Create and dispatch new trips/routes |
| **Safety Officer** | `safety@transitops.com` | Manage driver compliance, scorecards, and licenses |
| **Financial Analyst** | `finance@transitops.com` | View cost metrics, rollups, and financial logs |
