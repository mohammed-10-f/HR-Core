# HR Core Production Checklist

## Identity & access
- [ ] Supabase Auth enabled
- [ ] MFA/strong password policy defined
- [ ] Roles and permissions stored server-side
- [ ] Tenant membership enforced server-side
- [ ] No frontend role switch in production

## Data
- [ ] PostgreSQL is source of truth
- [ ] All tenant tables carry company_id or inherit it through a protected relation
- [ ] RLS policies tested with cross-tenant attempts
- [ ] Private Storage buckets + signed URLs
- [ ] Automated backups + restore test

## Workflows
- [ ] Versioned transaction definitions
- [ ] Server-side transition validation
- [ ] Step assignment resolution
- [ ] Comments/attachments visibility enforced
- [ ] Immutable audit trail

## Operations
- [ ] Payroll lock/reopen controls
- [ ] Leave balance ledger
- [ ] EOS rules versioned by effective date
- [ ] Notifications + retry handling
- [ ] Reports use database aggregations

## Quality
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Load test for expected concurrency
- [ ] Error monitoring
- [ ] Security review / penetration test
