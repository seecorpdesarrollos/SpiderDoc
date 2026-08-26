-- ===========================================================================
-- Spiderjad Docs — migración 05: ventanas de trámite por documento y país
-- Ejecutar entero en: Supabase > SQL Editor > New query > Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- POR QUÉ EXISTE ESTA MIGRACIÓN
-- ---------------------------------------------------------------------------
-- Hasta ahora la antelación de los avisos era una preferencia del usuario:
-- elegía 3, 6 o 9 meses a ojo y la aplicación obedecía.
--
-- Eso está mal, y el caso que lo destapó fue este: un pasaporte argentino con
-- 63 días por delante. El consulado tarda unos 90 días en entregarlo, más las
-- semanas de conseguir cita. Ya era tarde. Y la aplicación decía "todavía
-- falta bastante".
--
-- El usuario no tiene por qué saber cuánto tarda cada consulado. Es
-- exactamente lo que la aplicación debería saber por él — y es la razón por la
-- que este producto existe, porque ninguna app de un solo país puede saberlo.
--
-- A partir de aquí la antelación sale del PAR documento+país. La preferencia
-- del usuario pasa a ser un MÍNIMO: "avisame al menos con X, pero si este
-- documento necesita más, avisame antes".
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. EL PAÍS EMISOR DEL DOCUMENTO
-- ---------------------------------------------------------------------------
-- El OCR ya lo lee y lo devuelve en issuing_country desde hace semanas. Se
-- estaba tirando a la basura porque la tabla no tenía dónde guardarlo. Es
-- justo la mitad de la clave que hace falta para cruzar con el catálogo.
alter table public.documents
  add column if not exists issuing_country text;

comment on column public.documents.issuing_country is
  'Código ISO de 3 letras del país emisor (ESP, ITA, ARG...). Null si no se pudo determinar.';


-- ---------------------------------------------------------------------------
-- 2. EL CATÁLOGO DE VENTANAS
-- ---------------------------------------------------------------------------
-- Una fila por combinación de tipo de documento y país emisor.
--
-- country = '*' es el comodín: se usa cuando no hay fila específica para ese
-- país. Permite decir "un pasaporte, sea de donde sea, avisa con 6 meses" sin
-- tener que enumerar los 195 países.
--
-- Dos números distintos y no hay que confundirlos:
--
--   meses_aviso   Con cuánta antelación hay que EMPEZAR a avisar. Manda sobre
--                 la preferencia del usuario si es mayor.
--   dias_tramite  Cuánto tarda el trámite de principio a fin. Es lo que
--                 permite decirle a alguien "ya vas tarde" con un número
--                 detrás, en vez de un color.
create table if not exists public.renewal_windows (
  document_type text     not null,
  country       text     not null default '*',
  meses_aviso   smallint not null,
  dias_tramite  smallint,
  nota          text,
  fuente        text,
  verificado    boolean  not null default false,
  primary key (document_type, country)
);

alter table public.renewal_windows enable row level security;

-- El catálogo es conocimiento del producto, no datos de nadie: cualquier
-- usuario autenticado puede leerlo. Escribir, nadie desde la aplicación.
drop policy if exists "ventanas_lectura" on public.renewal_windows;
create policy "ventanas_lectura"
  on public.renewal_windows for select
  to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- 3. LO QUE SABEMOS DE PRIMERA MANO
-- ---------------------------------------------------------------------------
-- ATENCIÓN: 'verificado' distingue lo comprobado en fuente oficial de lo que
-- viene de experiencia propia o de una búsqueda sin confirmar. Es una columna
-- honesta a propósito: este catálogo va a decirle a gente cuándo tramitar sus
-- documentos de identidad, y afirmar de más aquí tiene consecuencias reales.
--
-- Antes de vender esto, cada fila con verificado = false hay que confirmarla
-- en la web del consulado correspondiente.
insert into public.renewal_windows
  (document_type, country, meses_aviso, dias_tramite, nota, fuente, verificado)
values
  -- Italia: el consulado no acepta la renovación antes de los 6 meses, así
  -- que avisar antes no sirve de nada — pero avisar el primer día que SÍ se
  -- puede es exactamente el valor del producto.
  ('passport', 'ITA', 6, 60,
   'El consulado italiano no acepta renovar el pasaporte hasta 6 meses antes de la caducidad. Pedí cita en cuanto se abra la ventana.',
   'Consulado General de Italia en Barcelona', false),

  -- Argentina: el problema no es cuándo se puede, es cuánto tarda.
  ('passport', 'ARG', 9, 90,
   'El consulado argentino tarda unos 90 días en entregar el documento, y las citas se liberan los miércoles solo para la semana siguiente.',
   'Cancillería argentina', false),
  ('dni', 'ARG', 9, 90,
   'Mismo circuito que el pasaporte: unos 90 días desde que se hace el trámite.',
   'Cancillería argentina', false),

  -- España: trámite rápido si se hace en España.
  ('dni', 'ESP', 3, 1,
   'El DNI español se renueva en el día con cita previa. Con 3 meses vas sobrado.',
   'Policía Nacional', false),
  ('passport', 'ESP', 3, 1,
   'El pasaporte español se entrega en el momento con cita previa.',
   'Policía Nacional', false),
  ('driving_license', 'ESP', 3, 30,
   'Renovación en centro de reconocimiento de conductores; el permiso provisional es inmediato.',
   'DGT', false),

  -- La TIE es el caso más duro y el más común entre extranjeros en España.
  ('residence_card', 'ESP', 9, 150,
   'La ley da 30 días hábiles para la toma de huellas, pero la espera real de cita en Madrid, Barcelona y Valencia es de 3 a 6 meses.',
   'Experiencia recogida en el trabajo de campo', false),

  -- Comodines: cualquier documento del que no tengamos ficha concreta.
  ('passport', '*', 6, 60,
   'Muchos consulados no aceptan la renovación hasta 6 meses antes.', null, false),
  ('residence_card', '*', 9, 120,
   'Los trámites de residencia suelen ser los más lentos.', null, false),
  ('dni', '*', 3, 30, null, null, false),
  ('driving_license', '*', 3, 30, null, null, false),
  ('vehicle_itv', '*', 2, 1,
   'La ITV se pasa en el día, sin cita en muchos talleres.', null, false),
  ('health_card', '*', 2, 15, null, null, false),
  ('insurance', '*', 2, 7, null, null, false),
  ('other', '*', 3, 30, null, null, false)
on conflict (document_type, country) do update set
  meses_aviso  = excluded.meses_aviso,
  dias_tramite = excluded.dias_tramite,
  nota         = excluded.nota,
  fuente       = excluded.fuente,
  verificado   = excluded.verificado;


-- ---------------------------------------------------------------------------
-- 4. LA VENTANA QUE LE TOCA A UN DOCUMENTO
-- ---------------------------------------------------------------------------
-- Busca primero la ficha exacta del país y, si no hay, cae al comodín. Si
-- tampoco hay comodín, devuelve nada y el sistema se queda con la preferencia
-- del usuario, que es el comportamiento de antes.
create or replace function public.window_for(
  p_document_type text,
  p_country       text
)
returns table (
  meses_aviso  smallint,
  dias_tramite smallint,
  nota         text,
  verificado   boolean
)
language sql
stable
set search_path = public
as $$
  select w.meses_aviso, w.dias_tramite, w.nota, w.verificado
  from public.renewal_windows w
  where w.document_type = p_document_type
    and w.country in (coalesce(p_country, '*'), '*')
  -- El país concreto gana al comodín.
  order by (w.country = '*') asc
  limit 1;
$$;

grant execute on function public.window_for(text, text) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 5. LOS AVISOS PASAN A USAR LA VENTANA
-- ---------------------------------------------------------------------------
-- Único cambio respecto a la versión anterior: la antelación de cada documento
-- ya no es p.lead_time_months a secas, sino el MAYOR entre la preferencia del
-- usuario y lo que pide ese documento en concreto.
--
-- Así, alguien que eligió 3 meses y tiene un pasaporte argentino recibe su
-- aviso a los 9, porque ese documento lo necesita. Y alguien que eligió 12 los
-- recibe a los 12 aunque el catálogo diga 6: su preferencia es un mínimo, no
-- un techo.
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
  with docs as (
    select
      d.id,
      p.email,
      d.title,
      d.document_type,
      d.expiry_date,
      (d.expiry_date - current_date) as days_left,
      greatest(
        p.lead_time_months,
        coalesce((select w.meses_aviso from public.window_for(d.document_type, d.issuing_country) w), 0)
      )::smallint as lead
    from public.documents d
    join public.profiles p on p.id = d.user_id
    where p.email is not null
  ),
  hitos as (
    select
      docs.*,
      m.milestone
    from docs
    -- Mismo distinct que antes: con antelaciones cortas los tres escalones
    -- colapsan en el mismo número y el usuario recibiría emails repetidos.
    cross join lateral (
      select distinct milestone from (
        values
          (docs.lead),
          (greatest(docs.lead / 2, 1)::smallint),
          (1::smallint)
      ) as v(milestone)
    ) as m
  )
  select
    h.id,
    h.email,
    h.title,
    h.document_type,
    h.expiry_date,
    h.milestone,
    h.days_left
  from hitos h
  where
    h.expiry_date <= (current_date + (h.milestone || ' months')::interval)
    and h.days_left >= 0
    and not exists (
      select 1 from public.notifications_sent n
      where n.document_id = h.id
        and n.milestone   = h.milestone
    )
  order by h.days_left asc, h.milestone asc;
$$;

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
