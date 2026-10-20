# Frontend

Interfaz del Sistema Asistente de Pagos conectada al backend real.

## Incluye

- Login real.
- Roles Asistente y Gerente.
- Consulta mensual de obligaciones.
- Estados Pendiente, Pagado y Vencido.
- Registro de obligaciones.
- Modificación de vencimiento mediante calendario.
- Registro de pago con Yape, tarjeta, transferencia u otro.
- Carga de comprobante.
- Consulta del comprobante desde Supabase Storage.

## Ejecutar

```bash
python -m http.server 5500
```

Abrir `http://localhost:5500`.

El backend debe estar ejecutándose en `http://localhost:3000`.
