const BUCKET_COMPROBANTES = "comprobantes-pagos";

const CAMPOS_COMPROBANTE = `
  id, obligacion_id, storage_path, nombre_archivo, tipo_mime, fecha_carga,
  metodo_pago, codigo_operacion, pagador_nombre, tarjeta_marca, tarjeta_ultimos4,
  banco_origen, monto_pagado, fecha_pago_declarada, estado_verificacion, motivo_rechazo,
  verificado_por, fecha_verificacion
`;

export async function obtenerComprobante(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "El ID de la obligación es obligatorio" });

    const { data: comprobante, error } = await req.supabase
      .from("comprobantes")
      .select(CAMPOS_COMPROBANTE)
      .eq("obligacion_id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: "No se pudo consultar el comprobante" });
    if (!comprobante) return res.status(404).json({ error: "Esta obligación no tiene comprobante registrado" });

    const { data: archivo, error: errorArchivo } = await req.supabase.storage
      .from(BUCKET_COMPROBANTES)
      .createSignedUrl(comprobante.storage_path, 60);

    if (errorArchivo || !archivo?.signedUrl) {
      return res.status(500).json({ error: "No se pudo obtener el archivo del comprobante" });
    }

    return res.status(200).json({
      mensaje: "Comprobante obtenido correctamente",
      comprobante: { ...comprobante, url: archivo.signedUrl }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno al obtener el comprobante" });
  }
}

export async function verificarComprobante(req, res) {
  try {
    const { id } = req.params;
    const estado = String(req.body.estado ?? "").trim().toUpperCase();
    const motivo = String(req.body.motivo ?? "").trim();

    if (!["APROBADO", "RECHAZADO"].includes(estado)) {
      return res.status(400).json({ mensaje: "La decisión de verificación no es válida." });
    }
    if (estado === "RECHAZADO" && !motivo) {
      return res.status(400).json({ mensaje: "Debes indicar el motivo del rechazo." });
    }

    const { data: comprobante, error: consultaError } = await req.supabase
      .from("comprobantes")
      .select("id, obligacion_id, estado_verificacion, fecha_pago_declarada")
      .eq("obligacion_id", id)
      .maybeSingle();

    if (consultaError) throw consultaError;
    if (!comprobante) return res.status(404).json({ mensaje: "No existe un comprobante para esta obligación." });
    if (comprobante.estado_verificacion !== "PENDIENTE") {
      return res.status(409).json({ mensaje: "Este comprobante ya fue verificado." });
    }

    if (estado === "APROBADO" && !comprobante.fecha_pago_declarada) {
      return res.status(409).json({
        mensaje: "El comprobante no tiene una fecha de pago declarada y no puede aprobarse."
      });
    }

    const { data: actualizado, error: updateError } = await req.supabase
      .from("comprobantes")
      .update({
        estado_verificacion: estado,
        motivo_rechazo: estado === "RECHAZADO" ? motivo : null,
        verificado_por: req.user.id,
        fecha_verificacion: new Date().toISOString()
      })
      .eq("id", comprobante.id)
      .select(CAMPOS_COMPROBANTE)
      .single();

    if (updateError) throw updateError;

    // Solo una aprobación confirma el pago de la obligación.
    // Un rechazo deja/retorna la obligación a PENDIENTE o VENCIDA según su vencimiento.
    const fechaPagoConfirmada = estado === "APROBADO"
      ? comprobante.fecha_pago_declarada
      : null;

    const { error: pagoError } = await req.supabase
      .from("obligaciones")
      .update({ fecha_pago: fechaPagoConfirmada })
      .eq("id", id);

    if (pagoError) {
      // Evita dejar el comprobante aprobado/rechazado si no pudo
      // sincronizarse el estado de la obligación.
      await req.supabase
        .from("comprobantes")
        .update({
          estado_verificacion: "PENDIENTE",
          motivo_rechazo: null,
          verificado_por: null,
          fecha_verificacion: null
        })
        .eq("id", comprobante.id);
      throw pagoError;
    }

    return res.status(200).json({
      mensaje: estado === "APROBADO"
        ? "Comprobante aprobado. La obligación ahora figura como pagada."
        : "Comprobante rechazado. La obligación continúa pendiente o vencida hasta que el asistente corrija el pago.",
      comprobante: actualizado
    });
  } catch (error) {
    console.error("Error al verificar comprobante:", error);
    return res.status(500).json({ mensaje: "No se pudo verificar el comprobante." });
  }
}
