# RBAC Audit & Fix Plan

Implement strict Role-Based Access Control (RBAC) across TransitOps API endpoints and the frontend UI pages to match the system requirements. This closes existing security gaps where certain roles can access unauthorized data or perform unauthorized actions.

## User Review Required

> [!IMPORTANT]
> - Safety Officers will be blocked from accessing vehicle data.
> - Dispatchers and Safety Officers will be blocked from accessing fuel and expense data.
> - Financial Analysts will be blocked from accessing trip data.
> - Direct navigation to blocked pages will result in an "Access Denied" view rather than showing empty states or throwing console errors.

## Open Questions

None. All roles and permissions are clearly defined by the PRD.

---

## Proposed Changes

### API Layer (Server-Side)
Enforce role checks on all `GET` routes that currently only check `requireAuth`, blocking unauthorized roles at the API layer.

#### [MODIFY] [route.ts (Vehicles)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/api/vehicles/route.ts)
- Restrict `GET` to `FLEET_MANAGER, DISPATCHER, FINANCIAL_ANALYST` (block `SAFETY_OFFICER`).

#### [MODIFY] [route.ts (Vehicle ID)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/api/vehicles/[id]/route.ts)
- Restrict `GET` to `FLEET_MANAGER, DISPATCHER, FINANCIAL_ANALYST` (block `SAFETY_OFFICER`).

#### [MODIFY] [route.ts (Driver ID)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/api/drivers/[id]/route.ts)
- Restrict `GET` to `FLEET_MANAGER, SAFETY_OFFICER` (block `DISPATCHER, FINANCIAL_ANALYST`).

#### [MODIFY] [route.ts (Trips)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/api/trips/route.ts)
- Restrict `GET` to `FLEET_MANAGER, DISPATCHER, SAFETY_OFFICER` (block `FINANCIAL_ANALYST`).

#### [MODIFY] [route.ts (Trip ID)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/api/trips/[id]/route.ts)
- Restrict `GET` to `FLEET_MANAGER, DISPATCHER, SAFETY_OFFICER` (block `FINANCIAL_ANALYST`).

---

### Navigation & Layout
Ensure the sidebar links match the role access matrix.

#### [MODIFY] [layout.tsx (Dashboard Layout)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/(dashboard)/layout.tsx)
- Update `getNavItems` roles arrays:
  - **Vehicles**: `['FLEET_MANAGER', 'DISPATCHER', 'FINANCIAL_ANALYST']`
  - **Drivers**: `['FLEET_MANAGER', 'SAFETY_OFFICER']`
  - **Trips**: `['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER']`
  - **Maintenance**: `['FLEET_MANAGER', 'SAFETY_OFFICER']`
  - **Fuel & Expenses**: `['FLEET_MANAGER', 'FINANCIAL_ANALYST']`
  - **Reports**: `['FLEET_MANAGER', 'FINANCIAL_ANALYST']`

---

### UI Pages (Role-Gating & Direct Navigation Defense)
For pages that are restricted, check `userRole` and show an "Access Denied" view if the user does not have permission. Hide Action buttons where roles only have view-only access.

#### [MODIFY] [page.tsx (Vehicles Page)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/(dashboard)/dashboard/vehicles/page.tsx)
- Restrict view to `FLEET_MANAGER, DISPATCHER, FINANCIAL_ANALYST`. If `SAFETY_OFFICER`, show "Access Denied".

#### [MODIFY] [page.tsx (Drivers Page)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/(dashboard)/dashboard/drivers/page.tsx)
- Restrict view to `FLEET_MANAGER, SAFETY_OFFICER`. If `DISPATCHER` or `FINANCIAL_ANALYST`, show "Access Denied".

#### [MODIFY] [page.tsx (Trips Page)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/(dashboard)/dashboard/trips/page.tsx)
- Restrict view to `FLEET_MANAGER, DISPATCHER, SAFETY_OFFICER`. If `FINANCIAL_ANALYST`, show "Access Denied".

#### [MODIFY] [page.tsx (Maintenance Page)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/(dashboard)/dashboard/maintenance/page.tsx)
- Restrict view to `FLEET_MANAGER, SAFETY_OFFICER`. If `DISPATCHER` or `FINANCIAL_ANALYST`, show "Access Denied".

#### [MODIFY] [page.tsx (Fuel & Expenses Page)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/(dashboard)/dashboard/fuel-expenses/page.tsx)
- Restrict view to `FLEET_MANAGER, FINANCIAL_ANALYST`. If `DISPATCHER` or `SAFETY_OFFICER`, show "Access Denied".
- Update `canAddLog` to exclude `DISPATCHER`: only allow `FLEET_MANAGER, FINANCIAL_ANALYST`.

#### [MODIFY] [page.tsx (Reports Page)](file:///c:/Users/khand/OneDrive/Desktop/PROJECTS/TransitOps/transit-opps/app/(dashboard)/dashboard/reports/page.tsx)
- Restrict view to `FLEET_MANAGER, FINANCIAL_ANALYST`. If `DISPATCHER` or `SAFETY_OFFICER`, show "Access Denied".

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify Next.js builds clean without static rendering or type-checking issues.
- Since there are no existing automated test suites, manual validation is the primary path.

### Manual Verification
1. **Login as Fleet Manager (`FLEET_MANAGER`)**:
   - Verify all sidebar navigation links are visible.
   - Verify all pages load successfully and action buttons are present.
2. **Login as Dispatcher (`DISPATCHER`)**:
   - Verify sidebar only shows: Dashboard, Vehicles, Trips.
   - Verify Vehicles page shows the list of vehicles but hides the "Add Vehicle" and row "Actions" (Edit, Retire).
   - Verify Trips page shows list, lets you Create Trip, Dispatch, and Cancel.
   - Try to directly navigate to `/dashboard/drivers` and verify "Access Denied" is displayed.
3. **Login as Safety Officer (`SAFETY_OFFICER`)**:
   - Verify sidebar only shows: Dashboard, Drivers, Trips, Maintenance.
   - Verify Vehicles page is hidden; navigating directly shows "Access Denied".
   - Verify Drivers page allows adding/editing/suspending drivers.
   - Verify Trips page is view-only (no "Create Trip", "Dispatch", or "Complete/Cancel" buttons visible).
4. **Login as Financial Analyst (`FINANCIAL_ANALYST`)**:
   - Verify sidebar only shows: Dashboard, Vehicles, Fuel & Expenses, Reports.
   - Verify Vehicles page is view-only (no add/edit/retire buttons).
   - Verify Fuel & Expenses page shows all logs and allows adding logs.
   - Verify Reports page displays all cost, fuel, and ROI charts.
   - Try to directly navigate to `/dashboard/trips` and verify "Access Denied" is displayed.
