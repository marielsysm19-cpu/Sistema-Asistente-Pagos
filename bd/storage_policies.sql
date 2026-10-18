-- =====================================================
-- SUPABASE STORAGE
-- Bucket: comprobantes-pagos
-- =====================================================

-- El bucket debe ser PRIVADO.
--
-- MIME permitidos:
-- application/pdf
-- image/jpeg
-- image/png
--
-- Límite configurado en Supabase: 5 MB.


-- =====================================================
-- ASISTENTE PUEDE SUBIR
-- =====================================================

drop policy if exists "Asistente puede subir comprobantes"
on storage.objects;

create policy "Asistente puede subir comprobantes"
on storage.objects
for insert
to authenticated
with check (

    bucket_id = 'comprobantes-pagos'

    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.rol = 'ASISTENTE'
    )

);


-- =====================================================
-- GERENTE Y ASISTENTE PUEDEN VER
-- =====================================================

drop policy if exists "Usuarios autenticados pueden ver comprobantes"
on storage.objects;

create policy "Usuarios autenticados pueden ver comprobantes"
on storage.objects
for select
to authenticated
using (

    bucket_id = 'comprobantes-pagos'

    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.rol in ('GERENTE', 'ASISTENTE')
    )

);


-- =====================================================
-- IMPORTANTE
-- =====================================================
--
-- No existe política DELETE.
-- No existe política UPDATE.
--
-- En el PMV:
--
-- ASISTENTE
--   - puede subir comprobantes
--   - puede consultar comprobantes
--
-- GERENTE
--   - puede consultar comprobantes
--
-- NO AUTENTICADO
--   - no puede subir
--   - no puede consultar
--
-- =====================================================