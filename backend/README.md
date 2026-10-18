# Backend — Contrato esperado

Esta carpeta está preparada para que el equipo implemente el backend sin cambiar el diseño del frontend.

## Recomendación

Mantener una API REST sencilla.

Base sugerida:
`http://localhost:3000/api`

## Endpoints mínimos

### Autenticación / sesión

`POST /api/auth/login`

Debe devolver el usuario autenticado y su rol:
- `GERENTE`
- `ASISTENTE`

La autorización real debe verificarse en backend.

---

### Listar pagos del mes

`GET /api/pagos?year=2026&month=10`

Respuesta sugerida:

```json
[
  {
    "id": "uuid",
    "provider": "Movistar",
    "concept": "Internet oficina",
    "category": "Servicios",
    "amount": 150,
    "dueDate": "2026-10-22",
    "paidDate": null,
    "status": "Pendiente",
    "receipt": null
  }
]
```

Regla:
- mostrar solo obligaciones del mes solicitado,
- ordenar por vencimiento ascendente.

---

### Registrar obligación

`POST /api/pagos`

Solo ASISTENTE.

Body:

```json
{
  "provider": "Movistar",
  "concept": "Internet oficina",
  "category": "Servicios",
  "amount": 150,
  "dueDate": "2026-10-22"
}
```

Al crearse:
- estado lógico inicial: Pendiente,
- NO ejecutar un pago real.

---

### Modificar fecha de vencimiento

`PATCH /api/pagos/:id/vencimiento`

Solo ASISTENTE.

Body:

```json
{
  "dueDate": "2026-10-25"
}
```

Debe persistir en BD.

---

### Registrar pago + comprobante

`POST /api/pagos/:id/registrar-pago`

Solo ASISTENTE.

`multipart/form-data`

Campos:
- `paidDate`
- `receipt`

Formatos esperados:
- PDF
- JPG / JPEG
- PNG

Debe:
1. validar archivo,
2. almacenar comprobante,
3. relacionarlo con la obligación,
4. registrar fecha de pago,
5. dejar la obligación como Pagada.

Si falla el archivo, NO marcar como Pagada.

---

### Obtener un pago

`GET /api/pagos/:id`

GERENTE y ASISTENTE.

---

### Ver comprobante

Puede resolverse como:

`GET /api/pagos/:id/comprobante`

o devolver una URL segura dentro del pago.

El GERENTE tiene permiso de lectura, no de modificación.

---

## Regla de estado

```text
SI existe un pago registrado correctamente:
    PAGADO
SINO SI fecha_vencimiento < fecha_actual:
    VENCIDO
SINO:
    PENDIENTE
```

No usar `En proceso`.

## Permisos

### ASISTENTE
Puede:
- crear obligación,
- cambiar vencimiento,
- registrar pago,
- adjuntar comprobante,
- consultar.

### GERENTE
Puede:
- consultar obligaciones,
- consultar estados,
- ver comprobantes.

No puede:
- crear,
- modificar vencimiento,
- registrar pago,
- adjuntar/reemplazar comprobantes.

Ocultar botones en frontend NO es suficiente.
El backend debe validar el rol.
