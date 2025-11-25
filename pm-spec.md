# Project Management Dashboard Prompt

Develop a robust, production-ready fullstack application "Project Management Dashboard" using React.js 18 + TypeScript for the frontend and Node.js + TypeScript for the backend, leveraging MongoDB with Mongoose ORM for scalable data persistence. The application must support across web, desktop, and mobile clients.
Provided core requirements (like features,access,data models and quality requirements), Front-end and backend architecture. 

## Core Requirements
Overview
I want to develop an intuitive, user-friendly Project Management Dashboard with drill-down capabilities. The dashboard should include a Gantt chart for project schedules and various charts for tracking and visualization.
User Roles and Capabilities
Project Managers:
Create and manage projects, customers, and resources
Enter and upload consolidated weekly effort data by project and by resource
Update project scope  completion percentage and other relevant metrics weekly
Manage multiple projects simultaneously
Report to CEO/Account Manager

Roles:
Manager (Project Manager): Access to assigned projects only
CEO: Full access to all projects and can perform all activities
Admin: Full access to all projects and can perform all activities

Dashboard Access:
Each Project Manager should have access to a personalized dashboard displaying only their assigned projects

Data Management Forms:
I need CRUD (Create, Read, Update, Delete) forms for the following entities:
Projects
Customers
Resources
Project Weekly Effort 

Authentication & Security:
Implement basic user authentication
Implement Microsoft Single Sign-On (SSO) using server-side MSAL library only
Implement audit trail functionality for project data only

# Data Models:
# Project
Project Name
Start Date
End Date
Project Type - Fixed Price (FP) (or) Time and Marterial(TM) - default is TM
Total Estimated Effort (in hours)
Toatal Estimated Budget
Estimated Number of Resources
Percentage (%) Completed for Scope
Milestones (Multiple) - Estimated Milestone date, description, estimated effort, %scope completed, Milestone completed date
Overall Project Status (Red, Amber, Green)
Assigned Project Manager
Tracking by - Track against milestone or end date - default is end date
Overall Scope Status (Red, Amber, Green)
Overall Quality Status (Red, Amber, Green)
Overall Budget Status (Red, Amber, Green)

# Project Weekly Effort
Project Name (reference)
Resource Name (reference)
Number of Hours
Week Start Date
Week End Date
Additional Updates on Projects
Provision to update Overall Scope Completed %,  scope status, budget and quality
Provision to update milestone completion date, actual budget and milestone scope

# Customer
Customer Name
Email
Customer Contact (phone/additional info)

# Resource
Resource Name
Email
Status (Active/Inactive)
per hour rate
currency - default USD - Valid values INR, EUR, GBP

# Manager Dashboard View
Initial Landing View
When a Project Manager has 3-4 projects, the initial dashboard should provide a consolidated summary of all their projects.
Visualizations Required
Provide all possible visualizations:
By Customer
By Project
By Resource
By Week
By % Completed (Overall Scope)
By Overall Project Status (Red, Amber, Green)
By Budget
# Project Drill-Down View
When a project is selected, provide all detailed visualizations for that specific project.
Gantt Chart
For projects with milestones, display the data in a Gantt chart format showing the project timeline and milestone dates.

# CEO Dashboard View
Initial Landing View
The dashboard should provide a consolidated summary of all projects across all Project Managers.
Visualizations Required
Provide all possible visualizations:
By Customer
By Project
By Resource
By Week
By % Completed (Scope)
By Status (Red, Amber, Green)

# Project Drill-Down View
When a project is selected, provide all detailed visualizations for that specific project.
Gantt Chart
For projects with milestones, display the data in a Gantt chart format showing the project timeline and milestone dates.

# Provide trending charts for tracking budget, scope and effort

# Provide recommended KPIs as separate dashboard for managers and CEO. If data items are required please add across entities 

# Quality Requirements
- Naming Conventions
  - camelCase for variables/functions
  - PascalCase for classes
  - CONSTANT_CASE for constant values
- Design and Architecture
  - Avoid Large/God Services by splitting into modules
  - Maintain Cyclomatic Complexity by keeping low complexity (Sonar recommends less than 10)
- Code Quality
  - Add defensive checks for null/undefined
  - Be specific exceptions while handling
  - Never swallow exceptions silently
  - Keep functions small and single-purpose
  - Use independant statement logics instead of Nester ternary wherever applicable
  - Remove Unused Dead code imports, variables, parameters
  - Add meaningful documentation for complex logic
 

### 1. Frontend Architecture

**Framework & Build Tools:**
- React.js version 18.x with TypeScript
- Vite as build tool for optimal performance
- Strict TypeScript configuration with proper type safety

**Styling & UI:**
- Tailwind CSS version 3.x for responsive, modern UI
- Component-based architecture with reusable UI components
- Dark/light theme support with system preference detection
- Mobile-first responsive design approach

**Navigation & Layout:**
- Sidebar with smooth toggle animation (expand/collapse)
- Responsive hamburger menu for mobile/tablet views
- Breadcrumb navigation for better UX
- Tab-based navigation within sections
- intuitive UI with minimal user clicks

**Routing & Security:**
- React Router v6 with nested routing support
- Protected Routes with role-based access control
- Route guards that redirect unauthenticated users to login
- Post-login redirect to intended destination or Dashboard
- 404 error handling with custom page

**Authentication System:**
- JWT-based authentication (access and refresh token flow)
- Multiple OAuth providers integration:
  - Microsoft OAuth 2.0 (Azure AD)
- Traditional email/password authentication
- Persistent login state with automatic token refresh
- Secure token storage (httpOnly cookies preferred)

**User Management Features:**
- User registration with email verification
- Profile management (view, edit, upload avatar)
- Password change functionality
- Password reset via email with secure tokens
- Account deactivation/deletion


**HTTP Client:**
- Axios-based HTTP client with TypeScript interfaces
- Request/response interceptors for:
  - Authentication headers injection
  - Token refresh logic
  - Global error handling
  - Request/response logging (development)
- API response caching for GET requests
- Request retry mechanism for failed requests

**State Management:**
- Context API for global state
- Form state management with React Hook Form
- Loading states and error boundaries

### 2. Backend Architecture

**Framework & Structure:**
- Node.js with Express.js and TypeScript
- Strict modular folder structure:
  ```
  src/
  ├── config/           # Configuration files (database, auth, etc.)
  ├── models/           # Mongoose schemas and interfaces
  ├── dbrepo/           # Database operations (CRUD) for each collection
  ├── routes/           # Route definitions should call only relevant services. Strictly follow
  ├── middleware/       # Authentication, authorization, validation middleware
  ├── utils/            # Helper functions, external API clients
  ├── services/         # Business logic, call dbrepo functions and external service integrations
  ├── types/            # TypeScript type definitions
  └── validators/       # Request validation schemas
  ```

**Database Layer:**
- MongoDB with Mongoose ODM
- Each collection must have:
  - Mongoose schema in `models/` with proper TypeScript interfaces
  - Dedicated CRUD operations file in `dbrepo/`
  - Routes in `routes/` that use only corresponding services
  - No direct database calls in routes
- Database connection with retry logic and connection pooling
- Soft delete functionality for important records
- Database seeding scripts for development

**Authentication & Authorization:**
- JWT with access token (15 min) and refresh token (7 days) strategy
- OAuth integration for  Microsoft
- bcrypt for password hashing with configurable salt rounds
- Role-based access control: "Manager", "Admin", "CEO"
- Permission-based middleware for granular access control
- Session management with secure cookie configuration

**Registration Control System:**
- Admin-configurable registration settings:
  - Admin-only registration mode
- Bulk user import functionality for admins

**API Features:**
- RESTful API design with consistent response format
- API versioning support (/api/v1/)
- Rate limiting per endpoint and user
- API documentation with Swagger/OpenAPI
- Health check endpoints for monitoring
- Audit logging for project entity only

**External Integrations:**
- Reusable Axios client in `utils/` for external API calls
- Email service integration  Nodemailer)


**Error Handling:**
- Global error middleware with consistent error formatting
- Custom error classes for different error types
- Error logging with Winston
- Validation error formatting for frontend consumption
- Write into database for admin to view logs and take action

**Security Implementation:**
- CORS configuration with environment-specific origins
- Rate limiting with express-rate-limit
- Input sanitization and validation
- NoSQL injection prevention
- XSS protection
- CSRF protection for state-changing operations