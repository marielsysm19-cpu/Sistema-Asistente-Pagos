import { agregarEstados } from "../services/estado.service.js";

/**
 * HU02 - Visualizar pagos del mes
 * GET /api/pagos?year=2026&month=10
 */
export async function obtenerPagosDelMes(req, res) {
  try {
    const { year, month } = req.query;

    // Validar que se hayan enviado año y mes.
    if (!year || !month) {
      return res.status(400).json({
        error: "Debe indicar el año y el mes."
      });
    }

    const anio = Number(year);
    const mes = Number(month);

    // Validar valores recibidos.
    if (
      !Number.isInteger(anio) ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12
    ) {
      return res.status(400).json({
        error: "El año o el mes no son válidos."
      });
    }

    // Primer día del mes solicitado.
    const fechaInicio =
      `${anio}-${String(mes).padStart(2, "0")}-01`;

    // Primer día del mes siguiente.
    let siguienteAnio = anio;
    let siguienteMes = mes + 1;

    if (siguienteMes === 13) {
      siguienteMes = 1;
      siguienteAnio++;
    }

    const fechaFin =
      `${siguienteAnio}-${String(siguienteMes).padStart(2, "0")}-01`;

    // req.supabase será el cliente autenticado creado por el middleware.
    const { data, error } = await req.supabase
      .from("obligaciones")
      .select(`
        id,
        proveedor_entidad,
        concepto,
        categoria,
        monto,
        fecha_vencimiento,
        fecha_pago,
        comprobantes (
          id,
          nombre_archivo,
          tipo_mime,
          fecha_carga
        )
      `)
      .gte("fecha_vencimiento", fechaInicio)
      .lt("fecha_vencimiento", fechaFin)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      console.error("Error al consultar pagos del mes:", error);

      return res.status(500).json({
        error: "No se pudieron obtener los pagos del mes."
      });
    }

    // El estado no se guarda manualmente.
    // Se calcula usando la lógica común de HU05.
    const pagos = agregarEstados(data || []);

    const totalMes = pagos.reduce(
      (total, pago) => total + Number(pago.monto),
      0
    );

    return res.status(200).json({
      year: anio,
      month: mes,
      total: pagos.length,
      totalMes,
      pagos
    });
  } catch (error) {
    console.error("Error inesperado en HU02:", error);

    return res.status(500).json({
      error: "Ocurrió un error al consultar los pagos."
    });
  }
}