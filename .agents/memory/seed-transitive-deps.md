---
name: Workspace script dependencies
description: How to run one-off database scripts when a dependency belongs to a nested workspace.
---

Run a one-off script from the workspace that directly declares its package dependency. For example, invoke raw PostgreSQL scripts through the database workspace rather than the repository root.

**Why:** Node module resolution at the repository root does not automatically expose dependencies installed only for a nested pnpm workspace, even when application builds succeed.

**How to apply:** Use the package manager's workspace execution command for the owning package, or add a direct dependency deliberately. Do not assume a root `node -e` script can import a package used only by a subworkspace.