# HR Core — D1/Auth Fix

This package fixes the white-screen regression introduced in the auth build and aligns authentication with the current D1 schema used by the HR Core setup:

- Restores the missing `seedEmployees` data and `has()` permission helper that caused the React app to fail before rendering.
- Auth uses the current D1 columns: `password_hash`, `session_token`, role `code/name_ar` and numeric role IDs.
- `/api/state` gracefully falls back to the local demo state until a company is seeded in D1.

The admin PIN `1234` is a temporary development credential and should be changed before production use.
