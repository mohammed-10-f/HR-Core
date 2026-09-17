# HR Core — Enterprise HR Operating System

HR Core is being built as a multi-tenant enterprise HR platform, not a presentation-only demo.

## Current build
- Dynamic transaction definition builder.
- Dynamic form fields with visibility and required rules.
- Workflow steps with assignee resolution, actions and transitions.
- Versioned transaction-definition foundation.
- Transaction instances with history and audit foundation.
- Employee, leave, payroll, EOS, documents and reports foundations.
- Supabase/PostgreSQL schema with tenant isolation foundation.
- Local mode remains available for UI development only.

## Architecture target
React/Vite → authenticated application → Supabase Auth/PostgreSQL/Storage → RLS/RBAC/Audit/Backups.

The browser is never trusted for authorization.

## Run

```bash
npm install
npm run build
npm run dev
```

For Supabase:

```bash
cp .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never expose a service-role key in the browser.

## Important
This repository is a development foundation. It is not a claim that security, legal compliance, load capacity or production readiness has been independently certified. Before real employee data, complete the production checklist and run security/load/E2E testing.
