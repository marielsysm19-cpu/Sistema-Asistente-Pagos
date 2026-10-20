-- =====================================================
-- AJUSTE FINAL: verificación del pago antes de marcar PAGADO
-- Ejecutar después de las migraciones anteriores.
-- Es segura para volver a ejecutar.
-- =====================================================

-- La fecha declarada por el asistente se conserva en el comprobante.
-- obligaciones.fecha_pago queda NULL hasta que el GERENTE apruebe.
alter table public.comprobantes
add column if not exists fecha_pago_declarada date;

alter table public.comprobantes_historial
add column if not exists fecha_pago_declarada date;

-- Corrige datos antiguos de prueba que estén pendientes/rechazados pero
-- hayan quedado marcados como pagados por la versión anterior.
update public.obligaciones o
set fecha_pago = null
where exists (
  select 1
  from public.comprobantes c
  where c.obligacion_id = o.id
    and c.estado_verificacion in ('PENDIENTE','RECHAZADO')
);
