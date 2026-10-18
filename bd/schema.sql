-- Sistema Asistente de Pagos
-- Esquema inicial del PMV
-- Ajustar tipos/sintaxis al motor elegido por el equipo.

CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('GERENTE', 'ASISTENTE')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE obligaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_entidad VARCHAR(160) NOT NULL,
    concepto VARCHAR(200) NOT NULL,
    categoria VARCHAR(30) NOT NULL CHECK (
        categoria IN ('Servicios', 'Impuestos', 'Proveedores', 'Préstamos')
    ),
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    fecha_vencimiento DATE NOT NULL,
    fecha_pago DATE NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

CREATE TABLE comprobantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    obligacion_id INTEGER NOT NULL UNIQUE,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    fecha_carga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_que_registro INTEGER NOT NULL,
    FOREIGN KEY (obligacion_id) REFERENCES obligaciones(id),
    FOREIGN KEY (usuario_que_registro) REFERENCES usuarios(id)
);

-- Índices útiles para la vista mensual
CREATE INDEX idx_obligaciones_fecha_vencimiento
ON obligaciones(fecha_vencimiento);

CREATE INDEX idx_obligaciones_fecha_pago
ON obligaciones(fecha_pago);

-- IMPORTANTE:
-- El estado NO necesita guardarse obligatoriamente como columna.
-- Puede calcularse:
-- 1) si fecha_pago IS NOT NULL => PAGADO
-- 2) si fecha_pago IS NULL y fecha_vencimiento < fecha actual => VENCIDO
-- 3) caso contrario => PENDIENTE
