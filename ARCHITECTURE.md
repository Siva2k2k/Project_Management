# PM Dashboard - Architecture & Code Structure Guide

> **Purpose**: This document serves as a reference guide for maintaining consistency in code structure, design patterns, and architectural decisions when implementing new features.

## Table of Contents
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Patterns](#architecture-patterns)
- [Client Architecture](#client-architecture)
- [Server Architecture](#server-architecture)
- [Design System & UI Components](#design-system--ui-components)
- [State Management](#state-management)
- [Routing & Navigation](#routing--navigation)
- [Data Models](#data-models)
- [API Structure](#api-structure)
- [Authentication & Authorization](#authentication--authorization)
- [Development Guidelines](#development-guidelines)

---

## Project Overview

**PM Dashboard** is a full-stack Project Management Dashboard application built with React (client) and Express (server), using MongoDB for data persistence. The application provides project tracking, resource management, customer management, and dashboard analytics with role-based access control.

### Key Features
- Role-based dashboards (Manager, Admin, CEO)
- Project management with milestones and RAG status tracking
- Resource and customer management
- Weekly effort tracking and metrics
- KPI and trend analytics
- Dark/Light theme support
- Microsoft SSO authentication support

---

## Tech Stack

### Client (`/client`)
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Language**: TypeScript 5.9.3
- **Routing**: React Router DOM 7.9.6
- **Styling**: Tailwind CSS 4.1.17
- **UI Components**: Radix UI primitives
- **Form Handling**: React Hook Form 7.66.1 + Zod 4.1.13
- **HTTP Client**: Axios 1.13.2
- **Charts**: Recharts 3.5.0
- **Icons**: Lucide React 0.554.0

### Server (`/server`)
- **Framework**: Express 5.1.0
- **Language**: TypeScript 5.9.3
- **Database**: MongoDB (via Mongoose 8.20.1)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Security**: Helmet 8.1.0, CORS, bcryptjs
- **Validation**: Zod 4.1.13
- **Logging**: Winston 3.18.3
- **Rate Limiting**: express-rate-limit 8.2.1
- **SSO**: @azure/msal-node 3.8.3

---

## Project Structure

```
pm-dashboard/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/             # Base UI components (Button, Input, etc.)
│   │   │   ├── layout/         # Layout components (DashboardLayout, Sidebar)
│   │   │   └── *.tsx           # Shared components (ProtectedRoute, ThemeToggle)
│   │   ├── context/            # React Context providers
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── pages/              # Page-level components (route components)
│   │   │   ├── auth/           # Login, Register, AuthCallback
│   │   │   ├── dashboard/      # ManagerDashboard, CEODashboard, KPIDashboard, TrendsDashboard
│   │   │   ├── projects/       # ProjectsList, ProjectDetails, ProjectDialog
│   │   │   ├── customers/      # CustomersList, CustomerDialog
│   │   │   ├── resources/      # ResourcesList, ResourceDialog
│   │   │   ├── weeklyEfforts/  # WeeklyEffortsList, WeeklyEffortDialog
│   │   │   └── profile/        # Profile
│   │   ├── services/           # API service layer
│   │   │   ├── api.ts          # Axios instance with interceptors
│   │   │   ├── authService.ts
│   │   │   ├── userService.ts
│   │   │   ├── customerService.ts
│   │   │   ├── projectService.ts
│   │   │   ├── resourceService.ts
│   │   │   ├── weeklyEffortService.ts
│   │   │   └── dashboardService.ts
│   │   ├── types/              # TypeScript type definitions
│   │   ├── lib/                # Utility functions
│   │   ├── App.tsx             # Root component with routing
│   │   ├── main.tsx            # Application entry point
│   │   └── index.css           # Global styles & Tailwind config
│   ├── package.json
│   └── vite.config.ts
│
├── server/                      # Backend Express API
│   ├── src/
│   │   ├── config/             # Configuration files
│   │   │   ├── database.ts     # MongoDB connection
│   │   │   └── index.ts        # Environment config
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth.ts         # Authentication middleware
│   │   │   ├── errorHandler.ts
│   │   │   └── index.ts
│   │   ├── models/             # Mongoose models
│   │   │   ├── User.ts
│   │   │   ├── Customer.ts
│   │   │   ├── Resource.ts
│   │   │   ├── Project.ts
│   │   │   ├── ProjectWeeklyEffort.ts
│   │   │   ├── ProjectWeeklyMetrics.ts
│   │   │   └── AuditLog.ts
│   │   ├── dbrepo/             # Database repository pattern
│   │   │   ├── BaseRepository.ts
│   │   │   ├── CustomerRepository.ts
│   │   │   ├── ResourceRepository.ts
│   │   │   ├── ProjectRepository.ts
│   │   │   └── AuditLogRepository.ts
│   │   ├── services/           # Business logic layer
│   │   │   ├── userService.ts
│   │   │   ├── customerService.ts
│   │   │   ├── resourceService.ts
│   │   │   ├── projectService.ts
│   │   │   └── microsoftAuthService.ts
│   │   ├── routes/             # Express route definitions
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── customers.ts
│   │   │   ├── resources.ts
│   │   │   ├── projects.ts
│   │   │   ├── weeklyEfforts.ts
│   │   │   ├── weeklyMetrics.ts
│   │   │   ├── dashboard.ts
│   │   │   └── index.ts        # Route aggregation
│   │   ├── validators/         # Zod validation schemas
│   │   ├── utils/              # Utility functions
│   │   │   ├── logger.ts       # Winston logger
│   │   │   ├── errors.ts       # Custom error classes
│   │   │   ├── response.ts     # Response helpers
│   │   │   └── jwt.ts          # JWT utilities
│   │   ├── types/              # TypeScript type definitions
│   │   ├── index.ts            # Application entry point
│   │   └── seed.ts             # Database seeding script
│   └── package.json
│
└── package.json                 # Root package with workspace scripts
```

---

## Architecture Patterns

### Client Architecture Patterns

#### 1. **Component Organization**
- **UI Components** (`components/ui/`): Atomic, reusable components built on Radix UI primitives
- **Layout Components** (`components/layout/`): Structural components (Sidebar, DashboardLayout)
- **Page Components** (`pages/`): Route-level components with feature-specific logic
- **Shared Components** (`components/`): Cross-feature components (ProtectedRoute, ThemeToggle)

#### 2. **Service Layer Pattern**
All API calls are abstracted into service modules (`services/`):
- Centralizes API endpoint definitions
- Provides typed function signatures
- Handles request/response transformation
- Example: `customerService.ts`, `projectService.ts`

#### 3. **Context API Pattern**
Global state managed via React Context:
- **AuthContext**: User authentication state and methods
- **ThemeContext**: Theme (light/dark) state and persistence

#### 4. **Protected Route Pattern**
Uses `ProtectedRoute` component to wrap authenticated routes:
```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardLayout>
      <DashboardRouter />
    </DashboardLayout>
  </ProtectedRoute>
} />
```

---

### Server Architecture Patterns

#### 1. **Layered Architecture**
```
Routes → Services → Repositories → Models
```
- **Routes**: Handle HTTP requests, validation, and responses
- **Services**: Business logic and orchestration
- **Repositories**: Data access layer with common operations
- **Models**: Mongoose schemas and database interaction

#### 2. **Repository Pattern**
- `BaseRepository`: Generic CRUD operations
- Specific repositories extend BaseRepository
- Provides abstraction over Mongoose models
- Located in `server/src/dbrepo/`

#### 3. **Soft Delete Pattern**
All entities use soft delete:
- `is_deleted` boolean field
- Pre-query hooks filter deleted records automatically
- Example: `user.is_deleted = false` in all find queries

#### 4. **Audit Trail Pattern**
- `last_modified_date` and `last_modified_by` on all entities
- Pre-save hooks update timestamps automatically
- `AuditLog` model tracks all entity changes

#### 5. **Middleware Chain**
```javascript
app → helmet → cors → json → cookieParser → routes → errorHandler
```

---

## Client Architecture

### File Naming Conventions
- **Components**: PascalCase (e.g., `CustomerDialog.tsx`)
- **Services**: camelCase (e.g., `customerService.ts`)
- **Types**: camelCase (e.g., `auth.ts`)
- **Index files**: Re-export modules for clean imports

### Component Structure Pattern
```tsx
// 1. Imports
import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { customerService } from '@/services';

// 2. Type definitions
interface CustomerDialogProps {
  customer?: Customer;
  onSave: () => void;
}

// 3. Component
export function CustomerDialog({ customer, onSave }: CustomerDialogProps) {
  // State
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  const handleSubmit = async () => { /* ... */ };

  // Render
  return ( /* ... */ );
}
```

### Page Component Pattern
Pages follow this structure:
1. **List View**: Table with CRUD actions (e.g., `CustomersList.tsx`)
2. **Detail View**: Individual entity details (e.g., `ProjectDetails.tsx`)
3. **Dialog/Modal**: Create/Edit forms (e.g., `CustomerDialog.tsx`)

### Service Layer Structure
```typescript
// services/customerService.ts
import api from './api';

export const customerService = {
  getAll: (params?: QueryParams) => api.get<Customer[]>('/customers', { params }),
  getById: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (data: CreateCustomerData) => api.post<Customer>('/customers', data),
  update: (id: string, data: UpdateCustomerData) => api.put<Customer>(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};
```

---

## Server Architecture

### File Naming Conventions
- **Models**: PascalCase (e.g., `User.ts`)
- **Routes**: camelCase (e.g., `customers.ts`)
- **Services**: camelCase (e.g., `customerService.ts`)
- **Repositories**: PascalCase (e.g., `CustomerRepository.ts`)

### Model Structure Pattern
```typescript
// models/Customer.ts
import mongoose, { Schema } from 'mongoose';

const customerSchema = new Schema<ICustomer>({
  customer_name: { type: String, required: true },
  // ... other fields
  is_deleted: { type: Boolean, default: false },
  last_modified_date: { type: Date, default: Date.now },
  last_modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Soft delete filter
customerSchema.pre('find', function(next) {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
  next();
});

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
```

### Route Structure Pattern
```typescript
// routes/customers.ts
import { Router } from 'express';
import { authenticate, authorize } from '@/middleware';
import { validateRequest } from '@/validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', customerController.getAll);
router.get('/:id', customerController.getById);
router.post('/', validateRequest(customerSchema), customerController.create);
router.put('/:id', validateRequest(customerSchema), customerController.update);
router.delete('/:id', customerController.delete);

export default router;
```

### Service Layer Pattern
```typescript
// services/customerService.ts
export class CustomerService {
  constructor(private customerRepo: CustomerRepository) {}

  async create(data: CreateCustomerDTO, userId: string): Promise<ICustomer> {
    // Business logic
    const customer = await this.customerRepo.create({
      ...data,
      created_by: userId,
    });
    return customer;
  }
}
```

---

## Design System & UI Components

### Design Tokens
Defined in `client/src/index.css`:
```css
@theme {
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  /* ... blue color scale */
  --color-primary-900: #1e3a8a;
}
```

### Component Variants (CVA Pattern)
UI components use `class-variance-authority` for variant styling:

```typescript
// components/ui/Button.tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

### Utility Function (`cn`)
```typescript
// lib/utils.ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
Combines `clsx` and `tailwind-merge` for conditional class merging.

### UI Component Library
Located in `client/src/components/ui/`:
- `Button.tsx`: Primary interaction component
- `Input.tsx`: Form input field
- `Label.tsx`: Form label
- `Select.tsx`: Dropdown selection (Radix UI)
- `Table.tsx`: Data table component
- `Dialog.tsx`: Modal dialog (Radix UI)
- `AlertDialog.tsx`: Confirmation dialog (Radix UI)
- `Switch.tsx`: Toggle switch (Radix UI)
- `ConfirmDialog.tsx`: Custom confirmation wrapper

### Theme Support
Dark mode implementation:
- Tailwind CSS dark mode with class strategy
- ThemeContext manages theme state
- Persisted in localStorage
- Dark mode classes: `dark:bg-gray-900`, `dark:text-white`

---

## State Management

### Global State (Context API)

#### AuthContext
Location: `client/src/context/AuthContext.tsx`

**State:**
```typescript
{
  user: User | null,
  isAuthenticated: boolean,
  isLoading: boolean
}
```

**Methods:**
```typescript
{
  login: (credentials: LoginCredentials) => Promise<void>,
  register: (data: RegisterData) => Promise<void>,
  logout: () => Promise<void>,
  refreshToken: () => Promise<void>
}
```

**Usage:**
```tsx
const { user, isAuthenticated, login, logout } = useAuth();
```

#### ThemeContext
Location: `client/src/context/ThemeContext.tsx`

**State:**
```typescript
{
  theme: 'light' | 'dark'
}
```

**Methods:**
```typescript
{
  toggleTheme: () => void,
  setTheme: (theme: Theme) => void
}
```

### Local State
- Component-level state with `useState`
- Form state with `react-hook-form`
- No additional state management libraries (Redux, Zustand, etc.)

---

## Routing & Navigation

### Route Configuration
Location: `client/src/App.tsx`

### Route Structure
```
/                        → Redirect to /dashboard
/login                   → Public
/register                → Public
/auth/callback           → Microsoft SSO callback
/dashboard               → Protected (role-based dashboard)
/projects                → Protected
/projects/:id            → Protected
/weekly-efforts          → Protected
/customers               → Protected
/resources               → Protected
/kpis                    → Protected
/trends                  → Protected
/profile                 → Protected
```

### Role-Based Dashboard Routing
```tsx
function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'CEO' || user?.role === 'Admin') {
    return <CEODashboard />;
  }

  return <ManagerDashboard />;
}
```

### Navigation Structure
Sidebar navigation (`client/src/components/layout/Sidebar.tsx`):
- Dashboard (role-based)
- Projects
- Weekly Efforts
- Customers
- Resources
- KPIs
- Trends
- Profile

---

## Data Models

### User Roles
```typescript
enum UserRole {
  MANAGER = 'Manager',
  ADMIN = 'Admin',
  CEO = 'CEO',
}
```

### Core Entities

#### User
**Fields:**
- `name`, `email`, `password` (hashed)
- `role`: UserRole
- `avatar`, `is_active`, `email_verified`
- `refresh_tokens`: IRefreshToken[]
- Audit fields: `last_modified_date`, `last_modified_by`, `is_deleted`

#### Customer
**Fields:**
- `customer_name`, `email`, `contact_info`
- `created_by`: User reference
- Audit fields

#### Resource
**Fields:**
- `resource_name`, `email`
- `status`: Active | Inactive
- `per_hour_rate`, `currency`: USD | INR | EUR | GBP
- Audit fields

#### Project
**Fields:**
- `project_name`, `start_date`, `end_date`
- `project_type`: FP (Fixed Price) | TM (Time & Material)
- `estimated_effort`, `estimated_budget`, `estimated_resources`
- `scope_completed` (0-100%)
- `milestones`: IMilestone[]
- `assigned_manager`: User reference
- `customer`: Customer reference
- `tracking_by`: EndDate | Milestone
- RAG Status fields: `overall_status`, `scope_status`, `quality_status`, `budget_status`
- Audit fields

#### Milestone
**Fields:**
- `description`, `estimated_date`, `estimated_effort`
- `scope_completed`, `completed_date`

#### ProjectWeeklyEffort
**Fields:**
- `project`: Project reference
- `resource`: Resource reference
- `hours`, `week_start_date`, `week_end_date`
- Audit fields

#### ProjectWeeklyMetrics
**Fields:**
- `project`: Project reference
- `week_start_date`, `week_end_date`
- `rollup_hours`, `scope_completed`
- `comments`
- Audit fields

---

## API Structure

### Base URL
Development: `http://localhost:5000/api/v1`
Production: `{HEROKU_APP_URL}/api/v1`

### Endpoints

#### Authentication
```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/profile
GET    /api/v1/auth/microsoft/signin
POST   /api/v1/auth/microsoft/callback
```

#### Users
```
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
```

#### Customers
```
GET    /api/v1/customers
GET    /api/v1/customers/:id
POST   /api/v1/customers
PUT    /api/v1/customers/:id
DELETE /api/v1/customers/:id
```

#### Resources
```
GET    /api/v1/resources
GET    /api/v1/resources/:id
POST   /api/v1/resources
PUT    /api/v1/resources/:id
DELETE /api/v1/resources/:id
```

#### Projects
```
GET    /api/v1/projects
GET    /api/v1/projects/:id
POST   /api/v1/projects
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

#### Weekly Efforts
```
GET    /api/v1/weekly-efforts
GET    /api/v1/weekly-efforts/:id
POST   /api/v1/weekly-efforts
PUT    /api/v1/weekly-efforts/:id
DELETE /api/v1/weekly-efforts/:id
```

#### Weekly Metrics
```
GET    /api/v1/weekly-metrics
GET    /api/v1/weekly-metrics/:id
POST   /api/v1/weekly-metrics
PUT    /api/v1/weekly-metrics/:id
DELETE /api/v1/weekly-metrics/:id
```

#### Dashboard
```
GET    /api/v1/dashboard/kpis
GET    /api/v1/dashboard/trends
GET    /api/v1/dashboard/manager-summary
```

### Response Format
```typescript
// Success
{
  data: T,
  message?: string
}

// Error
{
  error: {
    message: string,
    code?: string
  }
}
```

---

## Authentication & Authorization

### JWT Strategy
- **Access Token**: Short-lived (15m), stored in memory (React state)
- **Refresh Token**: Long-lived (7d), stored in httpOnly cookie
- Automatic token refresh via Axios interceptor

### Axios Interceptor Pattern
Location: `client/src/services/api.ts`

```typescript
// Request interceptor - adds access token
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handles token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await authService.refreshToken();
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Server Authentication Middleware
Location: `server/src/middleware/auth.ts`

```typescript
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.userId);

  req.user = user;
  next();
};
```

### Authorization Pattern
Role-based access control in routes:
```typescript
router.post('/users', authenticate, authorize(['Admin', 'CEO']), createUser);
```

---

## Development Guidelines

### Adding a New Feature

#### 1. Client-Side (React)

**Step 1: Define Types**
```typescript
// client/src/types/myFeature.ts
export interface MyEntity {
  id: string;
  name: string;
  // ... other fields
}
```

**Step 2: Create Service**
```typescript
// client/src/services/myFeatureService.ts
import api from './api';

export const myFeatureService = {
  getAll: () => api.get<MyEntity[]>('/my-feature'),
  getById: (id: string) => api.get<MyEntity>(`/my-feature/${id}`),
  create: (data: CreateMyEntityData) => api.post<MyEntity>('/my-feature', data),
  update: (id: string, data: UpdateMyEntityData) => api.put<MyEntity>(`/my-feature/${id}`, data),
  delete: (id: string) => api.delete(`/my-feature/${id}`),
};
```

**Step 3: Create Page Components**
```typescript
// client/src/pages/myFeature/MyFeatureList.tsx
export function MyFeatureList() {
  // List view with table
}

// client/src/pages/myFeature/MyFeatureDialog.tsx
export function MyFeatureDialog({ entity, onSave }: Props) {
  // Create/Edit form with react-hook-form + zod
}
```

**Step 4: Add Route**
```tsx
// client/src/App.tsx
<Route
  path="/my-feature"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <MyFeatureList />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>
```

**Step 5: Add Navigation**
```tsx
// client/src/components/layout/Sidebar.tsx
// Add link to navigation menu
```

#### 2. Server-Side (Express)

**Step 1: Define Types**
```typescript
// server/src/types/index.ts
export interface IMyEntity extends Document {
  _id: Types.ObjectId;
  name: string;
  // ... other fields
  is_deleted: boolean;
  last_modified_date: Date;
  last_modified_by?: Types.ObjectId;
}
```

**Step 2: Create Model**
```typescript
// server/src/models/MyEntity.ts
import mongoose, { Schema } from 'mongoose';

const myEntitySchema = new Schema<IMyEntity>({
  name: { type: String, required: true },
  // ... other fields
  is_deleted: { type: Boolean, default: false },
  last_modified_date: { type: Date, default: Date.now },
  last_modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Add soft delete hooks
myEntitySchema.pre('find', function(next) {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
  next();
});

export const MyEntity = mongoose.model<IMyEntity>('MyEntity', myEntitySchema);
```

**Step 3: Create Repository**
```typescript
// server/src/dbrepo/MyEntityRepository.ts
import { BaseRepository } from './BaseRepository';
import { MyEntity } from '../models';

export class MyEntityRepository extends BaseRepository<IMyEntity> {
  constructor() {
    super(MyEntity);
  }

  // Add custom queries if needed
}
```

**Step 4: Create Service**
```typescript
// server/src/services/myEntityService.ts
export class MyEntityService {
  constructor(private repo: MyEntityRepository) {}

  async create(data: CreateDTO, userId: string): Promise<IMyEntity> {
    return this.repo.create({
      ...data,
      last_modified_by: userId,
    });
  }

  // ... other methods
}
```

**Step 5: Create Validators**
```typescript
// server/src/validators/myEntity.ts
import { z } from 'zod';

export const createMyEntitySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    // ... other fields
  }),
});
```

**Step 6: Create Routes**
```typescript
// server/src/routes/myEntity.ts
import { Router } from 'express';
import { authenticate } from '../middleware';
import { validateRequest } from '../validators';

const router = Router();
router.use(authenticate);

router.get('/', myEntityController.getAll);
router.get('/:id', myEntityController.getById);
router.post('/', validateRequest(createMyEntitySchema), myEntityController.create);
router.put('/:id', validateRequest(updateMyEntitySchema), myEntityController.update);
router.delete('/:id', myEntityController.delete);

export default router;
```

**Step 7: Register Routes**
```typescript
// server/src/routes/index.ts
import myEntityRoutes from './myEntity';

router.use('/my-entity', myEntityRoutes);
```

---

### Code Style Guidelines

#### TypeScript
- Use explicit types for function parameters and return values
- Use interfaces for object shapes
- Use enums for fixed value sets
- Prefer `const` over `let`

#### React
- Use functional components with hooks
- Destructure props in function parameters
- Use `useCallback` for event handlers passed to child components
- Use `useMemo` for expensive computations

#### Naming Conventions
- **Components**: PascalCase (`CustomerDialog`)
- **Functions/Variables**: camelCase (`handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase with `I` prefix for interfaces (`IUser`)
- **Enums**: PascalCase (`UserRole`)

#### File Organization
- One component per file
- Co-locate related files (e.g., `CustomersList.tsx`, `CustomerDialog.tsx` in same folder)
- Export from index files for clean imports

---

### Testing Strategy
*(Note: Test setup is not currently implemented but should follow this pattern)*

- **Unit Tests**: Services and utility functions
- **Integration Tests**: API endpoints
- **Component Tests**: UI components with React Testing Library
- **E2E Tests**: Critical user flows with Playwright/Cypress

---

### Environment Configuration

#### Client (`.env`)
```
VITE_API_URL=http://localhost:5000/api/v1
```

#### Server (`.env`)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pm-dashboard
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:5173

# Microsoft SSO (optional)
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT_ID=
MS_REDIRECT_URI=

# Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

---

### Deployment

#### Build Process
```bash
# Install all dependencies
npm run install

# Build both client and server
npm run build

# Start production server
npm start
```

#### Production Structure
- Client builds to `/client/dist`
- Server serves client static files in production
- Server builds to `/server/dist`
- Entry point: `/server/dist/index.js`

---

## Key Design Decisions

1. **Monorepo Structure**: Client and server in same repository for easier development
2. **TypeScript Everywhere**: Type safety across full stack
3. **Context API over Redux**: Simpler state management for current scope
4. **Repository Pattern**: Clean separation of data access logic
5. **Soft Deletes**: Preserve data integrity and enable audit trails
6. **JWT with Refresh Tokens**: Secure authentication with seamless UX
7. **Radix UI Primitives**: Accessible, unstyled components as foundation
8. **Tailwind CSS**: Utility-first styling for rapid development
9. **Zod for Validation**: Shared validation logic between client and server
10. **Role-Based Routing**: Dynamic UI based on user permissions

---

## Common Patterns Reference

### Form Handling Pattern
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  );
}
```

### Data Fetching Pattern
```tsx
const [data, setData] = useState<Entity[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await myService.getAll();
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, []);
```

### Confirmation Dialog Pattern
```tsx
const [confirmOpen, setConfirmOpen] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);

const handleDelete = async () => {
  if (!selectedId) return;

  try {
    await myService.delete(selectedId);
    // Refresh data
  } catch (error) {
    // Handle error
  } finally {
    setConfirmOpen(false);
  }
};
```

---

## Troubleshooting Common Issues

### Client Issues

**Theme not applying**
- Check if `dark` class is on `<html>` element
- Verify ThemeContext is wrapping the app
- Check Tailwind CSS config for dark mode strategy

**Authentication redirect loop**
- Verify access token is being stored correctly
- Check Axios interceptor logic
- Ensure ProtectedRoute checks authentication state

### Server Issues

**Soft delete not working**
- Verify pre-query hooks are defined on model
- Check if query explicitly sets `is_deleted: true`
- Ensure query uses `find()` or `findOne()` (not `findById()` without wrapper)

**CORS errors**
- Verify `CLIENT_URL` in `.env` matches frontend URL
- Check CORS middleware configuration
- Ensure credentials are included in requests

---

## Next Steps & Future Improvements

1. **Testing**: Implement comprehensive test suite
2. **Error Tracking**: Integrate Sentry or similar service
3. **Performance Monitoring**: Add APM for server and client
4. **Caching**: Implement Redis for frequently accessed data
5. **Real-time Updates**: Add WebSocket support for live data
6. **Notifications**: Email and in-app notification system
7. **File Uploads**: Add support for attachments and documents
8. **Advanced Analytics**: More detailed reporting and visualizations
9. **API Documentation**: Swagger/OpenAPI documentation
10. **CI/CD**: Automated testing and deployment pipeline

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Maintained By**: Development Team
