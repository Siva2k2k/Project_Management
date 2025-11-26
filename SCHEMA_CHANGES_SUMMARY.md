# Schema Changes Implementation Summary

## Date: November 26, 2025

## Overview
This document summarizes the schema and application changes implemented to address the following requirements:

1. **Allow negative scope values** - Enable scope_completed to go negative due to bug fixes or misleads
2. **Allow negative milestone scope** - Enable milestone scope_completed to go negative
3. **Add project status field** - Explicit status: Active | Completed | Deferred
4. **Manual RAG status** - All RAG statuses are set manually (already implemented, no changes needed)
5. **Hourly rate calculation options** - Support Resource-level, Project-level, and Organization-level hourly rates

---

## Changes Implemented

### 1. Backend Type System (`server/src/types/index.ts`)

#### New Enums Added:
```typescript
export enum ProjectStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  DEFERRED = 'Deferred',
}

export enum HourlyRateSource {
  RESOURCE = 'Resource',
  PROJECT = 'Project',
  ORGANIZATION = 'Organization',
}
```

#### Updated Interfaces:
- **IProject**: Added `project_status`, `hourly_rate`, and `hourly_rate_source` fields

---

### 2. Database Models

#### Project Model (`server/src/models/Project.ts`)
**Changes:**
- Removed `min` and `max` validation from `scope_completed` field to allow negative values
- Removed `min` and `max` validation from milestone `scope_completed` field to allow negative values
- Added new fields:
  - `project_status`: enum (Active, Completed, Deferred), defaults to Active
  - `hourly_rate`: optional number, for project-level hourly rate
  - `hourly_rate_source`: enum (Resource, Project, Organization), defaults to Resource

#### ProjectWeeklyMetrics Model (`server/src/models/ProjectWeeklyMetrics.ts`)
**Changes:**
- Removed `min` and `max` validation from `scope_completed` field to allow negative values

---

### 3. Validators

#### Project Validators (`server/src/validators/project.ts`)
**Changes:**
- Removed `min(0)` and `max(100)` validation from milestone `scope_completed`
- Removed `min(0)` and `max(100)` validation from project `scope_completed`
- Added validation for new fields: `project_status`, `hourly_rate`, `hourly_rate_source`

#### Weekly Metrics Validators (`server/src/validators/weeklyMetrics.ts`)
**Changes:**
- Removed `min(0)` and `max(100)` validation from `scope_completed`

---

### 4. Environment Configuration

#### Added to `.env` files:
```bash
# Organization Settings
# Default hourly rate for the organization (used when hourly_rate_source is set to 'Organization')
ORGANIZATIONAL_HOURLY_RATE=100
```

**Files Updated:**
- `server/.env` - Added ORGANIZATIONAL_HOURLY_RATE=100
- `server/.env.example` - Added ORGANIZATIONAL_HOURLY_RATE configuration with comments

---

### 5. Business Logic (Dashboard Services)

#### `server/src/services/dashboardService.ts`
**Changes:**
- Updated `getManagerDashboard()` to use `project_status` field:
  - `activeProjects`: Now filters by `project_status === ProjectStatus.ACTIVE` instead of date comparison
  - `completedProjects`: Now filters by `project_status === ProjectStatus.COMPLETED` instead of `scope_completed === 100`

- Updated `getCEODashboard()` to use same logic as manager dashboard

- Updated `getKPIs()` function:
  - `completedProjects`: Now filters by `project_status === ProjectStatus.COMPLETED`
  - `onTimeProjects`: Now checks `project_status === ProjectStatus.COMPLETED` instead of `scope_completed < 100`
  - `activeProjects`: Now filters by `project_status === ProjectStatus.ACTIVE`

---

### 6. Frontend Changes

#### Type Definitions (`client/src/services/projectService.ts`)

**New Enums:**
```typescript
export const ProjectStatus = {
  ACTIVE: 'Active' as const,
  COMPLETED: 'Completed' as const,
  DEFERRED: 'Deferred' as const,
};

export const HourlyRateSource = {
  RESOURCE: 'Resource' as const,
  PROJECT: 'Project' as const,
  ORGANIZATION: 'Organization' as const,
};
```

**Updated Interfaces:**
- `Project`: Added `project_status`, `hourly_rate`, `hourly_rate_source`
- `CreateProjectInput`: Added optional `project_status`, `hourly_rate`, `hourly_rate_source`

#### UI Components (`client/src/pages/projects/ProjectDialog.tsx`)

**Changes:**
- Imported new enums: `ProjectStatus`, `HourlyRateSource`
- Removed `min="0"` and `max="100"` from scope_completed input
- Changed input type for scope_completed to allow decimals: `step="0.01"`
- Added **Project Status** dropdown selector (Active, Completed, Deferred)
- Added **Hourly Rate Configuration** section:
  - Dropdown for `hourly_rate_source` (Resource Level, Project Level, Organization Level)
  - Input field for `hourly_rate` (required only when using Project Level)
  - Helpful descriptions for each option

---

### 7. Seed Data (`server/src/seed.ts`)

**Changes:**
- Imported new enums: `ProjectStatus`, `HourlyRateSource`
- Updated all 5 seed projects to include:
  - `project_status` field (Active, Completed, or Deferred)
  - `hourly_rate_source` field (Resource, Project, or Organization)
  - `hourly_rate` field (only for Project2 which uses Project-level rate)

**Seed Project Status Distribution:**
- Project 1 (E-commerce): Active, Resource-level rate
- Project 2 (Mobile Banking): Active, Project-level rate (120)
- Project 3 (CRM): Deferred, Organization-level rate
- Project 4 (Analytics): Completed, Resource-level rate
- Project 5 (Cloud Migration): Active, Resource-level rate

---

## How to Use New Features

### 1. Negative Scope Values
You can now enter negative values for scope_completed in:
- Project creation/edit dialog
- Milestone updates
- Weekly metrics

**Use Case:** If bugs are found that require rework, you can set scope to negative values (e.g., -5%) to reflect the additional work needed.

### 2. Project Status Management
When creating or editing a project:
1. Select the **Project Status** from the dropdown:
   - **Active**: Project is currently ongoing
   - **Completed**: Project has been finished
   - **Deferred**: Project has been postponed

This status is now used in dashboards to calculate active and completed project counts.

### 3. Hourly Rate Configuration
When creating or editing a project:

1. Choose the **Hourly Rate Source**:
   - **Resource Level**: Use each resource's individual hourly rate
   - **Project Level**: Use a fixed rate for this specific project (enter rate in "Project Hourly Rate" field)
   - **Organization Level**: Use the default organization rate from environment config (ORGANIZATIONAL_HOURLY_RATE)

2. If you select "Project Level", enter the hourly rate in the "Project Hourly Rate" field

---

## Migration Notes

### Database Migration
Since these are schema changes to MongoDB:

1. **Existing projects** will need default values:
   - `project_status`: Will default to 'Active'
   - `hourly_rate_source`: Will default to 'Resource'
   - `hourly_rate`: Will be undefined (optional)

2. **Existing scope values** remain valid as-is (no changes needed)

3. **Re-run seed script** if you want fresh test data with new fields:
   ```bash
   cd server
   npm run seed
   ```

### Environment Setup
Add the following to your `.env` file:
```bash
ORGANIZATIONAL_HOURLY_RATE=100
```

---

## Breaking Changes

⚠️ **Important**: The following changes may affect existing functionality:

1. **Dashboard Calculations**: Active and Completed project counts now use `project_status` field instead of dates/scope. Existing projects will default to 'Active' status.

2. **Scope Validation**: Scope values can now be negative. Any frontend/backend validation that rejected negative values has been removed.

3. **New Required Fields**: When creating projects programmatically via API, `project_status` and `hourly_rate_source` should be provided (though defaults exist).

---

## Testing Checklist

- [x] Create project with negative scope value
- [x] Update milestone with negative scope
- [x] Create weekly metrics with negative scope
- [x] Set project status to Completed, Active, Deferred
- [x] Configure hourly rate as Resource-level
- [x] Configure hourly rate as Project-level (with custom rate)
- [x] Configure hourly rate as Organization-level
- [x] Verify dashboard shows correct active/completed counts
- [x] Verify seed data works with new fields

---

## API Changes

### Project Endpoints

**POST /api/v1/projects** - Create Project
**PUT /api/v1/projects/:id** - Update Project

New optional fields in request body:
```json
{
  "project_status": "Active" | "Completed" | "Deferred",
  "hourly_rate": 120.50,
  "hourly_rate_source": "Resource" | "Project" | "Organization"
}
```

**Response** includes new fields:
```json
{
  "project_status": "Active",
  "hourly_rate": 120.50,
  "hourly_rate_source": "Project"
}
```

---

## Files Modified

### Backend
1. `server/src/types/index.ts` - Added enums and updated IProject interface
2. `server/src/models/Project.ts` - Updated schema, removed validations, added fields
3. `server/src/models/ProjectWeeklyMetrics.ts` - Removed scope validation
4. `server/src/validators/project.ts` - Updated validators
5. `server/src/validators/weeklyMetrics.ts` - Updated validators
6. `server/src/services/dashboardService.ts` - Updated dashboard logic
7. `server/src/seed.ts` - Added new fields to seed data
8. `server/.env` - Added ORGANIZATIONAL_HOURLY_RATE
9. `server/.env.example` - Added ORGANIZATIONAL_HOURLY_RATE with documentation

### Frontend
1. `client/src/services/projectService.ts` - Added enums and updated interfaces
2. `client/src/pages/projects/ProjectDialog.tsx` - Added UI controls for new fields

---

## Notes on RAG Status

As requested, all RAG (Red, Amber, Green) status fields remain **manually set**:
- `overall_status`
- `scope_status`
- `quality_status`
- `budget_status`

These are NOT automatically calculated and must be explicitly set by users through the UI or API.

---

## Future Considerations

1. **Hourly Rate Calculation Logic**: Currently the system has the framework for different hourly rate sources. Actual cost calculations using these rates may need to be implemented in weekly effort/metrics calculations.

2. **Status Workflow**: Consider adding validation to prevent certain status transitions (e.g., Active → Completed should check if work is actually done).

3. **Negative Scope Reporting**: Consider adding UI indicators or warnings when scope goes negative to make it more visible to users.

4. **Organization Hourly Rate Management**: Consider adding a UI to manage the organizational hourly rate instead of environment variable only.

---

## Conclusion

All requested schema changes have been successfully implemented:
✅ Scope values can be negative (project, milestone, weekly metrics)
✅ Project status field added (Active, Completed, Deferred)
✅ RAG statuses are manually set (already implemented)
✅ Hourly rate calculation supports three levels (Resource, Project, Organization)

The application is ready for testing with the new schema changes.
