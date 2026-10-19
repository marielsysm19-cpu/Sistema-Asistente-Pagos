import {
  validarObligacion,
  crearObligacion,
  listarObligacionesMes,
  mapearObligacionFrontend
} from "../services/hu01.service.js";

export async function registrarObligacion(req, res) {
  const validacion = validarObligacion(req.body);
  if (!validacion.valido) {
    return res.status(400).json({
      mensaje: "Revisa los datos de la obligación.",
      errores: validacion.errores
    });
  }

  try {
    // La identidad viene del middleware; nunca del body enviado por el navegador.
    const row = await crearObligacion(
      req.supabase,
      validacion.datos,
      req.user.id
    );

    return res.status(201).json({
      mensaje: "Pago registrado correctamente",
      pago: mapearObligacionFrontend(row)
    });
  } catch (error) {
    console.error("Error al registrar obligación HU01:", error);
    return res.status(500).json({
      mensaje: "No se pudo guardar la obligación. Inténtalo nuevamente."
    });
  }
}

export async function listarPagosMes(req, res) {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!Number.isInteger(year) || year < 2000 || year > 2100 ||
      !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({
      mensaje: "Indica un año válido y un mes entre 1 y 12."
    });
  }

  try {
    const rows = await listarObligacionesMes(req.supabase, year, month);
    return res.json(rows.map(row => mapearObligacionFrontend(row)));
  } catch (error) {
    console.error("Error al listar obligaciones:", error);
    return res.status(500).json({
      mensaje: "No se pudieron obtener las obligaciones del mes."
    });
  }
}