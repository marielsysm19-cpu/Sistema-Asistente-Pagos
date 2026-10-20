-- Ampliación de comprobantes para registrar el medio usado en el pago.
-- Ejecutar una sola vez sobre una BD creada con el esquema anterior.

alter table public.comprobantes
add column if not exists metodo_pago varchar(30) not null default 'OTRO';

alter table public.comprobantes
add column if not exists codigo_operacion varchar(100);

alter table public.comprobantes
add column if not exists pagador_nombre varchar(160);

alter table public.comprobantes
add column if not exists tarjeta_marca varchar(30);

alter table public.comprobantes
add column if not exists tarjeta_ultimos4 varchar(4);

alter table public.comprobantes
add column if not exists banco_origen varchar(120);

alter table public.comprobantes
drop constraint if exists comprobantes_metodo_pago_check;

alter table public.comprobantes
add constraint comprobantes_metodo_pago_check
check (metodo_pago in ('YAPE', 'TARJETA', 'TRANSFERENCIA', 'OTRO'));

alter table public.comprobantes
drop constraint if exists comprobantes_tarjeta_ultimos4_check;

alter table public.comprobantes
add constraint comprobantes_tarjeta_ultimos4_check
check (tarjeta_ultimos4 is null or tarjeta_ultimos4 ~ '^[0-9]{4}$');

create index if not exists idx_comprobantes_codigo_operacion
on public.comprobantes(codigo_operacion);
