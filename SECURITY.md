# HR Core Security Boundary

HR Core is intended to handle sensitive HR data. Production deployment must use authenticated Supabase sessions, PostgreSQL RLS, private Storage buckets with signed URLs, server-side validation for privileged mutations, audit logging, backups, monitoring and least-privilege roles.

Never commit `service_role` keys, database passwords, employee data, identity numbers, salary files or production exports to GitHub.

The frontend is untrusted. Hiding a button or changing a React state is not authorization. Every sensitive operation must be authorized by the backend/database policies.
