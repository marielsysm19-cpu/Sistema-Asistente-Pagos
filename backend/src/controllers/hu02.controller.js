import { agregarEstado } from "../services/estado.service.js";
import { enriquecerObligacion } from "../services/obligacion-calculos.service.js";

const SELECT_PAGO = `
  id,
  proveedor_entidad,
  concepto,
  categoria,
  monto,
  fecha_vencimiento,
  fecha_pago,
  prestamo_grupo_id,
  prestamo_modalidad,
  prestamo_capital_total,
  prestamo_tasa_interes,
  prestamo_numero_cuota,
  prestamo_total_cuotas,
  prestamo_periodicidad_pago,
  prestamo_aplica_mora,
  prestamo_tasa_mora_diaria,
  impuesto_tipo,
  impuesto_periodo,
  impuesto_numero_orden,
  impuesto_recargo,
  comprobantes (
    id,
    nombre_archivo,
    tipo_mime,
    fecha_carga,
    metodo_pago,
    codigo_operacion,
    pagador_nombre,
    tarjeta_marca,
    tarjeta_ultimos4,
    banco_origen,
    monto_pagado,
    fecha_pago_declarada,
    estado_verificacion,
    motivo_rechazo,
    fecha_verificacion
  )
`;

function prepararPago(row) {
  const enriquecida = enriquecerObligacion(row);
  return {
    ...enriquecida,
    estado: agregarEstado(row).estado
  };
}

export async function obtenerPagosDelMes(req, res) {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: "Debe indicar el año y el mes." });
    }

    const anio = Number(year);
    const mes = Number(month);
    if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return res.status(400).json({ error: "El año o el mes no son válidos." });
    }

    const fechaInicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
    let siguienteAnio = anio;
    let siguienteMes = mes + 1;
    if (siguienteMes === 13) {
      siguienteMes = 1;
      siguienteAnio++;
    }
    const fechaFin = `${siguienteAnio}-${String(siguienteMes).padStart(2, "0")}-01`;

    const { data, error } = await req.supabase
      .from("obligaciones")
      .select(SELECT_PAGO)
      .gte("fecha_vencimiento", fechaInicio)
      .lt("fecha_vencimiento", fechaFin)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      console.error("Error al consultar pagos del mes:", error);
      return res.status(500).json({ error: "No se pudieron obtener los pagos del mes." });
    }

    const pagos = (data || []).map(prepararPago);
    const totalMes = pagos.reduce((total, pago) => total + Number(pago.total_actual || pago.monto), 0);

    return res.status(200).json({
      year: anio,
      month: mes,
      total: pagos.length,
      totalMes: Math.round(totalMes * 100) / 100,
      pagos
    });
  } catch (error) {
    console.error("Error inesperado en HU02:", error);
    return res.status(500).json({ error: "Ocurrió un error al consultar los pagos." });
  }
}

export async function obtenerPagoPorId(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await req.supabase
      .from("obligaciones")
      .select(SELECT_PAGO)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error consultando obligación:", error);
      return res.status(500).json({ error: "No se pudo consultar la obligación." });
    }
    if (!data) return res.status(404).json({ error: "La obligación no fue encontrada." });

    return res.status(200).json({ pago: prepararPago(data) });
  } catch (error) {
    console.error("Error inesperado al consultar obligación:", error);
    return res.status(500).json({ error: "Ocurrió un error al consultar la obligación." });
  }
}
