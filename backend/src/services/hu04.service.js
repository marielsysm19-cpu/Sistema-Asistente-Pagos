export const TIPOS_COMPROBANTE_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png"
];

export const TAMANO_MAXIMO_COMPROBANTE = 5 * 1024 * 1024;
export const MONTO_MAXIMO_PAGO = 9_999_999_999.99;

export const METODOS_PAGO_PERMITIDOS = [
  "YAPE",
  "TARJETA",
  "TRANSFERENCIA",
  "EFECTIVO",
  "OTRO"
];

function obtenerFechaActualISO() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function fechaPagoValida(fechaPago, fechaActual = obtenerFechaActualISO()) {
  if (typeof fechaPago !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) return false;
  const [anio, mes, dia] = fechaPago.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const existe = fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  return existe && fechaPago <= fechaActual;
}

export function validarDatosMedioPago(body = {}) {
  const metodo = String(body.metodoPago ?? body.metodo_pago ?? "").trim().toUpperCase();
  const codigoOperacion = String(body.codigoOperacion ?? body.codigo_operacion ?? "").trim();
  const pagadorNombre = String(body.pagadorNombre ?? body.pagador_nombre ?? "").trim();
  const tarjetaMarca = String(body.tarjetaMarca ?? body.tarjeta_marca ?? "").trim().toUpperCase();
  const tarjetaUltimos4 = String(body.tarjetaUltimos4 ?? body.tarjeta_ultimos4 ?? "").trim();
  const bancoOrigen = String(body.bancoOrigen ?? body.banco_origen ?? "").trim();
  const montoPagado = Number(body.montoPagado ?? body.monto_pagado);
  const errores = [];

  if (!METODOS_PAGO_PERMITIDOS.includes(metodo)) errores.push("Selecciona un método de pago válido.");
  if (!pagadorNombre) errores.push("El nombre del pagador es obligatorio.");
  if (pagadorNombre.length > 160) errores.push("El nombre del pagador no puede superar 160 caracteres.");
  if (!Number.isFinite(montoPagado) || montoPagado < 0.01) {
    errores.push("El monto pagado debe ser mayor o igual a S/ 0.01.");
  } else {
    if (montoPagado > MONTO_MAXIMO_PAGO) errores.push("El monto pagado no puede superar S/ 9,999,999,999.99.");
    if (Math.abs(Math.round(montoPagado * 100) - (montoPagado * 100)) > 1e-8) {
      errores.push("El monto pagado debe tener como máximo dos decimales.");
    }
  }

  if (metodo === "YAPE") {
    if (!/^\d{8}$/.test(codigoOperacion)) {
      errores.push("El número de operación de Yape debe contener exactamente 8 dígitos.");
    }
  }

  if (metodo === "TARJETA") {
    if (!/^[A-Za-z0-9-]{1,20}$/.test(codigoOperacion)) {
      errores.push("El código de autorización de tarjeta debe tener máximo 20 caracteres y usar solo letras, números o guion.");
    }
    if (!tarjetaMarca) errores.push("Indica la marca de la tarjeta.");
    if (!/^\d{4}$/.test(tarjetaUltimos4)) errores.push("Indica únicamente los últimos 4 dígitos de la tarjeta.");
  }

  if (metodo === "TRANSFERENCIA") {
    if (!/^[A-Za-z0-9-]{1,30}$/.test(codigoOperacion)) {
      errores.push("La referencia de transferencia debe tener máximo 30 caracteres y usar solo letras, números o guion.");
    }
    if (!bancoOrigen) errores.push("Indica el banco de origen de la transferencia.");
    if (bancoOrigen.length > 120) errores.push("El banco de origen no puede superar 120 caracteres.");
  }

  if (metodo === "EFECTIVO" && codigoOperacion && !/^[A-Za-z0-9-]{1,30}$/.test(codigoOperacion)) {
    errores.push("El número de recibo o referencia de efectivo debe tener máximo 30 caracteres y usar solo letras, números o guion.");
  }

  if (metodo === "OTRO" && codigoOperacion.length > 30) {
    errores.push("La referencia no puede superar 30 caracteres.");
  }

  if (errores.length) return { valido: false, errores };

  return {
    valido: true,
    datos: {
      metodo_pago: metodo,
      codigo_operacion: codigoOperacion || null,
      pagador_nombre: pagadorNombre,
      tarjeta_marca: metodo === "TARJETA" ? tarjetaMarca : null,
      tarjeta_ultimos4: metodo === "TARJETA" ? tarjetaUltimos4 : null,
      banco_origen: metodo === "TRANSFERENCIA" ? bancoOrigen : null,
      monto_pagado: Math.round(montoPagado * 100) / 100
    }
  };
}

export function sanitizarNombreArchivo(nombre) {
  if (!nombre) return "comprobante";
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function construirStoragePath(usuarioId, obligacionId, nombreArchivo, timestamp = Date.now()) {
  if (!usuarioId || !obligacionId) throw new Error("Usuario y obligación son obligatorios");
  return `${usuarioId}/${obligacionId}/${timestamp}-${sanitizarNombreArchivo(nombreArchivo)}`;
}

export function firmaComprobanteValida(archivo) {
  if (!archivo || !Buffer.isBuffer(archivo.buffer)) return false;
  const buffer = archivo.buffer;
  if (archivo.mimetype === "application/pdf") {
    return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (archivo.mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (archivo.mimetype === "image/png") {
    const firma = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
    return buffer.length >= firma.length && firma.every((byte, i) => buffer[i] === byte);
  }
  return false;
}

export function validarComprobante(archivo) {
  if (!archivo) return { valido: false, mensaje: "El comprobante es obligatorio" };
  if (!TIPOS_COMPROBANTE_PERMITIDOS.includes(archivo.mimetype)) {
    return { valido: false, mensaje: "Formato no permitido. Usa PDF, JPG, JPEG o PNG" };
  }
  if (!Number.isFinite(archivo.size) || archivo.size <= 0) {
    return { valido: false, mensaje: "El comprobante está vacío o no es válido" };
  }
  if (archivo.size > TAMANO_MAXIMO_COMPROBANTE) {
    return { valido: false, mensaje: "El comprobante supera el tamaño máximo de 5 MB" };
  }
  if (!firmaComprobanteValida(archivo)) {
    return { valido: false, mensaje: "El contenido del archivo no corresponde al formato indicado" };
  }
  return { valido: true, mensaje: null };
}
