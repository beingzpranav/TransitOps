# Product Requirements Document (PRD)
## TransitOps — Smart Transport Operations Platform

**Version:** 1.0
**Date:** July 12, 2026
**Status:** Draft (Hackathon Build)

---

## 1. Purpose

TransitOps replaces spreadsheet- and logbook-based fleet management with a centralized platform covering the full lifecycle of transport operations: vehicle registry, driver management, trip dispatch, maintenance, fuel/expense tracking, and operational analytics.

## 2. Problem Statement

Logistics companies currently rely on manual, disconnected tools to run their fleets. This causes:

- Scheduling conflicts (double-booked vehicles or drivers)
- Underutilized vehicles sitting idle without visibility
- Missed or late maintenance leading to breakdowns
- Drivers dispatched with expired licenses
- Inaccurate or untracked operational expenses
- No single source of truth for fleet health or profitability

## 3. Goals & Success Criteria

| Goal | Success Metric |
|---|---|
| Eliminate double-booking of vehicles/drivers | 0% overlap in trip assignments |
| Prevent non-compliant dispatch | 100% of dispatches blocked for expired-license/suspended drivers |
| Centralize cost tracking | Every vehicle shows accurate combined fuel + maintenance cost |
| Improve fleet visibility | Dashboard reflects real-time KPI values with no manual refresh logic needed |
| Enable data-driven decisions | Reports/analytics computable and exportable (CSV) for any date range |

## 4. Target Users & Roles

| Role | Primary Needs |
|---|---|
| **Fleet Manager** | Oversee assets, maintenance, vehicle lifecycle, and operational efficiency |
| **Driver** | Create trips, assign vehicles/drivers, monitor active deliveries |
| **Safety Officer** | Track license validity, driver compliance, safety scores |
| **Financial Analyst** | Review expenses, fuel consumption, maintenance costs, profitability |

All roles authenticate into one platform; access is scoped via Role-Based Access Control (RBAC).

## 5. Scope

### 5.1 Core Scope (Mandatory Deliverables)
- Responsive web interface
- Authentication with RBAC
- Dashboard with KPIs and filters
- Vehicle registry (CRUD)
- Driver management (CRUD)
- Trip management with lifecycle and validation rules
- Automatic status transitions across vehicles, drivers, and trips
- Maintenance workflow tied to vehicle status
- Fuel & expense logging with automatic cost rollups
- Reports & analytics, including **charts and visual analytics** (not just tabular reports)
- CSV export of reports

### 5.2 Bonus Scope (Build only if core scope is complete and stable)
- PDF export of reports
- Email reminders for expiring driver licenses
- Vehicle document management (uploads/attachments — e.g. registration papers, insurance)
- Search, filters, and sorting across all list views (vehicles, drivers, trips — beyond the dashboard's basic filters)
- Dark mode

Bonus items are explicitly deprioritized relative to core scope but are included in this document (see Section 11) so they can be picked up quickly if time allows.

### 5.3 Reference Mockup
A UI reference mockup is provided at: https://link.excalidraw.com/l/65VNwvy7c4X/1FHGDNgD2td — use this to guide layout and screen structure rather than designing from scratch.

## 6. User Roles & Permissions (RBAC)

| Capability | Fleet Manager | Driver | Safety Officer | Financial Analyst |
|---|---|---|---|---|
| Manage vehicles | Full | View | View | View |
| Manage drivers | Full | View | Full (compliance fields) | View |
| Create/dispatch trips | Full | Full | View | View |
| Maintenance logs | Full | View | View | View |
| Fuel/expense logs | Full | Add | View | Full |
| Dashboard & reports | Full | Limited (own trips) | Compliance view | Financial view |

*(Exact permission matrix can be tuned during build; the principle is: every screen is role-aware, no unauthenticated access.)*

## 7. Key Workflows

1. **Vehicle onboarding** → Fleet Manager registers a vehicle with a unique registration number and capacity.
2. **Driver onboarding** → Safety Officer/Fleet Manager registers a driver with license details.
3. **Trip creation & dispatch** → Driver selects source, destination, an available vehicle, an available driver, and cargo weight; system validates capacity and compliance before allowing dispatch.
4. **Trip completion** → Odometer and fuel consumption are logged; vehicle and driver revert to Available.
5. **Maintenance** → Vehicle flagged as In Shop, automatically excluded from dispatch pool until maintenance is closed.
6. **Cost tracking** → Fuel logs and expenses roll up automatically into per-vehicle operational cost.
7. **Reporting** → Fleet Manager/Financial Analyst view and export utilization, cost, efficiency, and ROI metrics.

## 8. Assumptions & Constraints

- Single-organization deployment (no multi-tenant requirement stated).
- 8-hour build window — MVP prioritizes correctness of business rules over UI polish.
- Web-only, responsive design (no native mobile app required).
- No payment processing or external fleet telematics integration in scope.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Race conditions on concurrent dispatch (double-booking) | Enforce checks + updates inside a single DB transaction |
| Incomplete validation causing bad data (e.g., overweight cargo) | Server-side validation as source of truth, not just UI |
| Scope creep into bonus features eating core-feature time | Build order strictly follows Section 5.1 before touching Section 5.2 |
| ROI formula requires a "Revenue" field not defined elsewhere in the source brief | Decide and document where Revenue is captured (per-trip or per-vehicle) before building the ROI report — see FRD open question |

## 10. Deliverables

**Core:**
- Responsive web app with authentication and RBAC
- Full CRUD for vehicles and drivers
- Trip lifecycle management with automatic status propagation
- Maintenance and fuel/expense workflows
- Dashboard with KPIs, charts/visual analytics, and CSV export

**Bonus (if time allows):**
- PDF export
- Email reminders for expiring licenses
- Vehicle document management
- Search, filters, and sorting across list views
- Dark mode

## 11. Bonus Feature Detail

| Feature | What it needs to do |
|---|---|
| **PDF export** | Same report data as CSV export, rendered as a downloadable PDF (table + summary metrics) |
| **Email reminders for expiring licenses** | Scheduled/triggered check comparing Driver.licenseExpiry to today; sends email to driver and/or Safety Officer inside a configurable window (e.g. 30 days before expiry) |
| **Vehicle document management** | Upload/store/view documents (registration, insurance, permits) attached to a Vehicle record; basic file list per vehicle |
| **Search, filters, and sorting** | Text search plus column sort/filter on Vehicle, Driver, and Trip list views (beyond the dashboard's type/status/region filters) |
| **Dark mode** | Theme toggle persisted per user session, applied across all screens |
