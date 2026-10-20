import {
  validarObligacion,
  crearObligacion,
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
    const rows = await crearObligacion(req.supabase, validacion, req.user.id);
    const pagos = rows.map(row => mapearObligacionFrontend(row));

    return res.status(201).json({
      mensaje: pagos.length > 1
        ? `Préstamo registrado y cronograma de ${pagos.length} cuotas generado.`
        : "Obligación registrada correctamente.",
      pago: pagos[0],
      pagos
    });
  } catch (error) {
    console.error("Error al registrar obligación HU01:", error);
    return res.status(500).json({
      mensaje: "No se pudo guardar la obligación. Inténtalo nuevamente."
    });
  }
}
