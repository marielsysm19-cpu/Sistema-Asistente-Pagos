# Sistema Asistente de Pagos — PMV

Proyecto base para el Sprint 1 del PMV.

## Estructura

```text
Sistema-Asistente-Pagos/
├─ frontend/   # Diseño y comportamiento visual ya preparado
├─ backend/    # Contrato/API esperada para que el equipo implemente la lógica
└─ bd/         # Esquema SQL inicial compartido
```

## Objetivo del PMV

Permitir que el asistente:
- registre obligaciones,
- vea pagos mes a mes,
- cambie fechas de vencimiento,
- registre pagos realizados externamente,
- adjunte comprobantes.

Permitir que el gerente:
- vea el estado de los pagos,
- revise comprobantes,
- consulte el mes actual y otros meses.

## Importante

El frontend funciona actualmente con un modo MOCK usando `localStorage`.
Esto permite que todo el equipo vea exactamente el mismo diseño antes de conectar el backend.

Cuando el backend esté listo, cambiar en:

`frontend/js/api.js`

```js
const USE_MOCK_API = true;
```

a:

```js
const USE_MOCK_API = false;
```

y completar las rutas indicadas en `backend/README.md`.

## Ejecutar el frontend

Opción rápida:
- abrir `frontend/index.html` en el navegador.

Opción recomendada:
```bash
cd frontend
python -m http.server 5500
```

Luego abrir:
`http://localhost:5500`

## Roles de demostración

Al abrir por primera vez se puede elegir:
- Asistente
- Gerente

El selector de perfil solo existe para facilitar la demo mientras no haya autenticación real.

## Alcance del Sprint 1

Incluye:
- HU01 Registrar obligación
- HU02 Visualizar pagos del mes
- HU03 Modificar fecha de vencimiento
- HU04 Registrar pago y comprobante
- HU05 Consultar estado de pagos
- HU06 Revisar comprobantes
- TT01 Roles Gerente / Asistente

No incluye pagos reales ni integraciones bancarias.
