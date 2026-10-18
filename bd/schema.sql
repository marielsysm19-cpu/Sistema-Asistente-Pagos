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
        check (monto > 0),

    fecha_vencimiento date not null,

    -- NULL mientras no se haya registrado el pago.
    fecha_pago date null,

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

    fecha_carga timestamptz not null default now(),

    usuario_que_registro uuid not null
        references public.profiles(id)
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

grant select, insert
on public.comprobantes
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