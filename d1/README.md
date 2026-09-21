# HR Core D1

Target database: `hr-core`, binding: `DB`.

Run the existing `d1/schema.sql` only if provisioning a fresh database. For an existing database run `d1/migrations/0002_enterprise_hr_core.sql` first. The migration is additive and does not drop existing data.

Before any destructive migration, export a D1 backup and review the migration against production.
