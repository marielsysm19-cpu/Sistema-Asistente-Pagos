-- =====================================================
-- SISTEMA ASISTENTE DE PAGOS
-- SUPABASE / POSTGRESQL
-- SPRINT 1 - PMV
-- =====================================================

-- =====================================================
-- 1. PROFILES
-- Supabase Auth administra correo y contraseña.
-- Esta tabla contiene datos adicionales del usuario.
-- =====================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    nombre varchar(120) not null,
    rol varchar(20) not null
        check (rol in ('GERENTE', 'ASISTENTE')),
    created_at timestamptz not null default now()
);


-- =====================================================
-- 2. OBLIGACIONES
-- =====================================================

create table if not exists public.obligaciones (
    id uuid primary key default gen_random_uuid(),

    proveedor_entidad varchar(160) not null,
    concepto varchar(200) not null,

    categoria varchar(30) not null
        check (
            categoria in (
                'Servicios',
                'Impuestos',
                'Proveedores',
                'Préstamos'
            )
        ),

    monto numeric(12,2) not null
        check (monto >= 0.01 and monto <= 9999999999.99),

    fecha_vencimiento date not null,

    -- NULL mientras no se haya registrado el pago.
    fecha_pago date null,

    -- Datos opcionales para préstamos. La mora se calcula dinámicamente.
    prestamo_grupo_id uuid null,
    prestamo_modalidad varchar(20) null
        check (prestamo_modalidad is null or prestamo_modalidad in ('UNICO','CUOTAS')),
    prestamo_capital_total numeric(12,2) null
        check (prestamo_capital_total is null or (prestamo_capital_total >= 0.01 and prestamo_capital_total <= 9999999999.99)),
    prestamo_tasa_interes numeric(10,6) null,
    prestamo_numero_cuota integer null,
    prestamo_total_cuotas integer null,
    prestamo_periodicidad_pago varchar(20) null
        check (prestamo_periodicidad_pago is null or prestamo_periodicidad_pago in ('MENSUAL','QUINCENAL','SEMANAL')),
    prestamo_aplica_mora boolean not null default false,
    prestamo_tasa_mora_diaria numeric(10,6) not null default 0
        check (prestamo_tasa_mora_diaria >= 0 and prestamo_tasa_mora_diaria <= 10),

    -- Datos opcionales para impuestos. El monto lo informa SUNAT/SAT/entidad.
    impuesto_tipo varchar(120) null,
    impuesto_periodo varchar(80) null,
    impuesto_numero_orden varchar(120) null,
    impuesto_recargo numeric(12,2) not null default 0
        check (impuesto_recargo >= 0 and impuesto_recargo <= 9999999999.99),

    created_by uuid not null
        references public.profiles(id),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- =====================================================
-- 3. COMPROBANTES
-- El archivo real se almacena en Supabase Storage.
-- =====================================================

create table if not exists public.comprobantes (
    id uuid primary key default gen_random_uuid(),

    obligacion_id uuid not null unique
        references public.obligaciones(id)
        on delete cascade,

    storage_path text not null,
    nombre_archivo varchar(255) not null,
    tipo_mime varchar(100) not null,

    metodo_pago varchar(30) not null default 'OTRO'
        check (metodo_pago in ('YAPE', 'TARJETA', 'TRANSFERENCIA', 'EFECTIVO', 'OTRO')),
    codigo_operacion varchar(100) null,
    pagador_nombre varchar(160) null,
    tarjeta_marca varchar(30) null,
    tarjeta_ultimos4 varchar(4) null
        check (tarjeta_ultimos4 is null or tarjeta_ultimos4 ~ '^[0-9]{4}$'),
    banco_origen varchar(120) null,
    monto_pagado numeric(12,2) null
        check (monto_pagado is null or (monto_pagado >= 0.01 and monto_pagado <= 9999999999.99)),
    -- Fecha que declara el asistente al registrar la evidencia.
    -- Solo pasa a obligaciones.fecha_pago cuando el gerente aprueba.
    fecha_pago_declarada date null,

    estado_verificacion varchar(20) not null default 'PENDIENTE'
        check (estado_verificacion in ('PENDIENTE','APROBADO','RECHAZADO')),
    motivo_rechazo text null,
    verificado_por uuid null references public.profiles(id),
    fecha_verificacion timestamptz null,

    fecha_carga timestamptz not null default now(),

    usuario_que_registro uuid not null
        references public.profiles(id),

    constraint comprobantes_codigo_operacion_formato_check check (
      (metodo_pago = 'YAPE' and codigo_operacion ~ '^[0-9]{8}$')
      or (metodo_pago = 'TARJETA' and codigo_operacion ~ '^[A-Za-z0-9-]{1,20}$')
      or (metodo_pago = 'TRANSFERENCIA' and codigo_operacion ~ '^[A-Za-z0-9-]{1,30}$')
      or (metodo_pago = 'EFECTIVO' and (codigo_operacion is null or codigo_operacion ~ '^[A-Za-z0-9-]{1,30}$'))
      or (metodo_pago = 'OTRO' and (codigo_operacion is null or char_length(codigo_operacion) <= 30))
    )
);


-- =====================================================
-- 3B. HISTORIAL DE COMPROBANTES RECHAZADOS
-- Conserva trazabilidad cuando el asistente corrige evidencia.
-- =====================================================

create table if not exists public.comprobantes_historial (
    id uuid primary key default gen_random_uuid(),
    comprobante_id_original uuid null,
    obligacion_id uuid not null references public.obligaciones(id) on delete cascade,
    storage_path text not null,
    nombre_archivo varchar(255) not null,
    tipo_mime varchar(100) not null,
    metodo_pago varchar(30) null,
    codigo_operacion varchar(100) null,
    pagador_nombre varchar(160) null,
    monto_pagado numeric(12,2) null,
    fecha_pago_declarada date null,
    estado_verificacion varchar(20) null,
    motivo_rechazo text null,
    fecha_carga_original timestamptz null,
    archivado_at timestamptz not null default now()
);


-- =====================================================
-- 4. ÍNDICES
-- =====================================================

create index if not exists idx_obligaciones_fecha_vencimiento
on public.obligaciones(fecha_vencimiento);

create index if not exists idx_obligaciones_fecha_pago
on public.obligaciones(fecha_pago);

create index if not exists idx_comprobantes_obligacion
on public.comprobantes(obligacion_id);

create index if not exists idx_obligaciones_prestamo_grupo
on public.obligaciones(prestamo_grupo_id);

create index if not exists idx_comprobantes_estado_verificacion
on public.comprobantes(estado_verificacion);

create index if not exists idx_comprobantes_codigo_operacion
on public.comprobantes(codigo_operacion);

create index if not exists idx_comprobantes_historial_obligacion
on public.comprobantes_historial(obligacion_id);


-- =====================================================
-- 5. UPDATED_AT AUTOMÁTICO
-- =====================================================

create or replace function public.actualizar_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_obligaciones_updated_at
on public.obligaciones;

create trigger trg_obligaciones_updated_at
before update on public.obligaciones
for each row
execute function public.actualizar_updated_at();


-- =====================================================
-- 6. CREAR PROFILE AUTOMÁTICAMENTE
-- Cada usuario nuevo de Supabase Auth inicia como ASISTENTE.
-- El GERENTE se asigna posteriormente de forma administrativa.
-- =====================================================

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

    insert into public.profiles (
        id,
        nombre,
        rol
    )
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'nombre',
            split_part(new.email, '@', 1)
        ),
        'ASISTENTE'
    )
    on conflict (id) do nothing;

    return new;

end;
$$;

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.crear_perfil_nuevo_usuario();


-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

alter table public.profiles enable row level security;
alter table public.obligaciones enable row level security;
alter table public.comprobantes enable row level security;
alter table public.comprobantes_historial enable row level security;


-- =====================================================
-- 8. PERMISOS DATA API
-- No se conceden permisos a anon.
-- =====================================================

grant usage on schema public to authenticated;

grant select
on public.profiles
to authenticated;

grant select, insert, update
on public.obligaciones
to authenticated;

grant select, insert, update
on public.comprobantes
to authenticated;

grant select, insert
on public.comprobantes_historial
to authenticated;


-- =====================================================
-- 9. POLÍTICAS: PROFILES
-- =====================================================

drop policy if exists "Usuario puede consultar su perfil"
on public.profiles;

create policy "Usuario puede consultar su perfil"
on public.profiles
for select
to authenticated
using (
    id = auth.uid()
);


-- =====================================================
-- 10. POLÍTICAS: OBLIGACIONES
-- =====================================================

-- Gerente y Asistente pueden consultar.

drop policy if exists "Usuarios autenticados pueden consultar obligaciones"
on public.obligaciones;

create policy "Usuarios autenticados pueden consultar obligaciones"
on public.obligaciones
for select
to authenticated
using (true);


-- Solo ASISTENTE puede registrar.

drop policy if exists "Asistente puede registrar obligaciones"
on public.obligaciones;

create policy "Asistente puede registrar obligaciones"
on public.obligaciones
for insert
to authenticated
with check (

    created_by = auth.uid()

    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.rol = 'ASISTENTE'
    )

);


-- Solo ASISTENTE puede modificar.

drop policy if exists "Asistente puede modificar obligaciones"
on public.obligaciones;

create policy "Asistente puede modificar obligaciones"
on public.obligaciones
for update
to authenticated
using (

    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.rol = 'ASISTENTE'
    )

)
with check (

    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.rol = 'ASISTENTE'
    )

);


-- =====================================================
-- 11. POLÍTICAS: COMPROBANTES
-- =====================================================

-- Gerente y Asistente pueden consultar.

drop policy if exists "Usuarios autenticados pueden consultar comprobantes"
on public.comprobantes;

create policy "Usuarios autenticados pueden consultar comprobantes"
on public.comprobantes
for select
to authenticated
using (true);


-- Solo ASISTENTE puede registrar.

drop policy if exists "Asistente puede registrar comprobantes"
on public.comprobantes;

create policy "Asistente puede registrar comprobantes"
on public.comprobantes
for insert
to authenticated
with check (

    usuario_que_registro = auth.uid()

    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.rol = 'ASISTENTE'
    )

);


-- Gerente puede aprobar o rechazar comprobantes.

drop policy if exists "Gerente puede verificar comprobantes"
on public.comprobantes;

create policy "Gerente puede verificar comprobantes"
on public.comprobantes
for update
to authenticated
using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'GERENTE')
)
with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'GERENTE')
);

-- Asistente puede reemplazar únicamente un comprobante previamente rechazado.

drop policy if exists "Asistente puede corregir comprobante rechazado"
on public.comprobantes;

create policy "Asistente puede corregir comprobante rechazado"
on public.comprobantes
for update
to authenticated
using (
    estado_verificacion = 'RECHAZADO'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'ASISTENTE')
)
with check (
    estado_verificacion = 'PENDIENTE'
    and usuario_que_registro = auth.uid()
);

-- Historial visible a ambos roles; solo el asistente archiva al corregir.

drop policy if exists "Usuarios autenticados pueden consultar historial comprobantes"
on public.comprobantes_historial;
create policy "Usuarios autenticados pueden consultar historial comprobantes"
on public.comprobantes_historial for select to authenticated using (true);

drop policy if exists "Asistente puede archivar comprobantes rechazados"
on public.comprobantes_historial;
create policy "Asistente puede archivar comprobantes rechazados"
on public.comprobantes_historial for insert to authenticated
with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'ASISTENTE')
);


-- =====================================================
-- REGLA FUNCIONAL DEL ESTADO
-- =====================================================
--
-- SI fecha_pago IS NOT NULL:
--     PAGADO
--
-- SINO SI fecha_vencimiento < CURRENT_DATE:
--     VENCIDO
--
-- SINO:
--     PENDIENTE
--
-- El estado NO se modifica manualmente.
-- =====================================================