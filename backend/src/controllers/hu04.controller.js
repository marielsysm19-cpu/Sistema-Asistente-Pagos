import {
  construirStoragePath,
  fechaPagoValida,
  validarComprobante
} from "../services/hu04.service.js";

import {
  agregarEstado
} from "../services/estado.service.js";


const BUCKET_COMPROBANTES = "comprobantes-pagos";


export async function registrarPago(req, res) {
  try {

    // ==========================================
    // 1. OBTENER DATOS ENVIADOS DESDE LA PÁGINA
    // ==========================================

    const { id: obligacionId } = req.params;

    // Aceptamos ambos nombres para facilitar
    // posteriormente la conexión con el frontend.
    const fechaPago =
      req.body.fechaPago ??
      req.body.paidDate;

    const archivo = req.file;


    // ==========================================
    // 2. VALIDAR LA FECHA DE PAGO
    // ==========================================

    if (!obligacionId) {
      return res.status(400).json({
        mensaje: "La obligación es obligatoria"
      });
    }

    if (!fechaPagoValida(fechaPago)) {
      return res.status(400).json({
        mensaje: "La fecha de pago no es válida"
      });
    }


    // ==========================================
    // 3. VALIDAR EL COMPROBANTE
    // ==========================================

    const validacionArchivo =
      validarComprobante(archivo);

    if (!validacionArchivo.valido) {
      return res.status(400).json({
        mensaje: validacionArchivo.mensaje
      });
    }


    // ==========================================
    // 4. BUSCAR LA OBLIGACIÓN EN SUPABASE
    // ==========================================

    const {
      data: obligacion,
      error: errorObligacion
    } = await req.supabase
      .from("obligaciones")
      .select(`
        id,
        proveedor_entidad,
        concepto,
        categoria,
        monto,
        fecha_vencimiento,
        fecha_pago
      `)
      .eq("id", obligacionId)
      .single();


    if (errorObligacion || !obligacion) {
      return res.status(404).json({
        mensaje: "La obligación no existe"
      });
    }


    // ==========================================
    // 5. EVITAR REGISTRAR DOS VECES EL PAGO
    // ==========================================

    if (obligacion.fecha_pago) {
      return res.status(409).json({
        mensaje:
          "Esta obligación ya fue registrada como pagada"
      });
    }


    // ==========================================
    // 6. CREAR LA RUTA DEL ARCHIVO EN STORAGE
    // ==========================================

    const storagePath =
      construirStoragePath(
        req.user.id,
        obligacionId,
        archivo.originalname
      );


    // ==========================================
    // 7. SUBIR EL COMPROBANTE A SUPABASE STORAGE
    // ==========================================

    const {
      error: errorStorage
    } = await req.supabase.storage
      .from(BUCKET_COMPROBANTES)
      .upload(
        storagePath,
        archivo.buffer,
        {
          contentType: archivo.mimetype,
          upsert: false
        }
      );


    if (errorStorage) {
      console.error(
        "Error al subir comprobante:",
        errorStorage
      );

      return res.status(500).json({
        mensaje:
          "No se pudo almacenar el comprobante"
      });
    }


    // ==========================================
    // 8. GUARDAR INFORMACIÓN DEL COMPROBANTE
    // ==========================================

    const {
      data: comprobante,
      error: errorComprobante
    } = await req.supabase
      .from("comprobantes")
      .insert({
        obligacion_id: obligacionId,
        storage_path: storagePath,
        nombre_archivo: archivo.originalname,
        tipo_mime: archivo.mimetype,
        usuario_que_registro: req.user.id
      })
      .select()
      .single();


    if (errorComprobante) {
      console.error(
        "Error al registrar comprobante:",
        errorComprobante
      );

      return res.status(500).json({
        mensaje:
          "El comprobante fue recibido, pero no se pudo registrar en la base de datos"
      });
    }


    // ==========================================
    // 9. MARCAR LA OBLIGACIÓN COMO PAGADA
    // ==========================================

    const {
      data: obligacionActualizada,
      error: errorPago
    } = await req.supabase
      .from("obligaciones")
      .update({
        fecha_pago: fechaPago
      })
      .eq("id", obligacionId)
      .select()
      .single();


    if (errorPago) {
      console.error(
        "Error al registrar fecha de pago:",
        errorPago
      );

      return res.status(500).json({
        mensaje:
          "El comprobante fue registrado, pero no se pudo actualizar el pago"
      });
    }


    // ==========================================
    // 10. CALCULAR ESTADO CON LA LÓGICA DE HU05
    // ==========================================

    const pagoConEstado =
      agregarEstado(obligacionActualizada);


    // ==========================================
    // 11. RESPONDER AL FRONTEND
    // ==========================================

    return res.status(200).json({
      mensaje: "Pago registrado correctamente",
      pago: pagoConEstado,
      comprobante
    });


  } catch (error) {

    console.error(
      "Error interno en registrarPago:",
      error
    );

    return res.status(500).json({
      mensaje:
        "Error interno al registrar el pago"
    });
  }
}