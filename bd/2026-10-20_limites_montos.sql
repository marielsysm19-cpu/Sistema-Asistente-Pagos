-- =====================================================
-- LÍMITES DE MONTOS DEL PMV
-- Mínimo: S/ 0.01
-- Máximo: S/ 9,999,999,999.99
-- Máximo 2 decimales por numeric(12,2)
-- =====================================================

-- Obligaciones
alter table public.obligaciones
drop constraint if exists obligaciones_monto_check;

alter table public.obligaciones
add constraint obligaciones_monto_check
check (monto >= 0.01 and monto <= 9999999999.99);

-- Capital del préstamo
alter table public.obligaciones
drop constraint if exists obligaciones_prestamo_capital_total_check;

alter table public.obligaciones
add constraint obligaciones_prestamo_capital_total_check
check (
  prestamo_capital_total is null
  or (prestamo_capital_total >= 0.01 and prestamo_capital_total <= 9999999999.99)
);

-- Recargos tributarios
alter table public.obligaciones
drop constraint if exists obligaciones_impuesto_recargo_check;

alter table public.obligaciones
add constraint obligaciones_impuesto_recargo_check
check (impuesto_recargo >= 0 and impuesto_recargo <= 9999999999.99);

-- Monto declarado en comprobante
alter table public.comprobantes
drop constraint if exists comprobantes_monto_pagado_check;

alter table public.comprobantes
add constraint comprobantes_monto_pagado_check
check (
  monto_pagado is null
  or (monto_pagado >= 0.01 and monto_pagado <= 9999999999.99)
);
