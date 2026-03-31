# Timesheets Frontend

React + Vite frontend for tracking employee time against projects and phases.

## Runtime and tooling

- Node.js: `22.x`

## Local environment setup

Create or update `.env` in the `timesheets` root (same folder as `package.json`):

```dotenv
VITE_API_URL=http://localhost:5000
VITE_LOCAL_AAD_CLIENT_ID=<dev-client-id>
VITE_LOCAL_AAD_TENANT_ID=<tenant-id-or-common>
VITE_LOCAL_AAD_API_SCOPE=api://<api-client-id>/Timesheet.ReadWrite
```

Notes:

- In production, Azure-provided `VITE_AAD_*` variables are used.
- Local `VITE_LOCAL_*` values are only fallbacks for local development.
- Frontend code bundled by Vite reads `.env` from this repo root only.

## Azure / Entra app registration checks

- Add `http://localhost:5173` as a SPA redirect URI for the frontend app registration.
- Ensure the API app registration exposes the scope used by `VITE_LOCAL_AAD_API_SCOPE`.
- Ensure your test user can request tokens for that scope.

## Run locally

```bash
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Backend dependency

This frontend requires the API to be running and reachable at `VITE_API_URL` (default `http://localhost:5000`).

See the API setup instructions in the backend repo README: `../timesheets-api/README.md`.
