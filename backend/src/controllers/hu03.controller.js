
import { agregarEstado } from "../services/estado.service.js";

// HU03: validar que la fecha exista y tenga formato AAAA-MM-DD.
export function fechaVencimientoValida(fecha) {
  if (
    typeof fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return false;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);

  if (anio < 1 || anio > 9999) {
    return false;
  }

  const fechaReal = new Date(0);
  fechaReal.setUTCFullYear(anio, mes - 1, dia);
  fechaReal.setUTCHours(0, 0, 0, 0);

  return (
    fechaReal.getUTCFullYear() === anio &&
    fechaReal.getUTCMonth() === mes - 1 &&
    fechaReal.getUTCDate() === dia
  );
}

// HU03: PATCH /api/pagos/:id/vencimiento
export async function modificarVencimiento(req, res) {
  try {
    const { id } = req.params;
    const { fecha_vencimiento } = req.body ?? {};

    // 1. Validar el identificador de la obligación.
    const uuidValido =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidValido.test(id)) {
      return res.status(400).json({
        mensaje: "El identificador de la obligación no es válido."
      });
    }

    // 2. Validar la nueva fecha.
    if (!fechaVencimientoValida(fecha_vencimiento)) {
      return res.status(400).json({
        mensaje: "Selecciona una fecha de vencimiento válida."
      });
    }

    // 3. Utilizar el cliente Supabase autenticado.
    // El middleware autenticar debe asignar req.supabase.
    const supabase = req.supabase;

    if (!supabase) {
      return res.status(500).json({
        mensaje: "No se pudo establecer la conexión autenticada."
      });
    }

    // 4. Comprobar que la obligación exista.
    const {
      data: obligacionActual,
      error: errorConsulta
    } = await supabase
      .from("obligaciones")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (errorConsulta) {
      console.error("Error consultando obligación:", errorConsulta);

      return res.status(500).json({
        mensaje: "No se pudo consultar la obligación."
      });
    }

    if (!obligacionActual) {
      return res.status(404).json({
        mensaje: "La obligación no fue encontrada."
      });
    }

    // 5. Modificar ÚNICAMENTE fecha_vencimiento.
    // No se permite modificar monto, proveedor,
    // concepto, categoría ni fecha_pago.
    const {
      data: obligacionActualizada,
      error: errorActualizacion
    } = await supabase
      .from("obligaciones")
      .update({
        fecha_vencimiento: fecha_vencimiento
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (errorActualizacion) {
      console.error(
        "Error actualizando vencimiento:",
        errorActualizacion
      );

      return res.status(500).json({
        mensaje: "No se pudo actualizar la fecha de vencimiento."
      });
    }

    if (!obligacionActualizada) {
      return res.status(403).json({
        mensaje: "No tienes permiso para modificar esta obligación."
      });
    }

    // 6. Recalcular el estado mediante HU05.
    // PAGADO tiene prioridad sobre VENCIDO y PENDIENTE.
    const obligacionConEstado = agregarEstado(
      obligacionActualizada
    );

    // 7. Responder con la fecha y estado actualizados.
    return res.status(200).json({
      mensaje: "Fecha de vencimiento actualizada correctamente.",
      obligacion: obligacionConEstado
    });

  } catch (error) {
    console.error("Error interno HU03:", error);

    return res.status(500).json({
      mensaje: "Ocurrió un error interno al modificar el vencimiento."
    });
  }
}

