export const TIPOS_COMPROBANTE_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png"
];

export const TAMANO_MAXIMO_COMPROBANTE =
  5 * 1024 * 1024;

export function fechaPagoValida(fechaPago) {
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

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
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

export function validarComprobante(archivo) {
  if (!archivo) {
    return {
      valido: false,
      mensaje: "El comprobante es obligatorio"
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
    archivo.size >
    TAMANO_MAXIMO_COMPROBANTE
  ) {
    return {
      valido: false,
      mensaje:
        "El comprobante supera el tamaño máximo de 5 MB"
    };
  }

  return {
    valido: true,
    mensaje: null
  };
}