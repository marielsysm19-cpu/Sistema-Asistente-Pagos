-- =====================================================
-- REGLAS FINALES DEL PMV
-- Ejecutar después de las migraciones anteriores.
-- =====================================================

-- Valida en BD el formato de las referencias según el medio de pago.
alter table public.comprobantes
drop constraint if exists comprobantes_codigo_operacion_formato_check;

alter table public.comprobantes
add constraint comprobantes_codigo_operacion_formato_check check (
  (metodo_pago = 'YAPE' and codigo_operacion ~ '^[0-9]{8}$')
  or (metodo_pago = 'TARJETA' and codigo_operacion ~ '^[A-Za-z0-9-]{1,20}$')
  or (metodo_pago = 'TRANSFERENCIA' and codigo_operacion ~ '^[A-Za-z0-9-]{1,30}$')
  or (metodo_pago = 'EFECTIVO' and (codigo_operacion is null or codigo_operacion ~ '^[A-Za-z0-9-]{1,30}$'))
  or (metodo_pago = 'OTRO' and (codigo_operacion is null or char_length(codigo_operacion) <= 30))
) not valid;

-- La modificación del vencimiento se retiró del PMV.
-- No se agrega ninguna política o endpoint para editarlo.
-- La aplicación valida que nuevas obligaciones tengan fecha >= hoy.

-- NOT VALID permite aplicar esta migración aunque existan datos de prueba antiguos
-- que no cumplan el formato. Las operaciones nuevas/actualizadas sí quedan protegidas.
-- Después de limpiar los datos antiguos, opcionalmente puedes ejecutar:
-- alter table public.comprobantes validate constraint comprobantes_codigo_operacion_formato_check;
