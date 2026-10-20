# Base de Datos

## Instalación nueva

Ejecutar en Supabase SQL Editor:

1. `schema.sql`
2. `storage_policies.sql`

`schema.sql` ya contiene medios de pago, préstamos, mora, impuestos, verificación e historial de comprobantes.

## Proyecto ya creado anteriormente

Si ya usabas la versión anterior:

1. Ejecuta `2026-10-20_medios_pago.sql` si todavía no lo hiciste.
2. Ejecuta `2026-10-20_validacion_prestamos_impuestos.sql`.

La segunda migración agrega:
- datos de préstamos y cronogramas,
- tasa de mora diaria,
- datos tributarios,
- monto pagado,
- estado de verificación del comprobante,
- motivo de rechazo,
- historial de comprobantes corregidos.

No se almacena número completo de tarjeta ni CVV.


## Ajuste final de verificación

Si ya ejecutaste las migraciones anteriores, ejecuta ahora:

`2026-10-20_verificacion_final.sql`

Esto hace que el pago solo se confirme cuando el GERENTE aprueba el comprobante.

Para iniciar las pruebas desde cero puedes ejecutar `RESET_DATOS_PRUEBA.sql`. Ese script conserva los usuarios de Auth y `profiles`, pero elimina obligaciones y registros relacionados. Vacía también manualmente el bucket `comprobantes-pagos` desde Supabase Storage.
