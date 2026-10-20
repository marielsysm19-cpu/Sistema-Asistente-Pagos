const BUCKET_COMPROBANTES = "comprobantes-pagos";

export async function obtenerComprobante(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "El ID de la obligación es obligatorio",
      });
    }

    // Buscar el comprobante asociado a la obligación
    const { data: comprobante, error: errorComprobante } = await req.supabase
      .from("comprobantes")
      .select(`
        id,
        obligacion_id,
        storage_path,
        nombre_archivo,
        tipo_mime,
        fecha_carga
      `)
      .eq("obligacion_id", id)
      .maybeSingle();

    if (errorComprobante) {
      console.error(errorComprobante);

      return res.status(500).json({
        error: "No se pudo consultar el comprobante",
      });
    }

    if (!comprobante) {
      return res.status(404).json({
        error: "Esta obligación no tiene comprobante registrado",
      });
    }

    // Crear un enlace temporal para visualizar el archivo privado
    const { data: archivo, error: errorArchivo } = await req.supabase.storage
      .from(BUCKET_COMPROBANTES)
      .createSignedUrl(comprobante.storage_path, 60);

    if (errorArchivo || !archivo?.signedUrl) {
      console.error(errorArchivo);

      return res.status(500).json({
        error: "No se pudo obtener el archivo del comprobante",
      });
    }

    return res.status(200).json({
      mensaje: "Comprobante obtenido correctamente",
      comprobante: {
        id: comprobante.id,
        obligacion_id: comprobante.obligacion_id,
        nombre_archivo: comprobante.nombre_archivo,
        tipo_mime: comprobante.tipo_mime,
        fecha_carga: comprobante.fecha_carga,
        url: archivo.signedUrl,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno al obtener el comprobante",
    });
  }
}