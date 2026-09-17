-- HR Core production-oriented multi-tenant schema
create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  timezone text not null default 'Asia/Riyadh',
  currency text not null default 'SAR',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  full_name text not null,
  role text not null check (role in ('super_admin','hr','manager','employee')),
  employee_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, parent_id uuid references public.departments(id), manager_employee_id uuid, created_at timestamptz not null default now(), unique(company_id,name)
);
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, code text not null, city text, created_at timestamptz not null default now(), unique(company_id,code)
);
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_no text not null, full_name text not null, national_id text, nationality text, email text, phone text,
  department_id uuid references public.departments(id), branch_id uuid references public.branches(id), manager_id uuid references public.employees(id),
  job_title text, employment_status text not null default 'active', join_date date, end_date date, base_salary numeric(14,2) not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,employee_no)
);
alter table public.profiles drop constraint if exists profiles_employee_id_fkey;
alter table public.profiles add constraint profiles_employee_id_fkey foreign key(employee_id) references public.employees(id) on delete set null;
alter table public.departments drop constraint if exists departments_manager_employee_id_fkey;
alter table public.departments add constraint departments_manager_employee_id_fkey foreign key(manager_employee_id) references public.employees(id) on delete set null;

create table if not exists public.transaction_definitions (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, category text, description text, active boolean not null default true, visible_to_employee boolean not null default true,
  version integer not null default 1, definition jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,name,version)
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  definition_id uuid not null references public.transaction_definitions(id), employee_id uuid references public.employees(id), requester_id uuid references auth.users(id),
  status text not null default 'draft', current_step_id text, values jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.transaction_steps (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references public.transactions(id) on delete cascade,
  step_id text not null, step_name text not null, assignee_user_id uuid references auth.users(id), assignee_role text, status text not null default 'pending', started_at timestamptz, completed_at timestamptz
);
create table if not exists public.transaction_actions (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references public.transactions(id) on delete cascade,
  step_id text, action_id text not null, action_label text not null, actor_id uuid references auth.users(id), comment text, created_at timestamptz not null default now()
);
create table if not exists public.transaction_comments (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references public.transactions(id) on delete cascade,
  author_id uuid references auth.users(id), body text not null, visibility text not null default 'participants' check(visibility in ('participants','hr_private','admin_private')), created_at timestamptz not null default now()
);
create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references public.transactions(id) on delete cascade,
  uploaded_by uuid references auth.users(id), storage_path text not null, file_name text not null, mime_type text, size_bytes bigint, visibility text not null default 'participants', created_at timestamptz not null default now()
);

create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, paid boolean not null default true, active boolean not null default true
);
create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, employee_id uuid not null references public.employees(id) on delete cascade, leave_type_id uuid not null references public.leave_types(id), year integer not null, opening numeric(8,2) not null default 0, accrued numeric(8,2) not null default 0, used numeric(8,2) not null default 0, adjustment numeric(8,2) not null default 0, unique(employee_id,leave_type_id,year)
);
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, employee_id uuid not null references public.employees(id), leave_type_id uuid not null references public.leave_types(id), start_date date not null, end_date date not null, days numeric(8,2) not null, status text not null default 'pending', transaction_id uuid references public.transactions(id), created_at timestamptz not null default now(), check(end_date>=start_date)
);

create table if not exists public.salary_components (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, component_type text not null check(component_type in ('earning','deduction')), calculation_type text not null default 'fixed', active boolean not null default true
);
create table if not exists public.employee_salary_components (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, employee_id uuid not null references public.employees(id) on delete cascade, component_id uuid not null references public.salary_components(id), amount numeric(14,2) not null default 0, effective_from date not null, effective_to date
);
create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, period_start date not null, period_end date not null, status text not null default 'draft', created_at timestamptz not null default now(), unique(company_id,period_start,period_end)
);
create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, period_id uuid not null references public.payroll_periods(id) on delete cascade, employee_id uuid not null references public.employees(id), earnings jsonb not null default '{}'::jsonb, deductions jsonb not null default '{}'::jsonb, gross numeric(14,2) not null default 0, net numeric(14,2) not null default 0, locked boolean not null default false, unique(period_id,employee_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, employee_id uuid not null references public.employees(id) on delete cascade,
  document_type text not null, file_name text not null, storage_path text not null, issued_on date, expires_on date, status text not null default 'valid', created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, company_id uuid not null references public.companies(id) on delete cascade, actor_id uuid references auth.users(id), action text not null, entity_type text not null, entity_id text, old_data jsonb, new_data jsonb, metadata jsonb, created_at timestamptz not null default now()
);

create or replace function public.current_company_id() returns uuid language sql stable security definer set search_path=public as $$ select company_id from public.profiles where id=auth.uid() and active=true limit 1 $$;
create or replace function public.current_role() returns text language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() and active=true limit 1 $$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.branches enable row level security;
alter table public.employees enable row level security;
alter table public.transaction_definitions enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_steps enable row level security;
alter table public.transaction_actions enable row level security;
alter table public.transaction_comments enable row level security;
alter table public.transaction_attachments enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.salary_components enable row level security;
alter table public.employee_salary_components enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payroll_items enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

-- Tenant isolation: authenticated users can only see rows belonging to their company.
-- For tables that do not expose company_id directly, access is chained through the parent transaction.
do $$ declare t text; begin
  foreach t in array array['companies','profiles','departments','branches','employees','transaction_definitions','transactions','transaction_steps','transaction_actions','transaction_comments','transaction_attachments','leave_types','leave_balances','leave_requests','salary_components','employee_salary_components','payroll_periods','payroll_items','documents','audit_logs'] loop
    execute format('drop policy if exists tenant_select on public.%I',t);
  end loop;
end $$;

create policy tenant_select on public.companies for select using (id=public.current_company_id());
create policy tenant_select on public.profiles for select using (company_id=public.current_company_id());
create policy tenant_select on public.departments for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.branches for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.employees for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.transaction_definitions for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.transactions for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.transaction_steps for all using (exists(select 1 from public.transactions t where t.id=transaction_id and t.company_id=public.current_company_id()));
create policy tenant_select on public.transaction_actions for all using (exists(select 1 from public.transactions t where t.id=transaction_id and t.company_id=public.current_company_id()));
create policy tenant_select on public.transaction_comments for all using (exists(select 1 from public.transactions t where t.id=transaction_id and t.company_id=public.current_company_id()));
create policy tenant_select on public.transaction_attachments for all using (exists(select 1 from public.transactions t where t.id=transaction_id and t.company_id=public.current_company_id()));
create policy tenant_select on public.leave_types for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.leave_balances for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.leave_requests for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.salary_components for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.employee_salary_components for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.payroll_periods for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.payroll_items for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.documents for all using (company_id=public.current_company_id()) with check(company_id=public.current_company_id());
create policy tenant_select on public.audit_logs for select using (company_id=public.current_company_id());

-- Writes to audit_logs should be performed by trusted server-side functions, not ordinary clients.
create index if not exists idx_employees_company on public.employees(company_id);
create index if not exists idx_transactions_company_status on public.transactions(company_id,status);
create index if not exists idx_audit_company_time on public.audit_logs(company_id,created_at desc);
create index if not exists idx_documents_expiry on public.documents(company_id,expires_on);
