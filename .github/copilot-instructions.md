# Copilot Instructions — Timesheets (Frontend)

## Big Picture

**App type:** React 18 + TypeScript SPA using Vite  
**Auth:** Azure AD via MSAL (`@azure/msal-browser`, `@azure/msal-react`)  
**Backend communication:** REST API calls to `timesheets-api` via typed API helper functions using `fetch` + Bearer tokens  
**Routing:** React Router DOM for client-side navigation  

**Entry points:**
- [src/main.tsx](src/main.tsx) — App bootstrap with `MsalProvider`
- [src/App.tsx](src/App.tsx) — Root component with auth state and navigation

## Developer Workflows

**Commands** (from [package.json](package.json)):
- `npm run dev` — Vite dev server (default port 5173)
- `npm run build` — Production build (runs `prebuild` check, outputs to `dist/`)
- `npm run start` — Build and preview (sets PATH, runs Vite preview)
- `npm run lint:fix` — Auto-fix ESLint issues in `src/**/*.{ts,tsx}`

**Deployment:** GitHub Actions on push to `master` → Azure App Service (see [.github/workflows/master_timesheets.yml](.github/workflows/master_timesheets.yml))

## Authentication Pattern

### MSAL Configuration ([src/auth/msalConfig.ts](src/auth/msalConfig.ts))

Uses `resolveEnvValue()` helper to prioritize environment variables:
1. Azure-provided vars (`VITE_AAD_CLIENT_ID`, `VITE_AAD_TENANT_ID`, `VITE_AAD_API_SCOPE`) — set in production
2. Local dev vars (`VITE_LOCAL_AAD_CLIENT_ID`, `VITE_LOCAL_AAD_TENANT_ID`, `VITE_LOCAL_AAD_API_SCOPE`) — from `.env.local`
3. Fallback to `"common"` tenant for local dev

**Local dev setup** (from [README.md](README.md#L5-L16)):
Create `.env.local` in project root with:
```
VITE_LOCAL_AAD_CLIENT_ID=<dev-client-id>
VITE_LOCAL_AAD_TENANT_ID=<dev-tenant-id-or-common>
VITE_LOCAL_AAD_API_SCOPE=api://<dev-client-id>/Timesheet.ReadWrite
```

**Critical:** `.env.local` is in project root (`timesheets/`), NOT in `prisma/` folder

### Token Acquisition Pattern

All API calls use this pattern (see [src/api/timesheet.ts](src/api/timesheet.ts)):
```typescript
const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/endpoint`, {
   headers: { Authorization: `Bearer ${accessToken}` },
});
if (!response.ok) throw new Error(`Request failed (${response.status})`);
const data = await response.json();
```

## API Layer Structure

Located in [src/api/](src/api/) — one file per domain:
- [timesheet.ts](src/api/timesheet.ts) — Projects, phases, entries, login notification
- [task.ts](src/api/task.ts) — Task retrieval for phases and departments
- [department.ts](src/api/department.ts) — Department listing and employee creation

**Conventions:**
- Export TypeScript interfaces for response types (`Project`, `Phase`, `Task`, etc.)
- Use `import.meta.env.VITE_API_URL` as base URL
- Throw errors on failure (caller handles error display)
- Functions are async and return typed promises

**Environment variable** ([src/vite-env.d.ts](src/vite-env.d.ts)):
- `VITE_API_URL` — Backend API base URL (e.g., `http://localhost:5000` locally, Azure App Service URL in production)

## User Onboarding Flow

Implemented in [src/App.tsx](src/App.tsx#L34-L53):

1. On login, call `notifyLogin(firstName, lastName, email, object_id)` from [src/api/timesheet.ts](src/api/timesheet.ts#L52-L73)
2. Backend responds with:
   - `{status: "department_required"}` if user needs department assignment
   - `{status: "ok"}` (or similar) if already onboarded
3. If department required:
   - Set `pendingUser` state
   - Show `DepartmentModal` ([src/components/DepartmentModal.tsx](src/components/DepartmentModal.tsx))
   - Block app access until department selected
4. After department selection, call `createEmployee()` from [src/api/department.ts](src/api/department.ts) and set `isOnboarded = true`

**State management:**
- `isOnboarded` — boolean tracking if user can access app
- `showDepartmentModal` — controls modal visibility
- `pendingUser` — holds user details during onboarding

## Component Patterns

### TimeSheetForm ([src/components/TimeSheetForm.tsx](src/components/TimeSheetForm.tsx))

**Time handling helpers:**
- `generateTimeOptions(stepMinutes)` — Creates 24hr time dropdown options (formatted as 12hr AM/PM)
- `minutesFrom(value24)` — Converts "HH:MM" string to total minutes
- `format12(value24)` — Converts "HH:MM" to "h:MM AM/PM" display format

**Data flow:**
1. Fetch active projects via `getActiveProjects()` on mount
2. When project selected, fetch phases via `getPhasesForProject(projectId)`
3. When phase selected, fetch tasks via `getTasksForPhaseAndEmployee(phaseId)` (department-scoped)
4. Calculate hours from start/end time in minutes
5. Submit entry with date, times, and IDs

**Props pattern:**
- `selectedDate`, `selectedHour`, `selectedMinute` — Allow pre-population from calendar clicks
- `onClose()` — Callback to exit form
- `onSuccess()` — Callback after successful submission (refresh parent data)

### Recent/History Components

- [src/components/Recent.tsx](src/components/Recent.tsx) — Shows current week entries with daily hour totals
- [src/components/History.tsx](src/components/History.tsx) — Allows date range selection for historical entries

Both fetch entries from API and allow clicking dates to pre-populate the TimeSheetForm.

## Routing & Navigation

Uses React Router ([src/main.tsx](src/main.tsx) wraps app with `BrowserRouter`):
- No explicit routes defined (single-page view switching via state)
- Navigation controlled by `view` state in [App.tsx](src/App.tsx): `"recent" | "history"`
- Hash-based navigation (`href="#create"`, `href="#recent"`, `href="#history"`) triggers state changes

## When Adding Features

### New API Endpoint Integration
1. Add function to appropriate `src/api/*.ts` file
2. Export response type interface
3. Follow token acquisition pattern
4. Use in component with `useState` + `useEffect` or event handlers

### New Component
1. Place in `src/components/`
2. Import MSAL hooks if auth needed: `useMsal()` for account access
3. Use API layer functions (don't call `fetch` directly from components)
4. Follow existing naming: PascalCase files matching component name

### New Protected Route
1. Wrap with `<ProtectedRoute>` component ([src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx))
2. Checks `isAuthenticated` from MSAL context
3. Redirects unauthenticated users

## Common Gotchas

- **Vite env vars:** Only `VITE_` prefixed vars are exposed to frontend code (see [vite-env.d.ts](src/vite-env.d.ts))
- **MSAL scope:** Must request `protectedResources.timesheetApi.scope` (defined in [msalConfig.ts](src/auth/msalConfig.ts#L75-L81))
- **Local vs production config:** Use `.env.local` for overrides, don't modify production Azure env var names
- **CORS:** Backend must allow frontend origin (coordinate with `timesheets-api` `CORS_ORIGIN` setting)
- **Time zones:** No explicit timezone handling — assumes local browser time
- **Department requirement:** Users without departments can't access app until assigned (by design)

## Key Files

- **Bootstrap:** [src/main.tsx](src/main.tsx), [src/App.tsx](src/App.tsx)
- **Auth:** [src/auth/msalConfig.ts](src/auth/msalConfig.ts)
- **API layer:** [src/api/timesheet.ts](src/api/timesheet.ts), [src/api/task.ts](src/api/task.ts), [src/api/department.ts](src/api/department.ts)
- **Forms:** [src/components/TimeSheetForm.tsx](src/components/TimeSheetForm.tsx)
- **Views:** [src/components/Recent.tsx](src/components/Recent.tsx), [src/components/History.tsx](src/components/History.tsx)
- **Config:** [vite.config.ts](vite.config.ts), [package.json](package.json)
