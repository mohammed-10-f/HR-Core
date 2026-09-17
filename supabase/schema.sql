-- HR Core production foundation
-- Run this in Supabase SQL Editor.
create extension if not exists "pgcrypto";

create type public.app_role as enum ('super_admin','hr_manager','hr_specialist','department_manager','employee');
create type public.employment_status as enum ('active','probation','leave','terminated');
create type public.transaction_status as enum ('draft','pending_manager','pending_hr','approved','rejected','completed');

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'employee',
  company_id uuid references public.companies(id),
  employee_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  parent_id uuid references public.departments(id),
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_no text not null,
  full_name text not null,
  job_title text,
  department_id uuid references public.departments(id),
  branch_id uuid references public.branches(id),
  nationality text,
  gender text,
  employment_status public.employment_status not null default 'active',
  hire_date date,
  birth_date date,
  phone text,
  email text,
  base_salary numeric(12,2) default 0,
  housing_allowance numeric(12,2) default 0,
  transport_allowance numeric(12,2) default 0,
  created_at timestamptz not null default now(),
  unique(company_id, employee_no)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  days numeric(6,2) not null,
  reason text,
  status public.transaction_status not null default 'pending_manager',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.employees(id),
  type text not null,
  status public.transaction_status not null default 'draft',
  priority text not null default 'normal',
  submitted_by uuid references auth.users(id),
  current_approver uuid references auth.users(id),
  due_at timestamptz,
  last_action text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  issue_date date,
  expiry_date date,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path=public
as $$ select company_id from public.profiles where id = auth.uid() $$;

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id = auth.uid() $$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.branches enable row level security;
alter table public.employees enable row level security;
alter table public.leave_requests enable row level security;
alter table public.transactions enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

-- Company isolation: users can only see records for their assigned company.
create policy "company access" on public.companies for select using (id = public.current_company_id());
create policy "profile self or superadmin" on public.profiles for select using (id = auth.uid() or public.current_role()='super_admin');

create policy "department company access" on public.departments for all using (company_id = public.current_company_id());
create policy "branch company access" on public.branches for all using (company_id = public.current_company_id());
create policy "employee company access" on public.employees for all using (
  company_id = public.current_company_id()
  and (
    public.current_role() in ('super_admin','hr_manager','hr_specialist')
    or id = (select employee_id from public.profiles where id=auth.uid())
    or (public.current_role()='department_manager' and department_id = (select department_id from public.employees e join public.profiles p on p.employee_id=e.id where p.id=auth.uid()))
  )
);
create policy "leave company access" on public.leave_requests for all using (
  company_id = public.current_company_id()
  and (
    public.current_role() in ('super_admin','hr_manager','hr_specialist','department_manager')
    or employee_id=(select employee_id from public.profiles where id=auth.uid())
  )
);
create policy "transaction company access" on public.transactions for all using (
  company_id = public.current_company_id()
  and (
    public.current_role() in ('super_admin','hr_manager','hr_specialist','department_manager')
    or employee_id=(select employee_id from public.profiles where id=auth.uid())
  )
);
create policy "document company access" on public.documents for all using (
  company_id = public.current_company_id()
  and (
    public.current_role() in ('super_admin','hr_manager','hr_specialist')
    or employee_id=(select employee_id from public.profiles where id=auth.uid())
  )
);
create policy "audit company access" on public.audit_logs for select using (company_id = public.current_company_id());

-- Auth trigger creates a minimal profile after signup; company/role can then be assigned by an admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Seed companies (safe demo seed; no personal data)
insert into public.companies(name,code)
values ('شركة النخبة للتجارة','ELITE'),('شركة مدار الطبية','MADAR'),('شركة حلول الأعمال','SOLUTIONS')
on conflict (code) do nothing;
