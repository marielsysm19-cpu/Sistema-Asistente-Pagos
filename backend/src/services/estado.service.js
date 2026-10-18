/**
 * Obtiene la fecha actual en formato YYYY-MM-DD.
 */
function obtenerFechaActual() {
  const ahora = new Date();

  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

/**
 * Calcula automáticamente el estado de una obligación.
 *
 * Reglas:
 * 1. Si existe fecha_pago -> PAGADO.
 * 2. Si no existe pago y fecha_vencimiento es anterior a hoy -> VENCIDO.
 * 3. En cualquier otro caso -> PENDIENTE.
 *
 * @param {Object} obligacion
 * @param {string|null} obligacion.fecha_pago
 * @param {string} obligacion.fecha_vencimiento
 * @param {string|null} fechaActual Se usa principalmente para pruebas.
 * @returns {"PAGADO"|"VENCIDO"|"PENDIENTE"}
 */
export function calcularEstado(obligacion, fechaActual = null) {
  if (!obligacion) {
    throw new Error("La obligación es obligatoria");
  }

  const { fecha_pago, fecha_vencimiento } = obligacion;

  if (!fecha_vencimiento) {
    throw new Error("La fecha de vencimiento es obligatoria");
  }

  // PAGADO siempre tiene prioridad.
  if (fecha_pago) {
    return "PAGADO";
  }

  const hoy = fechaActual || obtenerFechaActual();

  if (fecha_vencimiento < hoy) {
    return "VENCIDO";
  }

  return "PENDIENTE";
}

/**
 * Devuelve la obligación incluyendo su estado calculado.
 */
export function agregarEstado(obligacion, fechaActual = null) {
  return {
    ...obligacion,
    estado: calcularEstado(obligacion, fechaActual)
  };
}

/**
 * Añade el estado a una lista completa de obligaciones.
 */
export function agregarEstados(obligaciones, fechaActual = null) {
  if (!Array.isArray(obligaciones)) {
    throw new Error("Las obligaciones deben ser una lista");
  }

  return obligaciones.map((obligacion) =>
    agregarEstado(obligacion, fechaActual)
  );
}