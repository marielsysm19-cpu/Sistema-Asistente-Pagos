-- =====================================================
-- REINICIAR DATOS DE PRUEBA DEL PMV
-- ADVERTENCIA: elimina obligaciones y sus comprobantes/historial de BD.
-- NO elimina usuarios de Auth ni profiles.
-- Ejecutar solo si quieres empezar las pruebas desde cero.
-- =====================================================

delete from public.obligaciones;

-- comprobantes y comprobantes_historial se eliminan por ON DELETE CASCADE.
-- Los archivos físicos del bucket Storage "comprobantes-pagos" deben
-- eliminarse desde Supabase > Storage > comprobantes-pagos > seleccionar > Delete.
