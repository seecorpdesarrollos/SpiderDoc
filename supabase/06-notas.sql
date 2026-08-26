-- ---------------------------------------------------------------------------
-- 06 · Las notas del catálogo son hechos, no instrucciones
-- ---------------------------------------------------------------------------
-- Motivo: la ficha del pasaporte italiano decía
--
--   "...no acepta renovar hasta 6 meses antes de la caducidad.
--    Pedí cita en cuanto se abra la ventana."
--
-- y ese segundo trozo se enseñaba también a 28 días de caducar, con la ventana
-- abierta desde hacía cinco meses. Un aviso que dice "vas tarde" y a
-- continuación "esperá a que se abra la ventana" no solo se contradice: la
-- parte tranquilizadora es la que la gente se queda.
--
-- La regla, de aquí en adelante: en `nota` va lo que es verdad SIEMPRE —el
-- plazo, el requisito, el día que se liberan las citas—. Lo que hay que hacer
-- lo dice la aplicación, que sí sabe cuántos días quedan (`accionSugerida()`
-- en src/lib/ventanas.ts).
--
-- Seguro de ejecutar más de una vez.

update public.renewal_windows
   set nota = 'El consulado italiano no acepta renovar el pasaporte hasta 6 meses antes de la caducidad.'
 where document_type = 'passport'
   and country = 'ITA';

-- El comodín tenía el mismo vicio en versión suave; se deja como hecho puro.
update public.renewal_windows
   set nota = 'Muchos consulados no aceptan la renovación hasta 6 meses antes de la caducidad.'
 where document_type = 'passport'
   and country = '*';

-- Comprobación: ninguna nota debería contener una instrucción con calendario.
-- Si esto devuelve filas, hay que reescribirlas como hecho.
select document_type, country, nota
  from public.renewal_windows
 where nota ilike '%pedí%'
    or nota ilike '%pide%'
    or nota ilike '%en cuanto%'
    or nota ilike '%esperá%';
