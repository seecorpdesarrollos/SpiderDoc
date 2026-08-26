-- ===========================================================================
-- Spiderjad Docs — migración 04: recalcular avisos al cambiar la fecha
-- Ejecutar entero en: Supabase > SQL Editor > New query > Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- EL PROBLEMA QUE ARREGLA
-- ---------------------------------------------------------------------------
-- notifications_sent recuerda "de este documento, a seis meses, ya se avisó".
-- Eso es lo correcto mientras la fecha no cambie. Pero cuando cambia, esa
-- memoria pasa a ser mentira.
--
-- El caso real, y es el peor posible:
--
--   1. Tenés el pasaporte caducando en marzo. Te llegan los avisos.
--   2. Lo renovás. Actualizás la fecha en la app: ahora caduca en 2036.
--   3. En 2035, cuando de verdad hace falta el aviso, NO LLEGA — porque los
--      escalones de ese documento constan como avisados desde 2026.
--
-- Es decir: el producto falla justo la segunda vez que lo necesitás, nueve
-- años después, y sin que nadie pueda darse cuenta hasta que ya es tarde.
--
-- La solución es que cambiar la fecha borre la memoria de avisos de ese
-- documento. Vuelve a estar "sin avisar" y los escalones se recorren de nuevo
-- desde cero con la fecha nueva.
--
-- Solo cuando cambia la FECHA. Cambiar el título o el tipo no toca nada: no
-- altera cuándo hay que avisar.
-- ---------------------------------------------------------------------------

create or replace function public.reset_notifications_on_expiry_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications_sent
  where document_id = new.id;
  return new;
end;
$$;

drop trigger if exists documents_reset_notifications on public.documents;
create trigger documents_reset_notifications
  after update of expiry_date on public.documents
  for each row
  -- distinct from y no <>: si algún día la fecha admitiera null, "<>" daría
  -- null y el trigger no saltaría. "is distinct from" trata null como un valor
  -- más y compara bien.
  when (old.expiry_date is distinct from new.expiry_date)
  execute function public.reset_notifications_on_expiry_change();
