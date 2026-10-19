import { agregarEstado } from "./estado.service.js";

export const CATEGORIAS_PERMITIDAS = [
  "Servicios",
  "Impuestos",
  "Proveedores",
  "Préstamos"
];

export function fechaISOValida(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function validarObligacion(body = {}) {
  const proveedor = typeof body.provider === "string"
    ? body.provider.trim()
    : typeof body.proveedor_entidad === "string"
      ? body.proveedor_entidad.trim()
      : "";
  const concepto = typeof body.concept === "string"
    ? body.concept.trim()
    : typeof body.concepto === "string"
      ? body.concepto.trim()
      : "";
  const categoria = body.category ?? body.categoria;
  const fecha = body.dueDate ?? body.fecha_vencimiento;
  const montoRaw = body.amount ?? body.monto;
  const monto = typeof montoRaw === "number" ? montoRaw :
    (typeof montoRaw === "string" && montoRaw.trim() !== "" ? Number(montoRaw) : NaN);
  const errores = [];

  if (!proveedor) errores.push("El proveedor o entidad es obligatorio.");
  if (proveedor.length > 160) errores.push("El proveedor o entidad no puede superar 160 caracteres.");
  if (!concepto) errores.push("El concepto es obligatorio.");
  if (concepto.length > 200) errores.push("El concepto no puede superar 200 caracteres.");
  if (!CATEGORIAS_PERMITIDAS.includes(categoria)) {
    errores.push("La categoría debe ser Servicios, Impuestos, Proveedores o Préstamos.");
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    errores.push("El monto debe ser un número mayor que cero.");
  } else if (Math.round(monto * 100) !== monto * 100) {
    errores.push("El monto debe tener como máximo dos decimales.");
  } else if (monto >= 1_000_000_000_000) {
    errores.push("El monto supera el máximo permitido.");
  }
  if (!fechaISOValida(fecha)) errores.push("La fecha de vencimiento debe ser una fecha real con formato AAAA-MM-DD.");

  if (errores.length) return { valido: false, errores };

  return {
    valido: true,
    datos: {
      proveedor_entidad: proveedor,
      concepto,
      categoria,
      monto: Number(monto.toFixed(2)),
      fecha_vencimiento: fecha
    }
  };
}

function estadoFrontend(obligacion) {
  const estado = agregarEstado(obligacion).estado;
  return estado === "PAGADO" ? "Pagado" :
    estado === "VENCIDO" ? "Vencido" : "Pendiente";
}

export function mapearObligacionFrontend(row, comprobante = null) {
  return {
    id: row.id,
    provider: row.proveedor_entidad,
    concept: row.concepto,
    category: row.categoria,
    amount: Number(row.monto),
    dueDate: row.fecha_vencimiento,
    paidDate: row.fecha_pago,
    receipt: comprobante,
    status: estadoFrontend(row),
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export async function crearObligacion(db, datos, usuarioId) {
  const { data, error } = await db
    .from("obligaciones")
    .insert({
      ...datos,
      created_by: usuarioId
    })
    .select("id, proveedor_entidad, concepto, categoria, monto, fecha_vencimiento, fecha_pago, created_by, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listarObligacionesMes(db, year, month) {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const nextYear = nextMonthDate.getUTCFullYear();
  const nextMonth = String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = `${nextYear}-${nextMonth}-01`;

  const { data, error } = await db
    .from("obligaciones")
    .select("id, proveedor_entidad, concepto, categoria, monto, fecha_vencimiento, fecha_pago, created_by, created_at")
    .gte("fecha_vencimiento", firstDay)
    .lt("fecha_vencimiento", nextDay)
    .order("fecha_vencimiento", { ascending: true });

  if (error) throw error;
  return data || [];
}