# Guía rápida para validar la versión final

## 1. Actualizar Supabase

Si ya ejecutaste las migraciones anteriores, ejecuta ahora:

`bd/2026-10-20_reglas_finales_pmv.sql`

Si quieres empezar sin datos de prueba, después ejecuta `bd/RESET_DATOS_PRUEBA.sql` y vacía manualmente el bucket `comprobantes-pagos` en Supabase Storage.

## 2. Levantar el sistema

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
py -m http.server 5500
```

Abrir `http://localhost:5500` y hacer `Ctrl + F5`.

## 3. Nueva obligación

Como ASISTENTE:
- crear una obligación con fecha de hoy o futura;
- comprobar que una fecha anterior a hoy se rechaza;
- comprobar que la tabla ya no ofrece modificar vencimiento.

## 4. Préstamos

Prueba un pago único y un préstamo por cuotas. Si el contrato tiene mora, ingresa la tasa diaria. La mora aumenta automáticamente por cada día de atraso mientras la obligación siga sin pago aprobado.

## 5. Impuestos

El periodo tributario sí puede ser anterior. Ejemplo: periodo 2025 con vencimiento en 2026.

El sistema registra:
- monto del impuesto informado por la entidad;
- tipo de impuesto;
- periodo tributario;
- número de orden/código;
- recargos o intereses informados por la entidad.

El sistema no calcula el impuesto.

## 6. Medios de pago

- Yape: exactamente 8 dígitos numéricos.
- Tarjeta: código de autorización de máximo 20 caracteres; solo marca y últimos 4 dígitos de la tarjeta.
- Transferencia: referencia de máximo 30 caracteres y banco de origen.
- Efectivo: referencia/recibo opcional de máximo 30 caracteres.
- Otro: comprobante obligatorio.

No existe pasarela: estos datos registran el medio utilizado fuera del sistema.

## 7. Verificación del comprobante

El asistente registra el pago y adjunta el comprobante. La obligación todavía queda PENDIENTE o VENCIDA y el comprobante queda PENDIENTE DE VERIFICACIÓN.

El GERENTE puede:
- aprobar: la obligación pasa a PAGADO;
- rechazar: la obligación sigue PENDIENTE/VENCIDA y se guarda el motivo.

Después de un rechazo, el asistente usa `Corregir pago`; el comprobante rechazado se conserva en el historial.

## 8. Pruebas automatizadas

```powershell
cd backend
npm test
```

El resultado esperado es `fail 0`.


## Límites monetarios
- Monto mínimo de una obligación/pago: S/ 0.01.
- Monto máximo: S/ 9,999,999,999.99.
- Máximo dos decimales.
- El capital de préstamos y los recargos de impuestos usan el mismo límite.
- El total del impuesto con recargos y el total calculado del préstamo también se validan contra ese máximo.
- Si la BD ya existía, ejecutar `bd/2026-10-20_limites_montos.sql`.
