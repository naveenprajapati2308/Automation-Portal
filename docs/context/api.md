We are now starting Phase 2 of the Execution Center redesign.

IMPORTANT

Do NOT start coding immediately.

First analyze the existing implementation, identify every affected backend, frontend and database component, prepare the implementation plan, then begin development.

The objective of this phase is to redesign the relationship between Frameworks, Modules and Environments.

Phase 1 introduced Framework selection.

Phase 2 must make Framework → Module → Environment fully dynamic and metadata-driven.

The architecture should support future Frameworks without requiring redesign.

=========================================================
1. Framework → Module Mapping
=========================================================

Every Framework owns its own modules.

Example

Maven Selenium

- Land
- Architect
- Survey

Playwright

- Land
- Login
- Dashboard

Module names may be identical across different Frameworks.

Example

Land (Maven Selenium)

Land (Playwright)

These are different implementations.

The system must never assume module names are globally unique.

The relationship should always be

Framework
+
Module

=========================================================
2. Module → Environment Mapping
=========================================================

Every module must explicitly define which environments it supports.

Example

Land (Maven Selenium)

Supported

QA

UAT

Not Supported

Production

-------------------------------------

Land (Playwright)

Supported

QA

Not Supported

UAT

Production

When a user selects a Framework and then selects a Module, only supported environments should be displayed.

Unsupported environments must never appear in the Execution Center.

=========================================================
3. Environment Configuration
=========================================================

Each Module + Environment combination should maintain its own configuration.

Example

Land

QA

Base URL

Credentials

API Endpoint

Browser

Timeout

Execution Parameters

-------------------------------------

Land

UAT

Different Base URL

Different Credentials

Different API Keys

Different Browser

Different Timeout

Configuration must belong to the Module + Environment combination.

Do not assume one configuration can be shared across every environment.

=========================================================
4. Dynamic Execution Flow
=========================================================

Execution flow should become

Select Framework

↓

Load Modules

↓

Select Module

↓

Load Supported Environments

↓

Select Environment

↓

Load Configuration

↓

Load Browser Options

↓

Execute

Every dropdown must be loaded dynamically.

Nothing should be hardcoded.

=========================================================
5. Browser Mapping
=========================================================

Browser availability depends on

Framework

Module

Environment

Example

Playwright

QA

Chrome

Firefox

-------------------------------------

Selenium

QA

Chrome

Edge

Only supported browsers should be displayed.

=========================================================
6. Future Module Management
=========================================================

This phase must prepare the backend for a future Module Controller.

The future Module Controller will manage

Module Creation

Module Editing

Framework Assignment

Environment Assignment

Browser Assignment

Configuration

Execution Permissions

Although this UI will be developed later, the architecture should be prepared now so integration requires minimal changes.

=========================================================
7. Dashboard Compatibility
=========================================================

Current dashboard functionality must continue working.

Execution History

Reports

Analytics

Evidence

KPIs

must continue using standardized execution metadata.

Avoid Framework-specific logic inside dashboard components.

=========================================================
8. Before Coding
=========================================================

Analyze

Current module structure

Current environment structure

Current Framework implementation

Current execution flow

Current APIs

Current database schema

Current dashboard dependencies

Identify every affected component.

Prepare an implementation plan.

Only then begin development.

The final architecture must be scalable, modular and ready for future Framework additions.

=========================================================
9. Module & Environment Management
=========================================================

The current system already has Module Management on the Admin side.

As Frameworks and Environments become dynamic, Module and Environment management must also be redesigned.

Modules and Environments are closely related and should be managed from a single administration area instead of separate disconnected screens.

The administration module should support:

- Create Module
- Edit Module
- Enable / Disable Module
- Assign Framework
- Assign Supported Environments
- Assign Supported Browsers
- Configure Module Visibility
- Configure Execution Permissions

Environment management should support:

- Create Environment
- Edit Environment
- Enable / Disable Environment
- Configure Environment Settings
- Configure Default Values

Every Module should maintain its own Environment mapping.

Example:

Framework
    ↓
Module
        ↓
Supported Environments
                ↓
Configuration

The Execution Center must never maintain this information directly.

Instead, it should dynamically consume whatever has been configured in the administration module.

The same metadata should also be available inside the Testrix dashboard for viewing and quick operational management.

However, there must be only one source of truth.

Changes made from either interface must update the same backend data instead of maintaining duplicate configurations.

Prepare the architecture so future administration features can be added without redesigning the Execution Center.


