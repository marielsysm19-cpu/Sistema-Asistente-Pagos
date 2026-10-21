// URL del backend en producción (Render).
// Cuando despliegues tu backend en Render, copia su URL y colócala aquí terminada en "/api"
// Ejemplo: "https://sistema-asistente-pagos-backend.onrender.com/api"
const PROD_API_URL = "https://TU-BACKEND.onrender.com/api";

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === ""
);

const API_BASE_URL = isLocalhost
  ? "http://localhost:3000/api"
  : (localStorage.getItem("sap_api_url") || window.__API_BASE_URL__ || PROD_API_URL);

if (!isLocalhost && API_BASE_URL.includes("TU-BACKEND")) {
  console.warn(
    "⚠️ SAP: Recuerda configurar tu URL de backend en frontend/js/api.js (variable PROD_API_URL) o ejecuta en consola: localStorage.setItem('sap_api_url', 'https://tu-backend.onrender.com/api')"
  );
}

const TOKEN_KEY = "sap_access_token";
const USER_KEY = "sap_usuario";

function guardarSesion(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
}

function limpiarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { limpiarSesion(); return null; }
}

function getAccessToken() { return localStorage.getItem(TOKEN_KEY); }

async function authenticatedFetch(url, options = {}) {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

async function leerRespuesta(response) {
  let data = {};
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    const detalle = Array.isArray(data.errores) && data.errores.length ? data.errores.join(" ") : null;
    throw new Error(detalle || data.mensaje || data.error || "No se pudo completar la operación.");
  }
  return data;
}

async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await leerRespuesta(response);
  guardarSesion(data);
  return data;
}

async function getCurrentUser() {
  if (!getAccessToken()) throw new Error("No existe una sesión activa.");
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/me`);
    const data = await leerRespuesta(response);
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    return data;
  } catch (error) {
    limpiarSesion();
    throw error;
  }
}

function logout() { limpiarSesion(); }

function estadoFrontend(estado) {
  const value = String(estado || "PENDIENTE").toUpperCase();
  if (value === "PAGADO") return "Pagado";
  if (value === "VENCIDO") return "Vencido";
  return "Pendiente";
}

function obtenerComprobante(comprobantes) {
  if (!comprobantes) return null;
  if (Array.isArray(comprobantes)) return comprobantes[0] || null;
  return comprobantes;
}

function mapReceipt(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.nombre_archivo ?? r.name,
    type: r.tipo_mime ?? r.type,
    uploadedAt: r.fecha_carga ?? r.uploadedAt,
    method: r.metodo_pago ?? r.method ?? null,
    operationCode: r.codigo_operacion ?? r.operationCode ?? null,
    payerName: r.pagador_nombre ?? r.payerName ?? null,
    cardBrand: r.tarjeta_marca ?? r.cardBrand ?? null,
    cardLast4: r.tarjeta_ultimos4 ?? r.cardLast4 ?? null,
    bankOrigin: r.banco_origen ?? r.bankOrigin ?? null,
    paidAmount: Number(r.monto_pagado ?? r.paidAmount ?? 0),
    paidDate: r.fecha_pago_declarada ?? r.paidDate ?? null,
    verificationStatus: r.estado_verificacion ?? r.verificationStatus ?? "PENDIENTE",
    rejectionReason: r.motivo_rechazo ?? r.rejectionReason ?? null,
    verifiedAt: r.fecha_verificacion ?? r.verifiedAt ?? null,
    url: r.url ?? null
  };
}

function mapPago(row) {
  const receipt = mapReceipt(obtenerComprobante(row.comprobantes ?? row.receipt));
  return {
    id: row.id,
    provider: row.proveedor_entidad ?? row.provider,
    concept: row.concepto ?? row.concept,
    category: row.categoria ?? row.category,
    amount: Number(row.monto ?? row.amount ?? 0),
    baseAmount: Number(row.monto_base ?? row.baseAmount ?? row.monto ?? row.amount ?? 0),
    currentTotal: Number(row.total_actual ?? row.currentTotal ?? row.monto ?? row.amount ?? 0),
    lateFee: Number(row.mora_acumulada ?? row.lateFee ?? 0),
    daysLate: Number(row.dias_atraso ?? row.daysLate ?? 0),
    taxSurcharge: Number(row.recargo_impuesto ?? row.taxSurcharge ?? row.impuesto_recargo ?? 0),
    dueDate: row.fecha_vencimiento ?? row.dueDate,
    paidDate: row.fecha_pago ?? row.paidDate ?? null,
    receipt,
    status: estadoFrontend(row.estado ?? row.status),
    loan: (row.categoria ?? row.category) === "Préstamos" ? {
      groupId: row.prestamo_grupo_id ?? row.loan?.groupId ?? null,
      mode: row.prestamo_modalidad ?? row.loan?.mode ?? null,
      capital: Number(row.prestamo_capital_total ?? row.loan?.capital ?? 0),
      interestRate: Number(row.prestamo_tasa_interes ?? row.loan?.interestRate ?? 0),
      installmentNumber: Number(row.prestamo_numero_cuota ?? row.loan?.installmentNumber ?? 0),
      installments: Number(row.prestamo_total_cuotas ?? row.loan?.installments ?? 0),
      frequency: row.prestamo_periodicidad_pago ?? row.loan?.frequency ?? null,
      hasLateFee: Boolean(row.prestamo_aplica_mora ?? row.loan?.hasLateFee),
      lateFeeDailyRate: Number(row.prestamo_tasa_mora_diaria ?? row.loan?.lateFeeDailyRate ?? 0)
    } : null,
    tax: (row.categoria ?? row.category) === "Impuestos" ? {
      type: row.impuesto_tipo ?? row.tax?.type ?? null,
      period: row.impuesto_periodo ?? row.tax?.period ?? null,
      orderNumber: row.impuesto_numero_orden ?? row.tax?.orderNumber ?? null,
      surcharge: Number(row.impuesto_recargo ?? row.tax?.surcharge ?? 0)
    } : null
  };
}

const Api = (() => {
  async function listPayments(year, monthZeroBased) {
    const response = await authenticatedFetch(`${API_BASE_URL}/pagos?year=${year}&month=${monthZeroBased + 1}`);
    const data = await leerRespuesta(response);
    return (data.pagos || []).map(mapPago);
  }

  async function createPayment(payload) {
    const response = await authenticatedFetch(`${API_BASE_URL}/pagos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await leerRespuesta(response);
    return {
      message: data.mensaje,
      payment: mapPago(data.pago || data),
      payments: (data.pagos || []).map(mapPago)
    };
  }


  async function getPayment(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/pagos/${encodeURIComponent(id)}`);
    const data = await leerRespuesta(response);
    return mapPago(data.pago || data);
  }

  async function registerPayment(id, payload) {
    const form = new FormData();
    form.append("paidDate", payload.paidDate);
    form.append("metodoPago", payload.method);
    form.append("montoPagado", String(payload.paidAmount));
    form.append("codigoOperacion", payload.operationCode || "");
    form.append("pagadorNombre", payload.payerName || "");
    form.append("tarjetaMarca", payload.cardBrand || "");
    form.append("tarjetaUltimos4", payload.cardLast4 || "");
    form.append("bancoOrigen", payload.bankOrigin || "");
    form.append("receipt", payload.file);

    const response = await authenticatedFetch(`${API_BASE_URL}/pagos/${encodeURIComponent(id)}/registrar-pago`, {
      method: "POST",
      body: form
    });
    return leerRespuesta(response);
  }

  async function getReceipt(id) {
    const response = await authenticatedFetch(`${API_BASE_URL}/pagos/${encodeURIComponent(id)}/comprobante`);
    const data = await leerRespuesta(response);
    return mapReceipt(data.comprobante);
  }

  async function verifyReceipt(id, estado, motivo = "") {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/pagos/${encodeURIComponent(id)}/comprobante/verificacion`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, motivo })
      }
    );
    return leerRespuesta(response);
  }

  return {
    login, logout, getCurrentUser, getStoredUser, getAccessToken,
    listPayments, createPayment, registerPayment,
    getPayment, getReceipt, verifyReceipt
  };
})();
