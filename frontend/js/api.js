/*
  CAPA DE DATOS DEL FRONTEND
  -------------------------
  Los pagos todavía pueden funcionar con datos simulados mientras
  las HU correspondientes terminan sus endpoints.

  La autenticación ya utiliza el backend real con Supabase.

  Cuando los endpoints de pagos estén completamente integrados:
  1) cambiar USE_MOCK_API a false;
  2) mantener API_BASE_URL;
  3) las peticiones enviarán automáticamente el token del usuario.
*/

const USE_MOCK_API = true;
const API_BASE_URL = "http://localhost:3000/api";


// =====================================================
// SESIÓN Y AUTENTICACIÓN
// =====================================================

const TOKEN_KEY = "sap_access_token";
const USER_KEY = "sap_usuario";


function guardarSesion(data) {
  localStorage.setItem(
    TOKEN_KEY,
    data.access_token
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(data.usuario)
  );
}


function limpiarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}


function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    limpiarSesion();
    return null;
  }
}


function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}


/*
  Realiza una petición incluyendo automáticamente
  el token Bearer del usuario autenticado.
*/
async function authenticatedFetch(url, options = {}) {
  const token = getAccessToken();

  const headers = new Headers(
    options.headers || {}
  );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  return fetch(url, {
    ...options,
    headers
  });
}


/*
  Inicio de sesión real mediante nuestro backend.
*/
async function login(email, password) {
  const response = await fetch(
    `${API_BASE_URL}/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.mensaje ||
      "No se pudo iniciar sesión."
    );
  }

  guardarSesion(data);

  return data;
}


/*
  Comprueba que el token almacenado continúa siendo válido
  y obtiene el usuario real desde el backend.
*/
async function getCurrentUser() {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "No existe una sesión activa."
    );
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}/auth/me`
  );

  const data = await response.json();

  if (!response.ok) {
    limpiarSesion();

    throw new Error(
      data.mensaje ||
      "La sesión no es válida."
    );
  }

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(data.usuario)
  );

  return data;
}


function logout() {
  limpiarSesion();
}


// =====================================================
// API DE PAGOS
// =====================================================

const Api = (() => {

  const STORAGE_KEY =
    "sap_mock_payments_v1";


  const sleep = (ms = 120) =>
    new Promise(
      resolve => setTimeout(resolve, ms)
    );


  // ===================================================
  // FUNCIONES AUXILIARES DEL MOCK
  // ===================================================

  function currentMonthDate(day) {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      day,
      12,
      0,
      0
    );
  }


  function formatISODate(date) {
    const y = date.getFullYear();

    const m = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const d = String(
      date.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }


  function seedData() {
    const now = new Date();

    const pastDay =
      Math.max(
        1,
        now.getDate() - 4
      );

    const futureDay1 =
      Math.min(
        28,
        now.getDate() + 2
      );

    const futureDay2 =
      Math.min(
        28,
        now.getDate() + 6
      );

    return [

      {
        id: crypto.randomUUID(),

        provider: "Movistar",

        concept:
          "Internet oficina",

        category:
          "Servicios",

        amount: 150,

        dueDate:
          formatISODate(
            currentMonthDate(
              futureDay1
            )
          ),

        paidDate: null,

        receipt: null,

        createdAt:
          new Date().toISOString()
      },


      {
        id: crypto.randomUUID(),

        provider: "SUNAT",

        concept:
          "Impuesto declarado",

        category:
          "Impuestos",

        amount: 850,

        dueDate:
          formatISODate(
            currentMonthDate(
              futureDay2
            )
          ),

        paidDate: null,

        receipt: null,

        createdAt:
          new Date().toISOString()
      },


      {
        id: crypto.randomUUID(),

        provider:
          "Proveedor ABC",

        concept:
          "Insumos administrativos",

        category:
          "Proveedores",

        amount: 1200,

        dueDate:
          formatISODate(
            currentMonthDate(
              pastDay
            )
          ),

        paidDate: null,

        receipt: null,

        createdAt:
          new Date().toISOString()
      },


      {
        id: crypto.randomUUID(),

        provider:
          "Banco",

        concept:
          "Cuota préstamo de capital",

        category:
          "Préstamos",

        amount: 950,

        dueDate:
          formatISODate(
            currentMonthDate(
              Math.min(
                28,
                now.getDate() + 8
              )
            )
          ),

        paidDate:
          formatISODate(
            currentMonthDate(
              Math.max(
                1,
                now.getDate() - 1
              )
            )
          ),

        receipt: {
          name:
            "comprobante-demo.txt",

          type:
            "text/plain",

          dataUrl:
            "data:text/plain;base64,Q29tcHJvYmFudGUgZGUgcGFnbw=="
        },

        createdAt:
          new Date().toISOString()
      }

    ];
  }


  function loadMock() {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      const seed =
        seedData();

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(seed)
      );

      return seed;
    }

    try {
      return JSON.parse(raw);

    } catch {
      const seed =
        seedData();

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(seed)
      );

      return seed;
    }
  }


  function saveMock(items) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );
  }


  function getStatus(payment) {

    if (payment.paidDate) {
      return "Pagado";
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const due =
      new Date(
        `${payment.dueDate}T00:00:00`
      );

    return due < today
      ? "Vencido"
      : "Pendiente";
  }


  // ===================================================
  // LISTAR PAGOS
  // ===================================================

  async function listPayments(
    year,
    month
  ) {

    if (USE_MOCK_API) {

      await sleep();

      return loadMock()

        .filter(payment => {

          const date =
            new Date(
              `${payment.dueDate}T00:00:00`
            );

          return (
            date.getFullYear() === year &&
            date.getMonth() === month
          );
        })

        .sort(
          (a, b) =>
            a.dueDate.localeCompare(
              b.dueDate
            )
        )

        .map(
          payment => ({
            ...payment,

            status:
              getStatus(payment)
          })
        );
    }


    const response =
      await authenticatedFetch(
        `${API_BASE_URL}/pagos?year=${year}&month=${month + 1}`
      );


    const data =
      await response.json();


    if (!response.ok) {
      throw new Error(
        data.mensaje ||
        "No se pudieron obtener los pagos."
      );
    }


    return data;
  }


  // ===================================================
  // CREAR OBLIGACIÓN
  // ===================================================

  async function createPayment(
    payload
  ) {

    if (USE_MOCK_API) {

      await sleep();

      const items =
        loadMock();


      const payment = {

        id:
          crypto.randomUUID(),

        provider:
          payload.provider.trim(),

        concept:
          payload.concept.trim(),

        category:
          payload.category,

        amount:
          Number(
            payload.amount
          ),

        dueDate:
          payload.dueDate,

        paidDate:
          null,

        receipt:
          null,

        createdAt:
          new Date().toISOString()
      };


      items.push(payment);

      saveMock(items);


      return {
        ...payment,

        status:
          getStatus(payment)
      };
    }


    const response =
      await authenticatedFetch(
        `${API_BASE_URL}/pagos`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );


    const data =
      await response.json();


    if (!response.ok) {
      throw new Error(
        data.mensaje ||
        "No se pudo registrar la obligación."
      );
    }


    return data;
  }


  // ===================================================
  // MODIFICAR VENCIMIENTO
  // ===================================================

  async function updateDueDate(
    id,
    dueDate
  ) {

    if (USE_MOCK_API) {

      await sleep();

      const items =
        loadMock();


      const index =
        items.findIndex(
          payment =>
            payment.id === id
        );


      if (index < 0) {
        throw new Error(
          "Obligación no encontrada."
        );
      }


      items[index].dueDate =
        dueDate;


      saveMock(items);


      return {
        ...items[index],

        status:
          getStatus(
            items[index]
          )
      };
    }


    const response =
      await authenticatedFetch(
        `${API_BASE_URL}/pagos/${id}/vencimiento`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              dueDate
            })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {
      throw new Error(
        data.mensaje ||
        "No se pudo actualizar el vencimiento."
      );
    }


    return data;
  }


  // ===================================================
  // REGISTRAR PAGO Y COMPROBANTE
  // ===================================================

  async function registerPayment(
    id,
    paidDate,
    receipt
  ) {

    if (USE_MOCK_API) {

      await sleep();

      const items =
        loadMock();


      const index =
        items.findIndex(
          payment =>
            payment.id === id
        );


      if (index < 0) {
        throw new Error(
          "Obligación no encontrada."
        );
      }


      items[index].paidDate =
        paidDate;

      items[index].receipt =
        receipt;


      saveMock(items);


      return {
        ...items[index],

        status:
          getStatus(
            items[index]
          )
      };
    }


    const form =
      new FormData();


    form.append(
      "paidDate",
      paidDate
    );


    form.append(
      "receipt",
      receipt.file
    );


    const response =
      await authenticatedFetch(
        `${API_BASE_URL}/pagos/${id}/registrar-pago`,
        {
          method: "POST",
          body: form
        }
      );


    const data =
      await response.json();


    if (!response.ok) {
      throw new Error(
        data.mensaje ||
        "No se pudo registrar el pago."
      );
    }


    return data;
  }


  // ===================================================
  // OBTENER UN PAGO
  // ===================================================

  async function getPayment(id) {

    if (USE_MOCK_API) {

      await sleep();


      const item =
        loadMock().find(
          payment =>
            payment.id === id
        );


      if (!item) {
        throw new Error(
          "Pago no encontrado."
        );
      }


      return {
        ...item,

        status:
          getStatus(item)
      };
    }


    const response =
      await authenticatedFetch(
        `${API_BASE_URL}/pagos/${id}`
      );


    const data =
      await response.json();


    if (!response.ok) {
      throw new Error(
        data.mensaje ||
        "No se pudo obtener el pago."
      );
    }


    return data;
  }


  // ===================================================
  // FUNCIONES PÚBLICAS DE API
  // ===================================================

  return {

    // Autenticación
    login,
    logout,
    getCurrentUser,
    getStoredUser,
    getAccessToken,

    // Pagos
    listPayments,
    createPayment,
    updateDueDate,
    registerPayment,
    getPayment

  };

})();