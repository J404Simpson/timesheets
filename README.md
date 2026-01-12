This app is intended to track employees time against projects and phases of projects

## Local MSAL configuration

Azure supplies `VITE_AAD_CLIENT_ID`, `VITE_AAD_TENANT_ID`, and `VITE_AAD_API_SCOPE` in production. When
running locally you can provide developer-only values without changing the production setup by
dropping a `.env.local` file in the project root:

```
VITE_LOCAL_AAD_CLIENT_ID=<dev-client-id>
VITE_LOCAL_AAD_TENANT_ID=<dev-tenant-id-or-common>
VITE_LOCAL_AAD_API_SCOPE=api://<dev-client-id>/Timesheet.ReadWrite
```

These local variables are only used when the Azure-provided variables are missing, enabling MSAL to
sign in during local testing while keeping the production configuration untouched. Place `.env`
and/or `.env.local` in the project root (next to `package.json`); front-end code bundled by Vite
cannot read `prisma/.env`.
