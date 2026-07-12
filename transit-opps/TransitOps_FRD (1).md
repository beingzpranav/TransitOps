# Functional Requirements Document (FRD)
## TransitOps — Smart Transport Operations Platform

**Version:** 1.0
**Date:** July 12, 2026
**Status:** Draft (Hackathon Build)
**Related document:** TransitOps_PRD.md

---

## 1. Authentication & Access Control

### FR-1.1 Login
- Users log in with email + password.
- Invalid credentials return an error without revealing whether the email exists.

### FR-1.2 Role-Based Access Control
- Every user has exactly one role: Fleet Manager, Driver, Safety Officer, or Financial Analyst.
- Unauthenticated requests to any protected route/API are rejected (401).
- UI navigation and API endpoints are filtered by role permissions (see PRD Section 6).

---

## 2. Dashboard

### FR-2.1 KPI Display
The dashboard must display, computed live from current data:
- Active Vehicles
- Available Vehicles
- Vehicles in Maintenance
- Active Trips
- Pending Trips
- Drivers On Duty
- Fleet Utilization (%) = (Vehicles On Trip / Total Active Vehicles) × 100

### FR-2.2 Filters
- Dashboard supports filtering by: Vehicle Type, Status, Region.
- Filters apply to KPI calculations, not just list views.

---

## 3. Vehicle Registry

### FR-3.1 Vehicle Fields
| Field | Type | Rules |
|---|---|---|
| Registration Number | String | Required, unique across all vehicles |
| Vehicle Name/Model | String | Required |
| Type | Enum/String | Required |
| Maximum Load Capacity | Number (kg) | Required, > 0 |
| Odometer | Number | Required, ≥ 0 |
| Acquisition Cost | Number | Required, ≥ 0 |
| Status | Enum | Available / On Trip / In Shop / Retired |

### FR-3.2 Vehicle Operations
- Create, read, update, and (soft) delete/retire vehicles.
- Attempting to register a duplicate registration number must be rejected with a clear error.
- Status is **not directly editable** by users in most cases — it is system-derived from trip and maintenance events (see Sections 5 and 6), except manual transition to **Retired**, which a Fleet Manager can set explicitly.

---

## 4. Driver Management

### FR-4.1 Driver Fields
| Field | Type | Rules |
|---|---|---|
| Name | String | Required |
| License Number | String | Required |
| License Category | String | Required |
| License Expiry Date | Date | Required |
| Contact Number | String | Required |
| Safety Score | Number | Optional at creation, updatable |
| Status | Enum | Available / On Trip / Off Duty / Suspended |

### FR-4.2 Driver Operations
- Create, read, update driver profiles.
- Safety Officer can set a driver's status to Suspended.
- Status is system-derived for Available ↔ On Trip transitions (driven by trip dispatch/completion); Off Duty and Suspended are manually set.

---

## 5. Trip Management

### FR-5.1 Trip Creation ("Draft")
Trip creation requires:
- Source and destination
- Selection of an **available** vehicle (status = Available)
- Selection of an **available** driver (status = Available, license not expired, status ≠ Suspended)
- Cargo weight (kg)
- Planned distance

**Validation on create/dispatch:**
- Cargo Weight ≤ selected vehicle's Maximum Load Capacity → else reject with error.
- Selected driver's License Expiry Date ≥ today → else reject.
- Selected driver's Status ≠ Suspended → else reject.
- Selected vehicle's Status = Available (not On Trip, In Shop, or Retired) → else reject.
- Selected driver's Status = Available (not already On Trip) → else reject.

### FR-5.2 Trip Lifecycle
States: **Draft → Dispatched → Completed → Cancelled**

| Transition | Trigger | System Effect |
|---|---|---|
| Draft → Dispatched | User dispatches trip (validations in FR-5.1 pass) | Vehicle.status = On Trip; Driver.status = On Trip |
| Dispatched → Completed | User completes trip, enters final odometer + fuel consumed | Vehicle.status = Available; Driver.status = Available; Vehicle.odometer updated; FuelLog entry created |
| Dispatched → Cancelled | User cancels an active trip | Vehicle.status = Available; Driver.status = Available |
| Draft → Cancelled | User cancels before dispatch | No vehicle/driver status change needed (they were never locked) |

### FR-5.3 Concurrency Rule
- A vehicle or driver already marked **On Trip** cannot be selected for a new trip. This check and the resulting status update must occur atomically (single transaction) to prevent double-booking under concurrent requests.

---

## 6. Maintenance

### FR-6.1 Maintenance Record Creation
- Fields: Vehicle (reference), description, cost, date opened, active/closed flag.
- Creating an **active** maintenance record automatically sets Vehicle.status = In Shop.
- A vehicle with status In Shop is excluded from the vehicle selection pool in Trip Management (FR-5.1).

### FR-6.2 Maintenance Closure
- Closing a maintenance record sets Vehicle.status = Available, **unless** the vehicle's status is Retired, in which case it remains Retired.

### FR-6.3 Maintenance Cost
- Each maintenance record's cost feeds into the vehicle's total operational cost calculation (Section 8).

---

## 7. Fuel & Expense Management

### FR-7.1 Fuel Logs
- Fields: Vehicle (reference), liters, cost, date.
- Can be created manually or auto-generated on trip completion (FR-5.2).

### FR-7.2 Expenses
- Fields: Vehicle (reference), type (toll, misc, etc.), amount, date.

### FR-7.3 Cost Rollup
- Total Operational Cost per vehicle = Σ(Fuel Log costs) + Σ(Maintenance costs), recalculated on every relevant insert/update — no manual recompute step required.

---

## 8. Reports & Analytics

### FR-8.1 Computed Metrics
| Metric | Formula |
|---|---|
| Fuel Efficiency | Total Distance ÷ Total Fuel Consumed |
| Fleet Utilization | (Vehicles On Trip ÷ Total Active Vehicles) × 100% |
| Operational Cost | Fuel Cost + Maintenance Cost (per vehicle or fleet-wide) |
| Vehicle ROI | (Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost |

*Note: "Revenue" is not explicitly defined as a captured field elsewhere in the spec — implementers should either (a) add a Revenue field to Trip or Vehicle, or (b) treat ROI as a stretch metric contingent on that field's existence. Flag this as an open question before building the ROI report.*

### FR-8.2 Charts & Visual Analytics
- Reports & Analytics is **not tabular-only** — the source brief lists "Charts and visual analytics" as a mandatory deliverable.
- Minimum chart set:
  - Fuel Efficiency trend per vehicle (line/bar over time)
  - Fleet Utilization over time (line/bar)
  - Operational Cost breakdown by vehicle (bar) and by category — fuel vs. maintenance (pie/stacked bar)
  - Vehicle ROI comparison across fleet (bar), pending the Revenue field decision (see FR-8.4)

### FR-8.3 Export
- CSV export required for all report views.
- PDF export is optional (bonus — see Section 12).

### FR-8.4 Open Question — Revenue Field
- The ROI formula in the source brief requires "Revenue," which is not defined as a captured field anywhere else in the spec.
- **Decision needed before implementation:** either (a) add a `revenuePerTrip` or `revenue` field to the Trip entity and sum per vehicle, or (b) add a `revenue` field directly to Vehicle for manual entry. Recommendation: (a), since it ties revenue to actual completed trips and keeps ROI auditable.

---

## 9. Data Entities Summary

Users, Roles, Vehicles, Drivers, Trips, Maintenance Logs, Fuel Logs, Expenses — see PRD/technical schema for field-level detail.

---

## 10. Non-Functional Requirements

- **Responsiveness:** UI must be usable on both desktop and tablet/mobile viewport widths.
- **Data integrity:** All status-transition rules (Sections 5–6) must be enforced server-side, not solely in the UI.
- **Auditability (recommended, not mandatory):** Status changes ideally timestamped for traceability, given multiple roles interact with shared entities.

## 12. Bonus Features (Build after core scope in Sections 1–10 is complete)

### FR-12.1 PDF Export
- Every report view that supports CSV export (FR-8.3) must also support a PDF export button.
- PDF output includes the same data as the CSV (summary metrics + underlying table), formatted for print/sharing.

### FR-12.2 Email Reminders for Expiring Licenses
- System checks Driver.licenseExpiry against current date on a recurring basis (e.g. daily job) or on login.
- If expiry falls within a configurable threshold (default: 30 days), send an email notification to the driver and/or the Safety Officer role.
- Drivers with already-expired licenses are covered separately by the hard block in FR-5.1 (they cannot be dispatched) — this feature is the proactive warning before that point.

### FR-12.3 Vehicle Document Management
- Fleet Manager can upload documents (registration certificate, insurance, permits) against a Vehicle record.
- Each document stores: file, label/type, upload date, expiry date (optional, for insurance/permit renewal tracking).
- Documents are viewable/downloadable from the Vehicle detail screen.

### FR-12.4 Search, Filters, and Sorting
- Vehicle list: search by registration number/model; filter by type/status; sort by any column.
- Driver list: search by name/license number; filter by status/license category; sort by any column.
- Trip list: search by source/destination; filter by status/date range; sort by any column.
- This extends beyond the dashboard-level filters in FR-2.2, which apply to KPIs specifically.

### FR-12.5 Dark Mode
- Theme toggle available in the UI, switching between light and dark palettes across all screens.
- Preference persists for the logged-in user across sessions.

---

## 13. Acceptance Criteria (Traceable to Example Workflow in source brief)

1. Registering a vehicle with a duplicate registration number is rejected.
2. A trip with cargo weight exceeding vehicle capacity cannot be dispatched.
3. Dispatching a trip sets both vehicle and driver to On Trip.
4. Completing a trip returns both vehicle and driver to Available and logs fuel/odometer.
5. Creating an active maintenance record removes the vehicle from the dispatch pool immediately.
6. Closing maintenance restores vehicle availability unless Retired.
7. Dashboard KPIs and reports reflect the above changes without manual intervention.
