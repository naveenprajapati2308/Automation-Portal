# Version 1.1.0 - Admin Dashboard Refinement & User Management Enhancements

Analyze the existing implementation before making changes.

Current implementation is partially correct but does not match the intended workflow.

Modify the existing implementation according to the following requirements.

---

## 1. Admin Navigation Refactor

Current Issue:

The sidebar contains:

* Admin Dashboard
* User Management
* Role Management
* Access Management

These admin menus are permanently visible in the sidebar.

This is NOT the expected behavior.

### Required Change

Remove the following sidebar entries:

* User Management
* Role Management
* Access Management

Keep only:

* Dashboard
* Reports Center
* Test Logs
* Screenshots
* Environments
* Profile
* Administration highligheted 

For SUPER_ADMIN only:

```text
Administration
```

or

```text
Admin Dashboard
```

When clicked:

Navigate to a completely separate Administration Workspace.

Do NOT load User Management inside the normal dashboard.

Administration must feel like a separate area of the application.

---

## 2. Separate Admin Workspace

Current Issue:

Admin Dashboard opens inside the same layout and feels like another page.

### Required Change

Create a dedicated Administration Workspace.

Example:

```text
Normal Portal
 └ Dashboard
 └ Reports
 └ Logs
 └ Profile

Administration Portal
 └ Admin Dashboard
 └ User Management
 └ Role Management
 └ Access Management
```

When SUPER_ADMIN clicks Administration:

Open dedicated Admin Workspace.

Only SUPER_ADMIN can access this route.

All other users must receive:

403 Unauthorized (give msz you not authenticated to this something like this )

---

## 3. User Management Enhancements

Current implementation is incomplete.

Add:

### Create User

Persist users in database.

When Create User is clicked:

Call backend API.

Save data into MySQL.

Required fields:

* Username not null
* Email null 
* Password required 
* Full Name
* Mobile Number requred 
* Designation
* Role

---

### Edit User

Update user information.

Persist changes.

---

### Enable User

Persist status.

---

### Disable User

Persist status.

---

### Delete User

Add Delete User functionality.

Requirements:

* Delete button
* Confirmation dialog

Example:

```text
Are you sure you want to delete this user?

[Cancel]
[Delete]
```

Delete from database.

Do not allow deletion of SUPER_ADMIN.

---

### Reset Password

Persist changes.

---

## 4. Modal Behavior Fix

Current Issue:

Create User modal is opening correctly.

However behavior must be controlled.

### Required Change

Modal must NOT close when:

* Clicking outside modal
* Clicking backdrop
* Pressing random areas

Modal should only close when:

* Close (X) button clicked
* Cancel button clicked
* User created successfully

This is mandatory.

also apply validation on alll fields and validation msz in red colore 

---

## 5. Backend APIs

Create production-ready APIs.

### User APIs

POST

```text
/api/admin/users
```

Create User

GET

```text
/api/admin/users
```

List Users

PUT

```text
/api/admin/users/{id}
```

Update User

DELETE

```text
/api/admin/users/{id}
```

Delete User

PUT

```text
/api/admin/users/{id}/enable
```

Enable User

PUT

```text
/api/admin/users/{id}/disable
```

Disable User

PUT

```text
/api/admin/users/{id}/reset-password
```

Reset Password

---

## 6. Authorization Rules

Only:

```text
SUPER_ADMIN
```

can:

* Create User
* Edit User
* Delete User
* Reset Password
* Manage Roles
* Manage Access

All APIs must validate JWT token.

Apply Spring Security authorization.

Unauthorized users must receive:

403 Forbidden

---

## 7. User Management UI Improvements

Current table looks basic.

Enhance UI.

Add:

* Search User
* Filter By Role
* Filter By Status
* Pagination
* User Count

Improve action buttons.

Use enterprise styling.

---

## 8. Dashboard Flow

Required User Flow:

Login
↓
Dashboard
↓
Administration Button (Top Right)
↓
Administration Workspace
↓
User Management
↓
Create/Edit/Delete User

This is the intended flow.

Do NOT expose admin menus in the main sidebar.

---

## 9. Database Requirements

Persist everything into MySQL.

Tables:

* users
* roles
* user_roles
* audit_logs

Audit logs should track:

* User Created
* User Updated
* User Deleted
* User Enabled
* User Disabled
* Password Reset

---

## 10. Final Goal

The portal should behave like an enterprise application.

Normal users should never see admin controls.

Only SUPER_ADMIN should have access to Administration.

Administration should feel like a separate secured workspace rather than additional sidebar menu items.
