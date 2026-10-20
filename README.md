# Sistema Asistente de Pagos — PMV

Sistema web para que un **ASISTENTE** controle las obligaciones de pago del negocio y un **GERENTE** supervise qué debe pagarse, qué ya fue pagado y si el comprobante presentado es válido.

## Alcance del PMV

Este PMV **no incluye una pasarela de pagos ni mueve dinero**. Yape, tarjeta, transferencia, efectivo u otro se registran como el medio por el cual se realizó el pago fuera del sistema. El sistema conserva fecha, monto, código de operación y comprobante.

### ASISTENTE
- Registrar obligaciones de Servicios, Impuestos, Proveedores y Préstamos.
- La fecha de vencimiento de una nueva obligación debe ser hoy o una fecha futura y no se modifica después de registrar la obligación.
- Consultar el mes actual y navegar por meses.
- Registrar el pago realizado y su medio.
- Adjuntar comprobante PDF/JPG/JPEG/PNG de máximo 5 MB.
- Corregir un comprobante cuando el gerente lo rechaza.

### GERENTE
- Consultar obligaciones y estados.
- Revisar comprobantes.
- **Aprobar o rechazar** el comprobante con un motivo.
- Si rechaza el comprobante, la obligación vuelve automáticamente a Pendiente/Vencido hasta que el asistente la corrija.

## Préstamos

Al elegir `Préstamos` se puede registrar:
- un solo pago; o
- un préstamo por cuotas con cronograma automático.

Para cuotas, la tasa indicada se interpreta como **tasa efectiva por periodo de cuota**. Si el contrato establece mora diaria, el sistema calcula dinámicamente:

`mora = monto de la cuota × tasa de mora diaria × días de atraso`

La mora no se guarda como un valor fijo: se recalcula cada vez que se consulta el sistema, por lo que aumenta día a día mientras la cuota siga vencida y sin pago.

## Impuestos

El sistema **no calcula impuestos**. Registra el monto determinado por SUNAT, SAT u otra entidad, además de:
- tipo de impuesto,
- periodo tributario (puede corresponder a un mes/año anterior),
- número de orden/código,
- recargo informado por la entidad (si existe),
- vencimiento y comprobante.

## Verificación de comprobantes

El sistema valida automáticamente:
- formato real del archivo,
- tamaño máximo,
- fecha de pago,
- monto declarado contra el total esperado,
- campos obligatorios del medio de pago,
- reutilización del código de operación en otra obligación,
- Yape: número de operación de exactamente 8 dígitos,
- Tarjeta: código de autorización de hasta 20 caracteres,
- Transferencia: referencia de hasta 30 caracteres,
- Efectivo: referencia opcional de hasta 30 caracteres.

Después, el gerente realiza la verificación humana:
- `PENDIENTE`
- `APROBADO`
- `RECHAZADO`

Los comprobantes rechazados quedan conservados en historial cuando el asistente presenta una corrección.

## Estados de la obligación

- `PAGADO`: existe fecha de pago registrada.
- `VENCIDO`: no está pagado y la fecha de vencimiento ya pasó.
- `PENDIENTE`: no está pagado y todavía no venció.

El estado no se selecciona manualmente.

## Base de datos

### Instalación nueva
Ejecutar en Supabase SQL Editor:

1. `bd/schema.sql`
2. `bd/storage_policies.sql`

### Si ya tenías la BD anterior
Ejecutar, en este orden:

1. `bd/2026-10-20_medios_pago.sql` (si aún no lo ejecutaste)
2. `bd/2026-10-20_validacion_prestamos_impuestos.sql`
3. `bd/2026-10-20_verificacion_final.sql`
4. `bd/2026-10-20_reglas_finales_pmv.sql`

## Backend

Crear `backend/.env` a partir de `.env.example` y usar tus propias variables de Supabase.

```bash
cd backend
npm install
npm run dev
```

Pruebas:

```bash
npm test
```

## Frontend

```bash
cd frontend
py -m http.server 5500
```

Abrir `http://localhost:5500`.

## Validación funcional

Revisar `VALIDAR_CAMBIOS.md` para probar el flujo completo como Asistente y Gerente.


## Flujo final de verificación de pagos

El asistente registra el medio, monto, fecha declarada, código de operación y comprobante. Esto NO marca todavía la obligación como pagada. El gerente revisa el comprobante: al aprobarlo, se confirma `fecha_pago` y la obligación pasa a PAGADO; al rechazarlo, continúa PENDIENTE o VENCIDA y queda habilitada la corrección con historial.

Para bases ya migradas, ejecuta también `bd/2026-10-20_reglas_finales_pmv.sql`. Para reiniciar datos de prueba usa `bd/RESET_DATOS_PRUEBA.sql`.


## Límite de montos
Los importes del PMV aceptan desde S/ 0.01 hasta S/ 9,999,999,999.99 y máximo dos decimales. Para una base ya creada, ejecutar `bd/2026-10-20_limites_montos.sql` una sola vez.
