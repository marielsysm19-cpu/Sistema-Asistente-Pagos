# Frontend

Diseño unificado del PMV.

## Incluye

- Menú mínimo: Inicio / Pagos.
- Vista mensual automática.
- Navegación mes anterior / siguiente / mes actual.
- Registro de obligación.
- Estados Pendiente / Pagado / Vencido.
- Cambio de fecha de vencimiento.
- Registro de pago realizado externamente.
- Carga de comprobante.
- Vista del comprobante.
- Diferencias entre Gerente y Asistente.
- Dashboard simple con Total / Pagado / Pendiente / Vencido.

## Modo actual

El frontend trabaja con `localStorage` para que el diseño sea totalmente demostrable
antes de conectar el backend.

Archivo de integración:
`js/api.js`

## Regla de diseño

No agregar:
- filtros avanzados,
- rango de fechas,
- exportación CSV,
- importaciones,
- integraciones,
- múltiples menús innecesarios.

Cualquier nueva pantalla debe conservar el mismo diseño visual.
