
/*
  CAPA DE DATOS DEL FRONTEND
  -------------------------
  Mientras el backend no esté listo, USE_MOCK_API = true y los datos se guardan
  en localStorage.

  Cuando el equipo termine el backend:
  1) cambiar USE_MOCK_API a false;
  2) ajustar API_BASE_URL;
  3) mantener los mismos nombres de funciones para no romper el frontend.
*/

const USE_MOCK_API = true;
const API_BASE_URL = "http://localhost:3000/api";

const Api = (() => {
  const STORAGE_KEY = "sap_mock_payments_v1";

  const sleep = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));

  function currentMonthDate(day) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0);
  }

  function formatISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function seedData() {
    const now = new Date();
    const pastDay = Math.max(1, now.getDate() - 4);
    const futureDay1 = Math.min(28, now.getDate() + 2);
    const futureDay2 = Math.min(28, now.getDate() + 6);

    return [
      {
        id: crypto.randomUUID(),
        provider: "Movistar",
        concept: "Internet oficina",
        category: "Servicios",
        amount: 150,
        dueDate: formatISODate(currentMonthDate(futureDay1)),
        paidDate: null,
        receipt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        provider: "SUNAT",
        concept: "Impuesto declarado",
        category: "Impuestos",
        amount: 850,
        dueDate: formatISODate(currentMonthDate(futureDay2)),
        paidDate: null,
        receipt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        provider: "Proveedor ABC",
        concept: "Insumos administrativos",
        category: "Proveedores",
        amount: 1200,
        dueDate: formatISODate(currentMonthDate(pastDay)),
        paidDate: null,
        receipt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        provider: "Banco",
        concept: "Cuota préstamo de capital",
        category: "Préstamos",
        amount: 950,
        dueDate: formatISODate(currentMonthDate(Math.min(28, now.getDate() + 8))),
        paidDate: formatISODate(currentMonthDate(Math.max(1, now.getDate() - 1))),
        receipt: {
          name: "comprobante-demo.txt",
          type: "text/plain",
          dataUrl: "data:text/plain;base64,Q29tcHJvYmFudGUgZGUgcGFnbw=="
        },
        createdAt: new Date().toISOString()
      }
    ];
  }

  function loadMock() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    try {
      return JSON.parse(raw);
    } catch {
      const seed = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  function saveMock(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getStatus(payment) {
    if (payment.paidDate) return "Pagado";
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(`${payment.dueDate}T00:00:00`);
    return due < today ? "Vencido" : "Pendiente";
  }

  async function listPayments(year, month) {
    if (USE_MOCK_API) {
      await sleep();
      return loadMock()
        .filter(p => {
          const d = new Date(`${p.dueDate}T00:00:00`);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map(p => ({ ...p, status: getStatus(p) }));
    }

    const response = await fetch(`${API_BASE_URL}/pagos?year=${year}&month=${month + 1}`, {
      credentials: "include"
    });
    if (!response.ok) throw new Error("No se pudieron obtener los pagos.");
    return response.json();
  }

  async function createPayment(payload) {
    if (USE_MOCK_API) {
      await sleep();
      const items = loadMock();
      const payment = {
        id: crypto.randomUUID(),
        provider: payload.provider.trim(),
        concept: payload.concept.trim(),
        category: payload.category,
        amount: Number(payload.amount),
        dueDate: payload.dueDate,
        paidDate: null,
        receipt: null,
        createdAt: new Date().toISOString()
      };
      items.push(payment);
      saveMock(items);
      return { ...payment, status: getStatus(payment) };
    }

    const response = await fetch(`${API_BASE_URL}/pagos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("No se pudo registrar la obligación.");
    return response.json();
  }

  async function updateDueDate(id, dueDate) {
    if (USE_MOCK_API) {
      await sleep();
      const items = loadMock();
      const index = items.findIndex(p => p.id === id);
      if (index < 0) throw new Error("Obligación no encontrada.");
      items[index].dueDate = dueDate;
      saveMock(items);
      return { ...items[index], status: getStatus(items[index]) };
    }

    const response = await fetch(`${API_BASE_URL}/pagos/${id}/vencimiento`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ dueDate })
    });
    if (!response.ok) throw new Error("No se pudo actualizar el vencimiento.");
    return response.json();
  }

  async function registerPayment(id, paidDate, receipt) {
    if (USE_MOCK_API) {
      await sleep();
      const items = loadMock();
      const index = items.findIndex(p => p.id === id);
      if (index < 0) throw new Error("Obligación no encontrada.");

      items[index].paidDate = paidDate;
      items[index].receipt = receipt;
      saveMock(items);
      return { ...items[index], status: getStatus(items[index]) };
    }

    const form = new FormData();
    form.append("paidDate", paidDate);
    form.append("receipt", receipt.file);

    const response = await fetch(`${API_BASE_URL}/pagos/${id}/registrar-pago`, {
      method: "POST",
      credentials: "include",
      body: form
    });
    if (!response.ok) throw new Error("No se pudo registrar el pago.");
    return response.json();
  }

  async function getPayment(id) {
    if (USE_MOCK_API) {
      await sleep();
      const item = loadMock().find(p => p.id === id);
      if (!item) throw new Error("Pago no encontrado.");
      return { ...item, status: getStatus(item) };
    }

    const response = await fetch(`${API_BASE_URL}/pagos/${id}`, {
      credentials: "include"
    });
    if (!response.ok) throw new Error("No se pudo obtener el pago.");
    return response.json();
  }

  return {
    listPayments,
    createPayment,
    updateDueDate,
    registerPayment,
    getPayment
  };
})();
