const REDONDEO = valor => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

export function fechaISOHoy() {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function diasAtraso(fechaVencimiento, fechaReferencia = fechaISOHoy()) {
  if (!fechaVencimiento || !fechaReferencia || fechaReferencia <= fechaVencimiento) return 0;
  const venc = new Date(`${fechaVencimiento}T00:00:00Z`);
  const ref = new Date(`${fechaReferencia}T00:00:00Z`);
  const dias = Math.floor((ref - venc) / 86400000);
  return Math.max(0, dias);
}

export function calcularMoraPrestamo(obligacion, fechaReferencia = fechaISOHoy()) {
  if (!obligacion || obligacion.categoria !== "Préstamos") return 0;
  if (!obligacion.prestamo_aplica_mora) return 0;
  if (obligacion.fecha_pago) return 0;

  const tasa = Number(obligacion.prestamo_tasa_mora_diaria || 0);
  const monto = Number(obligacion.monto || 0);
  const dias = diasAtraso(obligacion.fecha_vencimiento, fechaReferencia);

  if (tasa <= 0 || monto <= 0 || dias <= 0) return 0;
  return REDONDEO(monto * (tasa / 100) * dias);
}

export function calcularTotalActual(obligacion, fechaReferencia = fechaISOHoy()) {
  const base = Number(obligacion?.monto || 0);
  const recargoImpuesto = obligacion?.categoria === "Impuestos"
    ? Number(obligacion.impuesto_recargo || 0)
    : 0;

  let mora = 0;
  if (obligacion?.categoria === "Préstamos" && !obligacion.fecha_pago) {
    mora = calcularMoraPrestamo(obligacion, fechaReferencia);
  }

  return REDONDEO(base + recargoImpuesto + mora);
}

export function totalEsperadoEnFechaPago(obligacion, fechaPago) {
  const copia = { ...obligacion, fecha_pago: null };
  return calcularTotalActual(copia, fechaPago);
}

export function enriquecerObligacion(obligacion, fechaReferencia = fechaISOHoy()) {
  const dias = obligacion?.fecha_pago ? 0 : diasAtraso(obligacion?.fecha_vencimiento, fechaReferencia);
  const mora = obligacion?.fecha_pago
    ? 0
    : calcularMoraPrestamo(obligacion, fechaReferencia);
  const recargo = obligacion?.categoria === "Impuestos"
    ? REDONDEO(Number(obligacion.impuesto_recargo || 0))
    : 0;

  return {
    ...obligacion,
    monto_base: REDONDEO(Number(obligacion?.monto || 0)),
    dias_atraso: dias,
    mora_acumulada: mora,
    recargo_impuesto: recargo,
    total_actual: calcularTotalActual(obligacion, fechaReferencia)
  };
}

export function calcularCuotaFrancesa(capital, tasaPeriodoPorcentaje, numeroCuotas) {
  const p = Number(capital);
  const n = Number(numeroCuotas);
  const i = Number(tasaPeriodoPorcentaje) / 100;

  if (!Number.isFinite(p) || p <= 0 || !Number.isInteger(n) || n <= 0) {
    throw new Error("Capital y número de cuotas no son válidos.");
  }

  if (!Number.isFinite(i) || i < 0) {
    throw new Error("La tasa de interés no es válida.");
  }

  if (i === 0) return REDONDEO(p / n);
  const cuota = p * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  return REDONDEO(cuota);
}

export function sumarPeriodo(fechaISO, periodicidad, indice) {
  const base = new Date(`${fechaISO}T12:00:00Z`);
  const n = Number(indice || 0);

  if (periodicidad === "SEMANAL") {
    base.setUTCDate(base.getUTCDate() + (7 * n));
  } else if (periodicidad === "QUINCENAL") {
    base.setUTCDate(base.getUTCDate() + (15 * n));
  } else {
    base.setUTCMonth(base.getUTCMonth() + n);
  }

  return base.toISOString().slice(0, 10);
}
