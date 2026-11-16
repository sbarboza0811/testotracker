-- MeuCuidado · esquema isolado por prefixo dentro do Supabase testotrack
-- SOMENTE cria tabelas com prefixo meucuidado_. NÃO altera tabelas do TestoTracker.
-- Rode com uma conta autorizada no SQL Editor do projeto (projeto correto: efcjhktuihnldrddrtat).
-- Ative RLS por usuário antes de usar dados reais de saúde.

begin;

create table if not exists public.meucuidado_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  area text not null default 'Outros',
  status text not null default 'ideia' check (status in ('ideia','pesquisando','avaliacao','tratamento','concluido','pausado')),
  priority text not null default 'media' check (priority in ('alta','media','baixa')),
  specialty text,
  target_date date,
  estimated_cost numeric(12,2) not null default 0 check (estimated_cost >= 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meucuidado_plans_owner_id_uq unique (user_id,id)
);

create table if not exists public.meucuidado_appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid,
  date_time timestamptz not null,
  status text not null default 'agendado' check (status in ('agendado','realizado','cancelado')),
  professional text,
  clinic text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meucuidado_appt_owned_plan_fk foreign key (user_id, plan_id)
    references public.meucuidado_plans (user_id, id) on delete cascade
);

create table if not exists public.meucuidado_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid,
  date date not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'previsto' check (status in ('previsto','pago')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meucuidado_exp_owned_plan_fk foreign key (user_id, plan_id)
    references public.meucuidado_plans (user_id, id) on delete cascade
);

create table if not exists public.meucuidado_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid,
  date date not null,
  kind text not null default 'outro' check (kind in ('consulta','exame','foto','documento','outro')),
  title text not null,
  notes text,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meucuidado_record_owned_plan_fk foreign key (user_id, plan_id)
    references public.meucuidado_plans (user_id, id) on delete cascade
);

create index if not exists meucuidado_plans_owner_idx on public.meucuidado_plans(user_id,status);
create index if not exists meucuidado_appt_owner_idx on public.meucuidado_appointments(user_id,date_time);
create index if not exists meucuidado_exp_owner_idx on public.meucuidado_expenses(user_id,date);
create index if not exists meucuidado_record_owner_idx on public.meucuidado_records(user_id,date);

alter table public.meucuidado_plans enable row level security;
alter table public.meucuidado_appointments enable row level security;
alter table public.meucuidado_expenses enable row level security;
alter table public.meucuidado_records enable row level security;

-- Protege a Data API. Só usuários autenticados podem alcançar as tabelas do app.
revoke all on table public.meucuidado_plans,public.meucuidado_appointments,
  public.meucuidado_expenses,public.meucuidado_records from anon,public;
grant select,insert,update,delete on table public.meucuidado_plans,
  public.meucuidado_appointments,public.meucuidado_expenses,
  public.meucuidado_records to authenticated;

-- Cada tabela tem SELECT/INSERT/UPDATE/DELETE restritos a auth.uid().
-- O loop a seguir altera EXCLUSIVAMENTE tabelas meucuidado_.
do $$
declare target text;
begin
  foreach target in array array['meucuidado_plans','meucuidado_appointments','meucuidado_expenses','meucuidado_records'] loop
    execute format('drop policy if exists mc_select_own on public.%I', target);
    execute format('drop policy if exists mc_insert_own on public.%I', target);
    execute format('drop policy if exists mc_update_own on public.%I', target);
    execute format('drop policy if exists mc_delete_own on public.%I', target);
    execute format('create policy mc_select_own on public.%I for select to authenticated using (user_id = (select auth.uid()))', target);
    execute format('create policy mc_insert_own on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', target);
    execute format('create policy mc_update_own on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', target);
    execute format('create policy mc_delete_own on public.%I for delete to authenticated using (user_id = (select auth.uid()))', target);
  end loop;
end;
$$;

commit;

-- Verificação opcional: deve retornar exatamente 4 linhas com rowsecurity = true.
select schemaname,tablename,rowsecurity
from pg_tables
where schemaname='public' and tablename like 'meucuidado_%'
order by tablename;