Design and implement the complete Enterprise Workspace & Multi-Tenant Access Control Architecture for Testrix. This is an architecture-level task, not just a coding task. Before implementing anything, analyze the entire architecture and ensure every design decision follows enterprise SaaS principles, scalability, security, and future extensibility.

The architecture must strictly separate the platform into two completely independent domains:

1. Platform Layer (Super Admin)
2. Workspace Layer (Project)

These two layers must never overlap.

--------------------------------------------------
PLATFORM LAYER (SUPER ADMIN)
--------------------------------------------------

The Platform Layer represents Testrix itself.

The Super Admin is the owner of the platform, NOT the owner of individual projects.

The Super Admin must never directly access any project workspace.

The Super Admin dashboard should only contain platform-level functionality such as:

- Workspace Request Management
- Workspace Approval / Rejection
- Workspace Creation
- Workspace Suspension / Activation
- Global Dashboard
- Platform Analytics
- Platform Monitoring
- Global Settings
- Role Definition
- Permission Definition
- Audit Logs
- License Management
- Subscription Management
- System Health
- Notifications
- Security Management

The Super Admin should NOT:

- Open any workspace
- Execute tests
- Modify project data
- Access workspace dashboards
- Access automation modules
- Access API modules
- Access performance modules

If the Super Admin wants to test workspace functionality, they must create their own workspace and use a normal Project Admin account.

Never bypass workspace isolation.

--------------------------------------------------
WORKSPACE LAYER
--------------------------------------------------

Every approved workspace must behave like an independent tenant.

Each workspace must have completely isolated:

- Users
- Roles
- Executions
- Reports
- Automation
- API Testing
- Performance Testing
- Settings
- Dashboards
- Files
- Future modules

No workspace should ever access another workspace's data.

All business tables must reference WorkspaceId.

WorkspaceId should become the primary isolation key throughout the platform.

--------------------------------------------------
WORKSPACE CREATION FLOW
--------------------------------------------------

Workspace creation must follow this lifecycle:

User Registration

↓

Login

↓

Request Workspace

↓

Request Submitted

↓

Super Admin Review

↓

Approve / Reject

↓

Workspace Created

↓

Project Admin Assigned

↓

Workspace Activated

No workspace should ever be automatically created.

--------------------------------------------------
LOGIN EXPERIENCE
--------------------------------------------------

Super Admin Login

↓

Platform Dashboard

↓

Platform Management

Never redirect Super Admin into a workspace.

Project User Login

↓

Workspace

↓

Workspace Dashboard

↓

Automation / API / Performance Modules

Project users must never see platform management.

--------------------------------------------------
ROLE HIERARCHY
--------------------------------------------------

The hierarchy must be:

Super Admin

↓

Project Admin

↓

QA Lead

↓

Tech Lead

↓

Automation Engineer

↓

Viewer

Super Admin exists outside workspace hierarchy.

--------------------------------------------------
ROLE RESPONSIBILITIES
--------------------------------------------------

Viewer

- Read Only
- Dashboard View
- Reports View
- Analytics View
- Execution View

Cannot:

- Execute
- Create
- Edit
- Delete
- Configure
- Schedule
- Manage users

--------------------------------------------------

Automation Engineer

Workspace operational access.

No workspace administration.

--------------------------------------------------

Tech Lead

Initially same permissions as Automation Engineer.

--------------------------------------------------

QA Lead

Initially same permissions as Automation Engineer.

--------------------------------------------------

Project Admin

Workspace Owner.

Can:

- Invite Users
- Remove Users
- Manage Workspace
- Configure Workspace
- Workspace Admin Panel
- Workspace Settings
- Module Management

Cannot:

- Access Platform Layer
- Modify Platform Configuration

--------------------------------------------------

Super Admin

Platform Governance only.

Never Workspace Operations.

--------------------------------------------------
PERMISSION MODEL
--------------------------------------------------

For Version 1:

Automation Engineer
QA Lead
Tech Lead

should intentionally share identical operational permissions.

Do not over-engineer permission differences now.

Keep the architecture simple.

Permission differentiation can be introduced in future versions.

Viewer must remain strictly read-only.

Project Admin receives all operational permissions plus Workspace Administration permissions.

--------------------------------------------------
ROLE MANAGEMENT
--------------------------------------------------

Only Super Admin defines:

- Roles
- Permission Sets
- System Permissions

Project Admin only assigns predefined roles.

Project Admin must never create custom system roles.

--------------------------------------------------
USER MANAGEMENT
--------------------------------------------------

Project Admin manages users only within their own workspace.

They can:

- Invite Users
- Remove Users
- Activate Users
- Disable Users

Users belong only to their workspace unless future multi-workspace support is introduced.

--------------------------------------------------
MULTI-TENANT SECURITY
--------------------------------------------------

Every API

Every Service

Every Repository

Every Query

Every Execution

Every Report

Every Module

must validate WorkspaceId.

No operation should execute without Workspace validation.

Prevent all cross-workspace data leakage.

--------------------------------------------------
DATABASE DESIGN
--------------------------------------------------

Every business entity should reference:

WorkspaceId

Never rely solely on UserId.

Workspace isolation must exist at the database level.

--------------------------------------------------
ARCHITECTURAL PRINCIPLES
--------------------------------------------------

Follow Clean Architecture.

Follow Domain Driven Design where applicable.

Maintain loose coupling.

Maintain high cohesion.

Keep modules independently scalable.

Prepare architecture for:

- Organizations
- Multiple Workspaces
- Billing
- Enterprise SSO
- Marketplace
- AI Modules
- Future Products

without requiring redesign.

--------------------------------------------------
EXPECTED OUTPUT
--------------------------------------------------

Before implementation, produce:

1. Complete Architecture Diagram
2. Module Interaction Diagram
3. Role Hierarchy Diagram
4. Permission Matrix
5. Database Design
6. Entity Relationships
7. Authentication Flow
8. Workspace Lifecycle
9. API Design
10. Security Model
11. Folder Structure
12. Future Scalability Strategy
13. Implementation Roadmap
14. Risks and Recommendations

Do not start implementation until the architecture is internally consistent, scalable, secure, and aligned with enterprise SaaS best practices.

Whenever there is ambiguity, prefer long-term scalability, strict tenant isolation, security, maintainability, and clean architecture over short-term convenience.