-- =====================================================
-- MIGRACIÓN PMV: préstamos, mora, impuestos y verificación
-- Ejecutar UNA VEZ después de 2026-10-20_medios_pago.sql
-- Es segura para volver a ejecutar en los ADD COLUMN / tablas.
-- =====================================================

-- 1) PRÉSTAMOS: datos del contrato y cronograma
alter table public.obligaciones add column if not exists prestamo_grupo_id uuid;
alter table public.obligaciones add column if not exists prestamo_modalidad varchar(20);
alter table public.obligaciones add column if not exists prestamo_capital_total numeric(12,2);
alter table public.obligaciones add column if not exists prestamo_tasa_interes numeric(10,6);
alter table public.obligaciones add column if not exists prestamo_numero_cuota integer;
alter table public.obligaciones add column if not exists prestamo_total_cuotas integer;
alter table public.obligaciones add column if not exists prestamo_periodicidad_pago varchar(20);
alter table public.obligaciones add column if not exists prestamo_aplica_mora boolean not null default false;
alter table public.obligaciones add column if not exists prestamo_tasa_mora_diaria numeric(10,6) not null default 0;

alter table public.obligaciones drop constraint if exists obligaciones_prestamo_modalidad_check;
alter table public.obligaciones add constraint obligaciones_prestamo_modalidad_check
check (prestamo_modalidad is null or prestamo_modalidad in ('UNICO','CUOTAS'));

alter table public.obligaciones drop constraint if exists obligaciones_prestamo_periodicidad_check;
alter table public.obligaciones add constraint obligaciones_prestamo_periodicidad_check
check (prestamo_periodicidad_pago is null or prestamo_periodicidad_pago in ('MENSUAL','QUINCENAL','SEMANAL'));

alter table public.obligaciones drop constraint if exists obligaciones_prestamo_mora_check;
alter table public.obligaciones add constraint obligaciones_prestamo_mora_check
check (prestamo_tasa_mora_diaria >= 0 and prestamo_tasa_mora_diaria <= 10);

-- 2) IMPUESTOS: el sistema NO calcula el tributo; registra lo informado por la entidad
alter table public.obligaciones add column if not exists impuesto_tipo varchar(120);
alter table public.obligaciones add column if not exists impuesto_periodo varchar(80);
alter table public.obligaciones add column if not exists impuesto_numero_orden varchar(120);
alter table public.obligaciones add column if not exists impuesto_recargo numeric(12,2) not null default 0;

alter table public.obligaciones drop constraint if exists obligaciones_impuesto_recargo_check;
alter table public.obligaciones add constraint obligaciones_impuesto_recargo_check
check (impuesto_recargo >= 0);

-- 3) COMPROBANTES: monto y verificación por gerente
alter table public.comprobantes add column if not exists monto_pagado numeric(12,2);
alter table public.comprobantes add column if not exists estado_verificacion varchar(20) not null default 'PENDIENTE';
alter table public.comprobantes add column if not exists motivo_rechazo text;
alter table public.comprobantes add column if not exists verificado_por uuid references public.profiles(id);
alter table public.comprobantes add column if not exists fecha_verificacion timestamptz;

alter table public.comprobantes drop constraint if exists comprobantes_estado_verificacion_check;
alter table public.comprobantes add constraint comprobantes_estado_verificacion_check
check (estado_verificacion in ('PENDIENTE','APROBADO','RECHAZADO'));

alter table public.comprobantes drop constraint if exists comprobantes_monto_pagado_check;
alter table public.comprobantes add constraint comprobantes_monto_pagado_check
check (monto_pagado is null or monto_pagado > 0);

-- Agregar EFECTIVO a métodos permitidos
alter table public.comprobantes drop constraint if exists comprobantes_metodo_pago_check;
alter table public.comprobantes add constraint comprobantes_metodo_pago_check
check (metodo_pago in ('YAPE','TARJETA','TRANSFERENCIA','EFECTIVO','OTRO'));

-- 4) HISTORIAL: conserva evidencia rechazada cuando el asistente la corrige
create table if not exists public.comprobantes_historial (
    id uuid primary key default gen_random_uuid(),
    comprobante_id_original uuid,
    obligacion_id uuid not null references public.obligaciones(id) on delete cascade,
    storage_path text not null,
    nombre_archivo varchar(255) not null,
    tipo_mime varchar(100) not null,
    metodo_pago varchar(30),
    codigo_operacion varchar(100),
    pagador_nombre varchar(160),
    monto_pagado numeric(12,2),
    estado_verificacion varchar(20),
    motivo_rechazo text,
    fecha_carga_original timestamptz,
    archivado_at timestamptz not null default now()
);

create index if not exists idx_obligaciones_prestamo_grupo on public.obligaciones(prestamo_grupo_id);
create index if not exists idx_comprobantes_estado_verificacion on public.comprobantes(estado_verificacion);
create index if not exists idx_comprobantes_historial_obligacion on public.comprobantes_historial(obligacion_id);
create index if not exists idx_comprobantes_codigo_operacion on public.comprobantes(codigo_operacion);

-- 5) PERMISOS / RLS
grant select, insert, update on public.comprobantes to authenticated;
grant select, insert on public.comprobantes_historial to authenticated;
alter table public.comprobantes_historial enable row level security;

drop policy if exists "Usuarios autenticados pueden consultar historial comprobantes" on public.comprobantes_historial;
create policy "Usuarios autenticados pueden consultar historial comprobantes"
on public.comprobantes_historial for select to authenticated using (true);

drop policy if exists "Asistente puede archivar comprobantes rechazados" on public.comprobantes_historial;
create policy "Asistente puede archivar comprobantes rechazados"
on public.comprobantes_historial for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = 'ASISTENTE'
  )
);

drop policy if exists "Gerente puede verificar comprobantes" on public.comprobantes;
create policy "Gerente puede verificar comprobantes"
on public.comprobantes for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'GERENTE')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'GERENTE')
);

drop policy if exists "Asistente puede corregir comprobante rechazado" on public.comprobantes;
create policy "Asistente puede corregir comprobante rechazado"
on public.comprobantes for update to authenticated
using (
  estado_verificacion = 'RECHAZADO'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'ASISTENTE')
)
with check (
  estado_verificacion = 'PENDIENTE'
  and usuario_que_registro = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'ASISTENTE')
);
