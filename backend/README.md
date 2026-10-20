# Backend

API REST del Sistema Asistente de Pagos.

Base local:

```text
http://localhost:3000/api
```

## Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/pagos?year=2026&month=10`
- `GET /api/pagos/:id`
- `POST /api/pagos`
- `PATCH /api/pagos/:id/vencimiento`
- `POST /api/pagos/:id/registrar-pago`
- `GET /api/pagos/:id/comprobante`

## Registrar pago

`POST /api/pagos/:id/registrar-pago`

Tipo: `multipart/form-data`

Campos:

```text
paidDate
metodoPago
pagadorNombre
codigoOperacion
tarjetaMarca
tarjetaUltimos4
bancoOrigen
receipt
```

`tarjetaMarca` y `tarjetaUltimos4` solo se usan cuando el método es `TARJETA`.
`bancoOrigen` solo se usa cuando el método es `TRANSFERENCIA`.

El archivo `receipt` acepta PDF, JPG/JPEG y PNG hasta 5 MB.

## Roles

### ASISTENTE
Puede crear y modificar obligaciones y registrar pagos/comprobantes.

### GERENTE
Puede consultar obligaciones, estados y comprobantes.

Los permisos se validan en backend y en las políticas RLS de Supabase.
