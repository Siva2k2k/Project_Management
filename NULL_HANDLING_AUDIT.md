# Null Handling Audit Report

**Date**: November 27, 2025  
**Scope**: Complete codebase review for null/undefined reference handling

---

## Executive Summary

A comprehensive audit was conducted to verify null handling across all entities in the application. The audit examined:
- **Backend**: Repository layer, Service layer, Models
- **Frontend**: React components, API service calls

### Key Findings:
✅ **Good Practices Found**: Most of the codebase already had proper null handling in place  
⚠️ **Issues Identified**: 6 specific areas where deleted entity references could break the application  
✅ **All Issues Fixed**: Applied fixes with proper null checks and filtering

---

## Entity Relationships

### 1. **Project Entity** (Central Entity)
References:
- `customer` → Customer (required)
- `assigned_manager` → User (required)
- `resources[]` → Resource[] (optional)
- `last_modified_by` → User (optional)

**Risk**: If customer or assigned_manager is deleted, project queries could return null references

### 2. **ProjectWeeklyEffort**
References:
- `project` → Project (required)
- `resource` → Resource (required)
- `last_modified_by` → User (optional)

**Risk**: If resource is deleted, weekly effort records become orphaned

### 3. **ProjectWeeklyMetrics**
References:
- `project` → Project (required)
- `last_modified_by` → User (optional)

**Risk**: Minimal - metrics tied to project lifecycle

### 4. **Resource, Customer, User**
- Soft-delete enabled (is_deleted flag)
- Pre-query hooks filter deleted records automatically
- Referenced by other entities

### 5. **AuditLog**
References:
- `performed_by` → User (required for history)

**Risk**: Audit logs should be preserved even if user is deleted

---

## Fixes Applied

### Backend - Repository Layer

#### 1. **ProjectRepository.ts** ✅ Already Fixed
All methods that populate references now filter out null results:

```typescript
// Methods updated:
- findByManager(): Filters projects with null customer or manager
- findAll(): Filters projects with null customer or manager
- findByCustomer(): Filters projects with null customer or manager
- findByStatus(): Filters projects with null customer or manager
- findWithFilters(): Filters projects with null customer or manager
```

**Why**: Prevents frontend from receiving projects with missing critical references

#### 2. **ProjectWeeklyEffortRepository.ts** ✅ Already Fixed
All methods filter out efforts with null references:

```typescript
// Methods with filtering:
- findWithPagination(): Filters entries where project or resource is null
- findByProject(): Filters entries where resource is null
- findByResource(): Filters entries where project is null
- findByWeek(): Filters entries where project or resource is null
- findByProjectAndWeek(): Filters entries where resource is null
- findAllByProject(): Filters entries where project or resource is null
```

**Why**: Weekly effort records without valid resource references are meaningless

#### 3. **AuditLogRepository.ts** ✅ Fixed
Updated to handle deleted users:

```typescript
// Changes:
- findByEntity(): Renamed 'data' to 'rawData', keeps audit logs even if user deleted
- findByAction(): Keeps audit logs even if user deleted
- findByDateRange(): Keeps audit logs even if user deleted
```

**Why**: Audit logs are historical records and must be preserved regardless of user deletion

### Backend - Service Layer

#### 4. **dashboardService.ts** ✅ Fixed
Added null checks in helper functions:

```typescript
// Functions updated:
calculateActualCost(): 
  - Added check to skip efforts with null/deleted resources
  - Prevents calculation errors when resource is deleted

extractResourceNames():
  - Added check to skip efforts with null/deleted resources
  - Prevents 'Unknown' resource names polluting data

buildCumulativeEffortData():
  - Added check to skip efforts with null/deleted resources
  - Prevents incorrect cumulative calculations
```

**Why**: Dashboard calculations must handle missing resource data gracefully

### Frontend - Component Layer

#### 5. **ProjectDialog.tsx** ✅ Fixed
Added optional chaining for project references:

```typescript
// Before:
assigned_manager: project.assigned_manager._id,
customer: project.customer._id,

// After:
assigned_manager: project.assigned_manager?._id || '',
customer: project.customer?._id || '',
```

**Why**: Prevents crash when editing a project with deleted customer or manager

#### 6. **WeeklyEffortDialog.tsx** ✅ Fixed
Filter out efforts with deleted resources:

```typescript
// Before:
const entries = efforts.map((effort: any) => {
  effortMap.set(effort.resource._id || effort.resource, effort._id);
  return { resource: effort.resource._id || effort.resource, hours: effort.hours };
});

// After:
const entries = efforts
  .filter((effort: any) => effort.resource) // Filter out efforts with deleted resources
  .map((effort: any) => {
    effortMap.set(effort.resource._id || effort.resource, effort._id);
    return { resource: effort.resource._id || effort.resource, hours: effort.hours };
  });
```

**Why**: Prevents crash when loading weekly efforts with deleted resource references

#### 7. **WeeklyEffortsList.tsx** ✅ Fixed
Added fallback for deleted customer references:

```typescript
// Before:
{data.project.customer.customer_name}

// After:
{data.project.customer?.customer_name || 'Unknown Customer'}
```

**Why**: Prevents crash when displaying projects with deleted customer

---

## Areas Already Well-Handled

### ✅ Good Existing Patterns:

1. **Frontend Optional Chaining** - Most components already use `?.` operator:
   - `ProjectsList.tsx`: `project.assigned_manager?.name || 'Unassigned'`
   - `ProjectDetails.tsx`: `project.customer?.customer_name || 'N/A'`
   - Dashboard components use type guards

2. **Service Layer Validation** - All services check for null before operations:
   - `projectService.ts`: Throws NotFoundError if project not found
   - `resourceService.ts`: Throws NotFoundError if resource not found
   - `customerService.ts`: Throws NotFoundError if customer not found

3. **Soft Delete Pattern** - Entities use `is_deleted` flag:
   - Pre-query hooks automatically exclude deleted records
   - Prevents accidental hard deletes
   - Maintains referential integrity

4. **Type Guards in Dashboard** - Helper functions validate populated fields:
   - `isPopulatedCustomer()`: Checks if customer is populated object
   - `isPopulatedResource()`: Checks if resource is populated object
   - `isPopulatedProject()`: Checks if project is populated object

---

## Testing Recommendations

### 1. Test Deleted Customer Scenario
```
1. Create a project with a customer
2. Delete the customer (soft delete)
3. View projects list → Should show project without crash
4. Edit project → Should handle missing customer gracefully
5. View project details → Should show "Unknown Customer"
```

### 2. Test Deleted Manager Scenario
```
1. Create a project with an assigned manager
2. Delete the manager user
3. View projects list → Should show project with "Unassigned"
4. Dashboard views → Should calculate metrics correctly
```

### 3. Test Deleted Resource Scenario
```
1. Add weekly efforts for a resource
2. Delete the resource
3. View weekly efforts list → Should skip deleted resource entries
4. View project drill-down → Should calculate hours correctly
5. Dashboard budget calculations → Should not crash
```

### 4. Test Deleted User in Audit Logs
```
1. Perform actions (creates audit logs)
2. Delete the user who performed actions
3. View audit logs → Should display logs with "Unknown User" or similar
```

---

## Recommendations for Future Development

### 1. **Consider Cascade Delete Policies**
- Currently using soft deletes everywhere
- Consider if some relations should cascade delete
- Example: Delete ProjectWeeklyEffort when Resource is deleted?

### 2. **Add Database Constraints**
- Consider adding MongoDB validation rules
- Prevent deletion of entities with active references
- Example: Prevent deleting Customer if they have active projects

### 3. **UI Indicators for Deleted References**
- Add visual indicators when displaying entities with deleted references
- Example: Show "⚠️ Customer Deleted" instead of just "Unknown Customer"

### 4. **Admin Tools for Data Cleanup**
- Create admin page to find orphaned records
- Tool to reassign projects from deleted managers
- Bulk cleanup of efforts with deleted resources

### 5. **Improved Error Messages**
- When edit fails due to missing reference, provide clear message
- Suggest actions: "This customer has been deleted. Please select a new customer."

---

## Summary

### Issues Found: 6
### Issues Fixed: 6
### Compilation Status: ✅ All files compile successfully

All critical null handling issues have been addressed. The application now gracefully handles:
- Deleted customers in projects
- Deleted managers in projects
- Deleted resources in weekly efforts
- Deleted users in audit logs

The fixes maintain data integrity while preventing application crashes when referenced entities are deleted.
