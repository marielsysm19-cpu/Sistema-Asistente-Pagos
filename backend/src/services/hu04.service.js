export const TIPOS_COMPROBANTE_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png"
];

export const TAMANO_MAXIMO_COMPROBANTE =
  5 * 1024 * 1024;


function obtenerFechaActualISO() {
  const ahora = new Date();

  const anio = ahora.getFullYear();
  const mes = String(
    ahora.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    ahora.getDate()
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}


export function fechaPagoValida(
  fechaPago,
  fechaActual = obtenerFechaActualISO()
) {
  if (
    typeof fechaPago !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)
  ) {
    return false;
  }

  const [anio, mes, dia] =
    fechaPago.split("-").map(Number);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  const existeEnCalendario =
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia;

  if (!existeEnCalendario) {
    return false;
  }

  // No se puede registrar hoy
  // un pago realizado en el futuro.
  if (fechaPago > fechaActual) {
    return false;
  }

  return true;
}


export function sanitizarNombreArchivo(nombre) {
  if (!nombre) {
    return "comprobante";
  }

  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}


export function construirStoragePath(
  usuarioId,
  obligacionId,
  nombreArchivo,
  timestamp = Date.now()
) {
  if (!usuarioId || !obligacionId) {
    throw new Error(
      "Usuario y obligación son obligatorios"
    );
  }

  const nombreSeguro =
    sanitizarNombreArchivo(nombreArchivo);

  return `${usuarioId}/${obligacionId}/${timestamp}-${nombreSeguro}`;
}


export function firmaComprobanteValida(archivo) {
  if (
    !archivo ||
    !Buffer.isBuffer(archivo.buffer)
  ) {
    return false;
  }

  const buffer = archivo.buffer;

  if (archivo.mimetype === "application/pdf") {
    return (
      buffer.length >= 5 &&
      buffer
        .subarray(0, 5)
        .toString("ascii") === "%PDF-"
    );
  }

  if (archivo.mimetype === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (archivo.mimetype === "image/png") {
    const firmaPNG = [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a
    ];

    if (buffer.length < firmaPNG.length) {
      return false;
    }

    return firmaPNG.every(
      (byte, indice) =>
        buffer[indice] === byte
    );
  }

  return false;
}


export function validarComprobante(archivo) {
  if (!archivo) {
    return {
      valido: false,
      mensaje:
        "El comprobante es obligatorio"
    };
  }

  if (
    !TIPOS_COMPROBANTE_PERMITIDOS.includes(
      archivo.mimetype
    )
  ) {
    return {
      valido: false,
      mensaje:
        "Formato no permitido. Usa PDF, JPG, JPEG o PNG"
    };
  }

  if (
    !Number.isFinite(archivo.size) ||
    archivo.size <= 0
  ) {
    return {
      valido: false,
      mensaje:
        "El comprobante está vacío o no es válido"
    };
  }

  if (
    archivo.size >
    TAMANO_MAXIMO_COMPROBANTE
  ) {
    return {
      valido: false,
      mensaje:
        "El comprobante supera el tamaño máximo de 5 MB"
    };
  }

  if (!firmaComprobanteValida(archivo)) {
    return {
      valido: false,
      mensaje:
        "El contenido del archivo no corresponde al formato indicado"
    };
  }

  return {
    valido: true,
    mensaje: null
  };
}