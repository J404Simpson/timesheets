This app is intended to track employees time against projects and phases of projects

## Local MSAL configuration

Azure supplies `VITE_AAD_CLIENT_ID`, `VITE_AAD_TENANT_ID`, and `VITE_AAD_API_SCOPE` in production. When
running locally you can provide developer-only values without changing the production setup by
dropping a `.env` file in the project root:

```
VITE_API_URL=http://localhost:5000
VITE_LOCAL_AAD_CLIENT_ID=<dev-client-id>
VITE_LOCAL_AAD_TENANT_ID=<dev-tenant-id-or-common>
VITE_LOCAL_AAD_API_SCOPE=api://<dev-client-id>/Timesheet.ReadWrite
```

These local variables are only used when the Azure-provided variables are missing, enabling MSAL to
sign in during local testing while keeping the production configuration untouched. Place `.env`
in the project root (next to `package.json`); front-end code bundled by Vite
cannot read `prisma/.env`.

## Local run setup

### 1. API prerequisites

The API already reads local settings from `.env` in the `timesheets-api` root. For local testing you need:

- `DATABASE_URL`
- `PORT=5000`
- `CORS_ORIGIN=http://localhost:5173`
- `TENANT_ID`
- `CLIENT_ID`

### 2. Frontend prerequisites

Create or update `timesheets/.env` with:

```
VITE_API_URL=http://localhost:5000
VITE_LOCAL_AAD_CLIENT_ID=<dev-client-id>
VITE_LOCAL_AAD_TENANT_ID=<tenant-id>
VITE_LOCAL_AAD_API_SCOPE=api://<api-client-id>/Timesheet.ReadWrite
```

### 3. Azure app registration checks

Your Azure AD / Entra app setup must allow local sign-in:

- Add `http://localhost:5173` as a SPA redirect URI for the frontend app registration.
- Ensure the API app registration exposes the scope used by `VITE_LOCAL_AAD_API_SCOPE`.
- Ensure your signed-in user can request tokens for that scope.

### 4. Start locally

In one terminal:

```bash
cd timesheets-api
npm install
npm run dev
```

In another terminal:

```bash
cd timesheets
npm install
npm run dev
```

Then open `http://localhost:5173`.

### 5. What to expect

- Frontend runs on `http://localhost:5173`
- API runs on `http://localhost:5000`
- Frontend sends Bearer tokens to the API using `VITE_API_URL`
- API accepts those tokens if `TENANT_ID` and `CLIENT_ID` match your Azure setup
