# Base de Datos

Archivo principal:
`schema.sql`

## Entidades del PMV

### usuarios
Permite distinguir:
- GERENTE
- ASISTENTE

### obligaciones
Contiene:
- proveedor / entidad,
- concepto,
- categoría,
- monto,
- fecha de vencimiento,
- fecha de pago.

### comprobantes
Relaciona un archivo de comprobante con una obligación.

## Importante

No crear una base de datos distinta por Historia de Usuario.

Todas las HU deben trabajar sobre este modelo común.

El estado se recomienda calcular con:

```text
SI fecha_pago existe:
    PAGADO
SINO SI fecha_vencimiento < hoy:
    VENCIDO
SINO:
    PENDIENTE
```

Si el equipo utiliza PostgreSQL o MySQL, adaptar `AUTOINCREMENT` y los tipos según corresponda.
