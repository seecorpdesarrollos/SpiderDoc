-- ===========================================================================
-- Spiderjad Docs — migración 02: motor de avisos
-- Ejecutar entero en: Supabase > SQL Editor > New query > Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- Añade tres cosas:
--   1. La antelación configurable por el usuario (lo que faltaba desde el día 1).
--   2. Un registro de avisos ya enviados, para no repetirse.
--   3. Una función que el cron usa para saber a quién avisar, sin darle
--      acceso a los documentos de nadie.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. ANTELACIÓN CONFIGURABLE
-- ---------------------------------------------------------------------------
-- Los meses de antelación con los que el usuario quiere el primer aviso.
-- Por defecto 6, que es cuando el consulado italiano abre la ventana de
-- renovación del pasaporte y cuando la espera de la TIE empieza a apretar.
-- Se permite de 1 a 24: por debajo de 1 el aviso no sirve de nada y por
-- encima de 24 el documento ni siquiera se puede renovar todavía.
alter table public.profiles
  add column if not exists lead_time_months smallint not null default 6;

alter table public.profiles
  drop constraint if exists profiles_lead_time_months_check;
alter table public.profiles
  add constraint profiles_lead_time_months_check
  check (lead_time_months between 1 and 24);


-- ---------------------------------------------------------------------------
-- 2. REGISTRO DE AVISOS ENVIADOS
-- ---------------------------------------------------------------------------
-- Sin esta tabla, un cron diario mandaría el mismo email todos los días
-- durante seis meses seguidos. La clave primaria compuesta es la que hace el
-- trabajo: (documento, hito) solo puede existir una vez.
--
-- "milestone" es en qué escalón se avisó, en meses de antelación. Guardamos
-- el escalón y no la fecha porque lo que hay que garantizar es "de este
-- documento, a seis meses, ya se avisó una vez" — aunque el cron se ejecute
-- dos veces, aunque se reinicie, aunque cambie la hora.
create table if not exists public.notifications_sent (
  document_id uuid        not null references public.documents (id) on delete cascade,
  milestone   smallint    not null,
  sent_at     timestamptz not null default now(),
  primary key (document_id, milestone)
);

alter table public.notifications_sent enable row level security;

-- El usuario puede ver qué avisos se le mandaron de sus documentos.
-- Nadie inserta desde el cliente: eso lo hace la función de abajo.
drop policy if exists "notifications_select_own" on public.notifications_sent;
create policy "notifications_select_own"
  on public.notifications_sent for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = notifications_sent.document_id
        and d.user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 3. QUÉ AVISOS TOCA MANDAR
-- ---------------------------------------------------------------------------
-- Aquí está la decisión de seguridad importante.
--
-- Un cron que manda emails necesita leer documentos de TODOS los usuarios, y
-- RLS lo impide justamente para eso. La salida fácil sería darle al cron la
-- service_role key, pero esa llave abre todo: los documentos de identidad de
-- todo el mundo y las imágenes escaneadas en el bucket.
--
-- En vez de eso, esta función es lo único con privilegios, y devuelve
-- exclusivamente lo que hace falta para redactar un email: a quién, qué
-- documento y cuándo caduca. NO devuelve file_path, así que ni siquiera por
-- error puede filtrar el acceso a una foto de un pasaporte.
--
-- Los hitos son tres: la antelación que eligió el usuario, la mitad de esa
-- antelación, y un mes antes. Con el valor por defecto salen 6, 3 y 1 meses.
create or replace function public.pending_notifications()
returns table (
  document_id   uuid,
  email         text,
  title         text,
  document_type text,
  expiry_date   date,
  milestone     smallint,
  days_left     integer
)
language sql
security definer
set search_path = public
as $$
  with hitos as (
    select
      d.id            as document_id,
      p.email         as email,
      d.title         as title,
      d.document_type as document_type,
      d.expiry_date   as expiry_date,
      (d.expiry_date - current_date) as days_left,
      m.milestone
    from public.documents d
    join public.profiles p on p.id = d.user_id
    -- DISTINCT no es decorativo. Con antelaciones cortas los tres escalones
    -- colapsan en el mismo número: con lead_time_months = 1 salen (1, 1, 1), y
    -- sin deduplicar el mismo documento aparecería tres veces y el usuario
    -- recibiría tres emails idénticos. Comprobado contra Postgres.
    cross join lateral (
      select distinct milestone from (
        values
          (p.lead_time_months),
          (greatest(p.lead_time_months / 2, 1)::smallint),
          (1::smallint)
      ) as v(milestone)
    ) as m
    where p.email is not null
  )
  select
    h.document_id,
    h.email,
    h.title,
    h.document_type,
    h.expiry_date,
    h.milestone,
    h.days_left
  from hitos h
  where
    -- Ya entró en el escalón...
    h.expiry_date <= (current_date + (h.milestone || ' months')::interval)
    -- ...pero todavía no ha caducado. De un documento caducado no se avisa:
    -- el usuario ya lo ve en rojo en el panel y un email no aporta nada.
    and h.days_left >= 0
    -- ...y no se avisó antes de este mismo escalón.
    and not exists (
      select 1 from public.notifications_sent n
      where n.document_id = h.document_id
        and n.milestone   = h.milestone
    )
  -- Si un documento cae en varios escalones a la vez (por ejemplo, se sube
  -- cuando ya faltan tres semanas), se manda solo el más urgente y los otros
  -- se marcan como enviados desde el código. Un email, no tres.
  order by h.days_left asc, h.milestone asc;
$$;

-- La función es SECURITY DEFINER: hay que asegurarse de que NO la pueda
-- llamar cualquiera desde el navegador con la clave anónima.
-- El cron SÍ tiene que poder llamarla: corre con la service_role key. Se
-- concede explícitamente en vez de confiar en los privilegios por defecto de
-- Supabase, que podrían cambiar.
grant execute on function public.pending_notifications() to service_role;

do $$
begin
  revoke all on function public.pending_notifications() from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.pending_notifications() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.pending_notifications() from authenticated;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 4. MARCAR UN AVISO COMO ENVIADO
-- ---------------------------------------------------------------------------
-- Se llama justo después de que Resend confirme el envío. Si el email falla,
-- no se marca y se reintenta al día siguiente.
create or replace function public.mark_notification_sent(
  p_document_id uuid,
  p_milestone   smallint
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications_sent (document_id, milestone)
  values (p_document_id, p_milestone)
  on conflict (document_id, milestone) do nothing;
$$;

grant execute on function public.mark_notification_sent(uuid, smallint) to service_role;

do $$
begin
  revoke all on function public.mark_notification_sent(uuid, smallint) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.mark_notification_sent(uuid, smallint) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.mark_notification_sent(uuid, smallint) from authenticated;
  end if;
end $$;
