# HR Core — Cloudflare Workers + Vite + D1

## Build

```bash
npm install
npm run build
```

Output: `dist`

## Workers Builds

Use these settings in Cloudflare Workers Builds:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Version command: leave empty
- Root directory: `/`

The repository is deployed as a Cloudflare Worker. The Worker serves `/api/*` and Vite's `dist` files through the Workers Static Assets binding.

## D1

`wrangler.toml` contains a D1 binding named `DB` for the existing database `hr-core`.
Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with the actual D1 Database ID, or configure the D1 binding in the Cloudflare Worker settings.

Do not run the migration until the existing `hr-core` schema has been inspected.

## API

- `GET /api/health` — verifies the D1 binding.
- `GET /api/state` — loads HR Core state from D1.
- `POST /api/mutations` — creates definitions/transactions and applies transaction actions.

## Important

D1 is a database, not an authentication system. The current UI role selector is for demonstration only. Before production use with real employee data, add real authentication and enforce user identity, role, permissions and data scope inside the Worker for every API operation. Hiding UI items is not a security boundary.
