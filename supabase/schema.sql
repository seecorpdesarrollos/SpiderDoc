-- ===========================================================================
-- Spiderjad Docs — esquema de base de datos
-- Ejecutar entero en: Supabase > SQL Editor > New query > Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Alta automática del perfil al registrarse un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. DOCUMENTS
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  document_type text not null default 'other',
  expiry_date   date not null,               -- CAMPO CRÍTICO
  file_path     text,                        -- ruta en Storage: <user_id>/<uuid>.<ext>
  notes         text,
  created_at    timestamptz not null default now()
);

-- El dashboard ordena siempre por caducidad más próxima.
create index if not exists documents_user_expiry_idx
  on public.documents (user_id, expiry_date asc);

alter table public.documents enable row level security;

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own"
  on public.documents for select
  using (auth.uid() = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own"
  on public.documents for insert
  with check (auth.uid() = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own"
  on public.documents for update
  using (auth.uid() = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own"
  on public.documents for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. LÍMITE DEL PLAN GRATUITO (5 documentos)
-- La API ya lo comprueba antes de insertar, pero este trigger es la red de
-- seguridad a nivel de base de datos: nadie se lo salta llamando a la API
-- de Supabase directamente.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_free_document_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  free_limit    constant integer := 5;
begin
  select count(*) into current_count
  from public.documents
  where user_id = new.user_id;

  if current_count >= free_limit then
    raise exception 'FREE_LIMIT_REACHED: límite del plan gratuito alcanzado (%/% documentos)',
      free_limit, free_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists documents_enforce_free_limit on public.documents;
create trigger documents_enforce_free_limit
  before insert on public.documents
  for each row execute function public.enforce_free_document_limit();

-- ---------------------------------------------------------------------------
-- 4. STORAGE — bucket privado "documents"
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Cada usuario solo toca su propia carpeta: documents/<user_id>/...
drop policy if exists "documents_storage_select_own" on storage.objects;
create policy "documents_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_insert_own" on storage.objects;
create policy "documents_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_delete_own" on storage.objects;
create policy "documents_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Listo. Siguiente paso: Authentication > Providers > Email > activar
-- "Enable email provider" y dejar "Confirm email" activado (magic link).
-- ---------------------------------------------------------------------------
