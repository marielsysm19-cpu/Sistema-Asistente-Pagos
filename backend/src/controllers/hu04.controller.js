import {
  construirStoragePath,
  fechaPagoValida,
  validarComprobante,
  validarDatosMedioPago
} from "../services/hu04.service.js";
import { agregarEstado } from "../services/estado.service.js";
import { totalEsperadoEnFechaPago } from "../services/obligacion-calculos.service.js";

const BUCKET_COMPROBANTES = "comprobantes-pagos";

const SELECT_OBLIGACION_PAGO = `
  id, proveedor_entidad, concepto, categoria, monto, fecha_vencimiento, fecha_pago,
  prestamo_aplica_mora, prestamo_tasa_mora_diaria,
  impuesto_recargo
`;

async function codigoOperacionDisponible(db, codigo, obligacionId) {
  if (!codigo) return true;
  const { data, error } = await db
    .from("comprobantes")
    .select("id, obligacion_id")
    .eq("codigo_operacion", codigo)
    .neq("obligacion_id", obligacionId)
    .limit(1);
  if (error) throw error;
  return !data || data.length === 0;
}

async function archivarComprobante(db, comprobante) {
  if (!comprobante) return;
  const { error } = await db.from("comprobantes_historial").insert({
    comprobante_id_original: comprobante.id,
    obligacion_id: comprobante.obligacion_id,
    storage_path: comprobante.storage_path,
    nombre_archivo: comprobante.nombre_archivo,
    tipo_mime: comprobante.tipo_mime,
    metodo_pago: comprobante.metodo_pago,
    codigo_operacion: comprobante.codigo_operacion,
    pagador_nombre: comprobante.pagador_nombre,
    monto_pagado: comprobante.monto_pagado,
    fecha_pago_declarada: comprobante.fecha_pago_declarada,
    estado_verificacion: comprobante.estado_verificacion,
    motivo_rechazo: comprobante.motivo_rechazo,
    fecha_carga_original: comprobante.fecha_carga
  });
  if (error) throw error;
}

export async function registrarPago(req, res) {
  try {
    const { id: obligacionId } = req.params;
    const fechaPago = req.body.fechaPago ?? req.body.paidDate;
    const archivo = req.file;

    if (!obligacionId) return res.status(400).json({ mensaje: "La obligación es obligatoria" });
    if (!fechaPagoValida(fechaPago)) return res.status(400).json({ mensaje: "La fecha de pago no es válida" });

    const medio = validarDatosMedioPago(req.body);
    if (!medio.valido) {
      return res.status(400).json({ mensaje: "Revisa los datos del pago.", errores: medio.errores });
    }

    const validacionArchivo = validarComprobante(archivo);
    if (!validacionArchivo.valido) return res.status(400).json({ mensaje: validacionArchivo.mensaje });

    const { data: obligacion, error: errorObligacion } = await req.supabase
      .from("obligaciones")
      .select(SELECT_OBLIGACION_PAGO)
      .eq("id", obligacionId)
      .single();

    if (errorObligacion || !obligacion) return res.status(404).json({ mensaje: "La obligación no existe" });
    if (obligacion.fecha_pago) {
      return res.status(409).json({ mensaje: "Esta obligación ya fue registrada como pagada" });
    }

    const totalEsperado = totalEsperadoEnFechaPago(obligacion, fechaPago);
    if (Math.abs(Number(medio.datos.monto_pagado) - totalEsperado) > 0.01) {
      return res.status(400).json({
        mensaje: `El monto del comprobante debe coincidir con el total a pagar: S/ ${totalEsperado.toFixed(2)}.`
      });
    }

    if (!(await codigoOperacionDisponible(req.supabase, medio.datos.codigo_operacion, obligacionId))) {
      return res.status(409).json({ mensaje: "El código de operación ya fue utilizado en otro pago." });
    }

    const { data: existente, error: errorExistente } = await req.supabase
      .from("comprobantes")
      .select("*")
      .eq("obligacion_id", obligacionId)
      .maybeSingle();

    if (errorExistente) throw errorExistente;
    if (existente && existente.estado_verificacion !== "RECHAZADO") {
      return res.status(409).json({ mensaje: "La obligación ya tiene un comprobante en revisión o aprobado." });
    }

    const storagePath = construirStoragePath(req.user.id, obligacionId, archivo.originalname);
    const { error: errorStorage } = await req.supabase.storage
      .from(BUCKET_COMPROBANTES)
      .upload(storagePath, archivo.buffer, { contentType: archivo.mimetype, upsert: false });

    if (errorStorage) {
      console.error("Error al subir comprobante:", errorStorage);
      return res.status(500).json({ mensaje: "No se pudo almacenar el comprobante" });
    }

    let comprobante;
    if (existente) {
      await archivarComprobante(req.supabase, existente);
      const { data, error } = await req.supabase
        .from("comprobantes")
        .update({
          storage_path: storagePath,
          nombre_archivo: archivo.originalname,
          tipo_mime: archivo.mimetype,
          usuario_que_registro: req.user.id,
          fecha_carga: new Date().toISOString(),
          ...medio.datos,
          fecha_pago_declarada: fechaPago,
          estado_verificacion: "PENDIENTE",
          motivo_rechazo: null,
          verificado_por: null,
          fecha_verificacion: null
        })
        .eq("id", existente.id)
        .select()
        .single();
      if (error) throw error;
      comprobante = data;
    } else {
      const { data, error } = await req.supabase
        .from("comprobantes")
        .insert({
          obligacion_id: obligacionId,
          storage_path: storagePath,
          nombre_archivo: archivo.originalname,
          tipo_mime: archivo.mimetype,
          usuario_que_registro: req.user.id,
          ...medio.datos,
          fecha_pago_declarada: fechaPago,
          estado_verificacion: "PENDIENTE"
        })
        .select()
        .single();
      if (error) throw error;
      comprobante = data;
    }

    // La obligación NO se marca como PAGADA todavía.
    // La fecha declarada queda asociada al comprobante y solo se confirma
    // en obligaciones.fecha_pago cuando el GERENTE aprueba la evidencia.
    return res.status(200).json({
      mensaje: "Pago registrado para revisión. La obligación se marcará como pagada cuando el gerente apruebe el comprobante.",
      pago: agregarEstado(obligacion),
      comprobante,
      total_esperado: totalEsperado
    });
  } catch (error) {
    console.error("Error interno en registrarPago:", error);
    return res.status(500).json({ mensaje: "Error interno al registrar el pago" });
  }
}
