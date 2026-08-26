-- ===========================================================================
-- Spiderjad Docs — migración 03: notificaciones push
-- Ejecutar entero en: Supabase > SQL Editor > New query > Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. SUSCRIPCIONES PUSH
-- ---------------------------------------------------------------------------
-- Cada navegador donde el usuario acepta los avisos deja aquí una suscripción.
-- Una persona puede tener varias: el móvil, el portátil, la tablet. Todas
-- reciben el aviso.
--
-- El endpoint es la dirección que da el navegador para empujarle mensajes, y
-- es única por dispositivo: por eso es la clave primaria. Si el mismo
-- navegador se vuelve a suscribir, se actualiza en vez de duplicarse.
--
-- p256dh y auth son las claves con las que se cifra el contenido del aviso.
-- Ni el servicio de push de Google o Apple puede leer lo que mandamos: solo
-- el navegador que tiene la clave privada. Eso importa aquí, porque el texto
-- del aviso dice qué documento tenés y cuándo caduca.
create table if not exists public.push_subscriptions (
  endpoint   text        primary key,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  p256dh     text        not null,
  auth       text        not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- El usuario gestiona las suyas y solo las suyas.
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 2. A QUÉ DISPOSITIVOS HAY QUE EMPUJAR UN AVISO
-- ---------------------------------------------------------------------------
-- Misma decisión que con pending_notifications(): el cron necesita leer
-- suscripciones de todos los usuarios y RLS lo impide. En vez de dejarle vía
-- libre, esta función devuelve SOLO lo imprescindible para empujar un mensaje
-- a un documento concreto — nunca rutas de archivo, nunca datos de otros
-- documentos.
create or replace function public.push_targets(p_document_id uuid)
returns table (
  endpoint text,
  p256dh   text,
  auth     text
)
language sql
security definer
set search_path = public
as $$
  select s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  join public.documents d on d.user_id = s.user_id
  where d.id = p_document_id;
$$;

grant execute on function public.push_targets(uuid) to service_role;

do $$
begin
  revoke all on function public.push_targets(uuid) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.push_targets(uuid) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.push_targets(uuid) from authenticated;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 3. BORRAR UNA SUSCRIPCIÓN MUERTA
-- ---------------------------------------------------------------------------
-- Cuando alguien desinstala la app o revoca el permiso, el servicio de push
-- responde 404 o 410. Esa suscripción ya no vale para nada y hay que quitarla,
-- o el cron seguirá intentándolo cada día para siempre.
create or replace function public.push_forget(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

grant execute on function public.push_forget(text) to service_role;

do $$
begin
  revoke all on function public.push_forget(text) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.push_forget(text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.push_forget(text) from authenticated;
  end if;
end $$;
