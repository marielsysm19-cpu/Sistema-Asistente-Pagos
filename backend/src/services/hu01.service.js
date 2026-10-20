import { randomUUID } from "node:crypto";
import { agregarEstado } from "./estado.service.js";
import {
  calcularCuotaFrancesa,
  enriquecerObligacion,
  sumarPeriodo
} from "./obligacion-calculos.service.js";

export const MONTO_MAXIMO = 9_999_999_999.99;

export const CATEGORIAS_PERMITIDAS = [
  "Servicios",
  "Impuestos",
  "Proveedores",
  "Préstamos"
];

export function fechaISOValida(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function texto(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numero(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function booleano(value) {
  return value === true || value === "true" || value === "SI" || value === "sí";
}

function validarMonto(monto, etiqueta, errores, permiteCero = false) {
  const minimoValido = permiteCero ? monto >= 0 : monto >= 0.01;
  if (!Number.isFinite(monto) || !minimoValido) {
    errores.push(`${etiqueta} debe ser un número ${permiteCero ? "mayor o igual a cero" : "mayor o igual a S/ 0.01"}.`);
    return;
  }
  if (monto > MONTO_MAXIMO) {
    errores.push(`${etiqueta} no puede superar S/ 9,999,999,999.99.`);
  }
  if (Math.abs(Math.round(monto * 100) - (monto * 100)) > 1e-8) {
    errores.push(`${etiqueta} debe tener como máximo dos decimales.`);
  }
}

function obtenerFechaActualISO() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function validarObligacion(body = {}, fechaActual = obtenerFechaActualISO()) {
  const proveedor = texto(body.provider ?? body.proveedor_entidad);
  const concepto = texto(body.concept ?? body.concepto);
  const categoria = body.category ?? body.categoria;
  const fecha = body.dueDate ?? body.fecha_vencimiento;
  const monto = numero(body.amount ?? body.monto);
  const errores = [];

  if (!proveedor) errores.push("El proveedor o entidad es obligatorio.");
  if (proveedor.length > 160) errores.push("El proveedor o entidad no puede superar 160 caracteres.");
  if (!concepto) errores.push("El concepto es obligatorio.");
  if (concepto.length > 200) errores.push("El concepto no puede superar 200 caracteres.");
  if (!CATEGORIAS_PERMITIDAS.includes(categoria)) {
    errores.push("La categoría debe ser Servicios, Impuestos, Proveedores o Préstamos.");
  }
  if (!fechaISOValida(fecha)) {
    errores.push("La fecha de vencimiento debe ser una fecha real con formato AAAA-MM-DD.");
  } else if (fecha < fechaActual) {
    errores.push("La fecha de vencimiento no puede ser anterior a hoy.");
  }

  const datosBase = {
    proveedor_entidad: proveedor,
    concepto,
    categoria,
    fecha_vencimiento: fecha
  };

  if (categoria === "Préstamos") {
    const modalidad = texto(body.loanMode ?? body.prestamo_modalidad ?? "UNICO").toUpperCase();
    const capital = numero(body.loanCapital ?? body.prestamo_capital_total ?? monto);
    const tieneInteres = booleano(body.loanHasInterest ?? body.prestamo_tiene_interes);
    const tasaInteres = tieneInteres ? numero(body.loanInterestRate ?? body.prestamo_tasa_interes) : 0;
    const aplicaMora = booleano(body.loanHasLateFee ?? body.prestamo_aplica_mora);
    const tasaMoraDiaria = aplicaMora ? numero(body.loanLateFeeRate ?? body.prestamo_tasa_mora_diaria) : 0;

    if (!["UNICO", "CUOTAS"].includes(modalidad)) errores.push("Selecciona una modalidad válida para el préstamo.");
    validarMonto(capital, "El capital del préstamo", errores);
    if (tieneInteres && (!Number.isFinite(tasaInteres) || tasaInteres < 0 || tasaInteres > 100)) {
      errores.push("La tasa de interés debe estar entre 0 y 100%.");
    }
    if (aplicaMora && (!Number.isFinite(tasaMoraDiaria) || tasaMoraDiaria <= 0 || tasaMoraDiaria > 10)) {
      errores.push("La tasa de mora diaria debe ser mayor que 0 y no superar 10%.");
    }

    if (modalidad === "CUOTAS") {
      const numeroCuotas = Number(body.loanInstallments ?? body.prestamo_total_cuotas);
      const periodicidad = texto(body.loanFrequency ?? body.prestamo_periodicidad_pago ?? "MENSUAL").toUpperCase();
      if (!Number.isInteger(numeroCuotas) || numeroCuotas < 2 || numeroCuotas > 120) {
        errores.push("El número de cuotas debe estar entre 2 y 120.");
      }
      if (!["MENSUAL", "QUINCENAL", "SEMANAL"].includes(periodicidad)) {
        errores.push("La periodicidad del préstamo no es válida.");
      }
      if (!errores.length) {
        const cuotaCalculada = calcularCuotaFrancesa(capital, tasaInteres, numeroCuotas);
        const totalCronograma = cuotaCalculada * numeroCuotas;
        if (cuotaCalculada > MONTO_MAXIMO) {
          errores.push("El monto de cada cuota no puede superar S/ 9,999,999,999.99.");
        }
        if (totalCronograma > MONTO_MAXIMO) {
          errores.push("El total del préstamo no puede superar S/ 9,999,999,999.99.");
        }
      }
      if (errores.length) return { valido: false, errores };

      return {
        valido: true,
        tipo: "PRESTAMO_CUOTAS",
        datos: {
          ...datosBase,
          prestamo_modalidad: "CUOTAS",
          prestamo_capital_total: Number(capital.toFixed(2)),
          prestamo_tasa_interes: Number(tasaInteres.toFixed(6)),
          prestamo_total_cuotas: numeroCuotas,
          prestamo_periodicidad_pago: periodicidad,
          prestamo_aplica_mora: aplicaMora,
          prestamo_tasa_mora_diaria: Number(tasaMoraDiaria.toFixed(6))
        }
      };
    }

    const totalUnico = capital * (1 + (tasaInteres / 100));
    if (totalUnico > MONTO_MAXIMO) {
      errores.push("El total del préstamo no puede superar S/ 9,999,999,999.99.");
    }
    if (errores.length) return { valido: false, errores };

    return {
      valido: true,
      tipo: "SIMPLE",
      datos: {
        ...datosBase,
        monto: Number(totalUnico.toFixed(2)),
        prestamo_modalidad: "UNICO",
        prestamo_capital_total: Number(capital.toFixed(2)),
        prestamo_tasa_interes: Number(tasaInteres.toFixed(6)),
        prestamo_total_cuotas: 1,
        prestamo_numero_cuota: 1,
        prestamo_periodicidad_pago: null,
        prestamo_aplica_mora: aplicaMora,
        prestamo_tasa_mora_diaria: Number(tasaMoraDiaria.toFixed(6))
      }
    };
  }

  validarMonto(monto, "El monto", errores);

  const datos = {
    ...datosBase,
    monto: Number.isFinite(monto) ? Number(monto.toFixed(2)) : monto
  };

  if (categoria === "Impuestos") {
    const tipoImpuesto = texto(body.taxType ?? body.impuesto_tipo);
    const periodo = texto(body.taxPeriod ?? body.impuesto_periodo);
    const numeroOrden = texto(body.taxOrder ?? body.impuesto_numero_orden);
    const recargo = numero(body.taxSurcharge ?? body.impuesto_recargo ?? 0);

    if (!tipoImpuesto) errores.push("Indica el tipo de impuesto.");
    if (!periodo) errores.push("Indica el periodo tributario.");
    validarMonto(recargo, "El recargo tributario", errores, true);
    if (Number.isFinite(monto) && Number.isFinite(recargo) && (monto + recargo) > MONTO_MAXIMO) {
      errores.push("El total del impuesto con recargos no puede superar S/ 9,999,999,999.99.");
    }

    datos.impuesto_tipo = tipoImpuesto;
    datos.impuesto_periodo = periodo;
    datos.impuesto_numero_orden = numeroOrden || null;
    datos.impuesto_recargo = Number.isFinite(recargo) ? Number(recargo.toFixed(2)) : 0;
  }

  if (errores.length) return { valido: false, errores };
  return { valido: true, tipo: "SIMPLE", datos };
}

export function mapearObligacionFrontend(row, comprobante = null) {
  const enriquecida = enriquecerObligacion(row);
  const estado = agregarEstado(row).estado;
  return {
    id: row.id,
    provider: row.proveedor_entidad,
    concept: row.concepto,
    category: row.categoria,
    amount: Number(row.monto),
    baseAmount: Number(enriquecida.monto_base),
    currentTotal: Number(enriquecida.total_actual),
    lateFee: Number(enriquecida.mora_acumulada),
    daysLate: Number(enriquecida.dias_atraso),
    taxSurcharge: Number(enriquecida.recargo_impuesto),
    dueDate: row.fecha_vencimiento,
    paidDate: row.fecha_pago,
    receipt: comprobante,
    status: estado === "PAGADO" ? "Pagado" : estado === "VENCIDO" ? "Vencido" : "Pendiente",
    loan: row.categoria === "Préstamos" ? {
      groupId: row.prestamo_grupo_id,
      mode: row.prestamo_modalidad,
      capital: row.prestamo_capital_total,
      interestRate: row.prestamo_tasa_interes,
      installmentNumber: row.prestamo_numero_cuota,
      installments: row.prestamo_total_cuotas,
      frequency: row.prestamo_periodicidad_pago,
      hasLateFee: Boolean(row.prestamo_aplica_mora),
      lateFeeDailyRate: row.prestamo_tasa_mora_diaria
    } : null,
    tax: row.categoria === "Impuestos" ? {
      type: row.impuesto_tipo,
      period: row.impuesto_periodo,
      orderNumber: row.impuesto_numero_orden,
      surcharge: Number(row.impuesto_recargo || 0)
    } : null,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

const SELECT_CAMPOS = `
  id, proveedor_entidad, concepto, categoria, monto, fecha_vencimiento, fecha_pago,
  prestamo_grupo_id, prestamo_modalidad, prestamo_capital_total, prestamo_tasa_interes,
  prestamo_numero_cuota, prestamo_total_cuotas, prestamo_periodicidad_pago,
  prestamo_aplica_mora, prestamo_tasa_mora_diaria,
  impuesto_tipo, impuesto_periodo, impuesto_numero_orden, impuesto_recargo,
  created_by, created_at
`;

export async function crearObligacion(db, validacion, usuarioId) {
  if (validacion.tipo !== "PRESTAMO_CUOTAS") {
    const { data, error } = await db
      .from("obligaciones")
      .insert({ ...validacion.datos, created_by: usuarioId })
      .select(SELECT_CAMPOS)
      .single();
    if (error) throw error;
    return [data];
  }

  const d = validacion.datos;
  const grupoId = randomUUID();
  const cuota = calcularCuotaFrancesa(
    d.prestamo_capital_total,
    d.prestamo_tasa_interes,
    d.prestamo_total_cuotas
  );

  const rows = Array.from({ length: d.prestamo_total_cuotas }, (_, index) => ({
    proveedor_entidad: d.proveedor_entidad,
    concepto: `${d.concepto} — Cuota ${index + 1}/${d.prestamo_total_cuotas}`,
    categoria: "Préstamos",
    monto: cuota,
    fecha_vencimiento: sumarPeriodo(d.fecha_vencimiento, d.prestamo_periodicidad_pago, index),
    created_by: usuarioId,
    prestamo_grupo_id: grupoId,
    prestamo_modalidad: "CUOTAS",
    prestamo_capital_total: d.prestamo_capital_total,
    prestamo_tasa_interes: d.prestamo_tasa_interes,
    prestamo_numero_cuota: index + 1,
    prestamo_total_cuotas: d.prestamo_total_cuotas,
    prestamo_periodicidad_pago: d.prestamo_periodicidad_pago,
    prestamo_aplica_mora: d.prestamo_aplica_mora,
    prestamo_tasa_mora_diaria: d.prestamo_tasa_mora_diaria
  }));

  const { data, error } = await db
    .from("obligaciones")
    .insert(rows)
    .select(SELECT_CAMPOS);
  if (error) throw error;
  return data || [];
}
