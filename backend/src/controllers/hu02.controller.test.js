import test from "node:test";
import assert from "node:assert/strict";
import { obtenerPagosDelMes } from "./hu02.controller.js";

function crearRespuesta() {
  return {
    statusCode: 200,
    body: null,

    status(codigo) {
      this.statusCode = codigo;
      return this;
    },

    json(datos) {
      this.body = datos;
      return this;
    }
  };
}

function crearSupabase(datos = [], error = null) {
  const consulta = {
    select() {
      return this;
    },

    gte() {
      return this;
    },

    lt() {
      return this;
    },

    order() {
      return Promise.resolve({
        data: datos,
        error
      });
    }
  };

  return {
    from(tabla) {
      assert.equal(tabla, "obligaciones");
      return consulta;
    }
  };
}

test("HU02 rechaza una consulta sin año ni mes", async () => {
  const req = {
    query: {}
  };

  const res = crearRespuesta();

  await obtenerPagosDelMes(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Debe indicar el año y el mes.");
});

test("HU02 rechaza un mes inválido", async () => {
  const req = {
    query: {
      year: "2026",
      month: "13"
    }
  };

  const res = crearRespuesta();

  await obtenerPagosDelMes(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "El año o el mes no son válidos.");
});

test("HU02 devuelve correctamente los pagos del mes", async () => {
  const datos = [
    {
      id: 1,
      proveedor_entidad: "Hidrandina",
      concepto: "Energía eléctrica",
      categoria: "Servicios",
      monto: 150,
      fecha_vencimiento: "2026-10-10",
      fecha_pago: null,
      comprobantes: []
    },
    {
      id: 2,
      proveedor_entidad: "Internet",
      concepto: "Servicio de internet",
      categoria: "Servicios",
      monto: 100,
      fecha_vencimiento: "2026-10-20",
      fecha_pago: "2026-10-15",
      comprobantes: [
        {
          id: 1,
          nombre_archivo: "comprobante.pdf",
          tipo_mime: "application/pdf",
          fecha_carga: "2026-10-15"
        }
      ]
    }
  ];

  const req = {
    query: {
      year: "2026",
      month: "10"
    },
    supabase: crearSupabase(datos)
  };

  const res = crearRespuesta();

  await obtenerPagosDelMes(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.year, 2026);
  assert.equal(res.body.month, 10);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.totalMes, 250);
  assert.equal(res.body.pagos.length, 2);

  assert.equal(
    res.body.pagos[1].comprobantes[0].nombre_archivo,
    "comprobante.pdf"
  );
});

test("HU02 devuelve una lista vacía cuando el mes no tiene pagos", async () => {
  const req = {
    query: {
      year: "2026",
      month: "10"
    },
    supabase: crearSupabase([])
  };

  const res = crearRespuesta();

  await obtenerPagosDelMes(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 0);
  assert.equal(res.body.totalMes, 0);
  assert.deepEqual(res.body.pagos, []);
});

test("HU02 controla errores de consulta a la base de datos", async () => {
  const req = {
    query: {
      year: "2026",
      month: "10"
    },
    supabase: crearSupabase(
      null,
      { message: "Error de base de datos" }
    )
  };

  const res = crearRespuesta();

  await obtenerPagosDelMes(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(
    res.body.error,
    "No se pudieron obtener los pagos del mes."
  );
});