import test from "node:test";
import assert from "node:assert/strict";
import { obtenerPagosDelMes } from "./hu02.controller.js";

function crearRespuesta() {
  return {
    statusCode: 200,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(datos) { this.body = datos; return this; }
  };
}

function crearSupabase(datos = [], error = null) {
  const consulta = {
    select() { return this; },
    gte() { return this; },
    lt() { return this; },
    order() { return Promise.resolve({ data: datos, error }); }
  };
  return { from() { return consulta; } };
}

test("HU02 rechaza una consulta sin año ni mes", async () => {
  const res = crearRespuesta();
  await obtenerPagosDelMes({ query: {} }, res);
  assert.equal(res.statusCode, 400);
});

test("HU02 rechaza un mes inválido", async () => {
  const res = crearRespuesta();
  await obtenerPagosDelMes({ query: { year: "2026", month: "13" } }, res);
  assert.equal(res.statusCode, 400);
});

test("HU02 devuelve correctamente los pagos del mes", async () => {
  const datos = [{
    id: "1",
    proveedor_entidad: "Internet",
    concepto: "Servicio",
    categoria: "Servicios",
    monto: 100,
    fecha_vencimiento: "2026-10-20",
    fecha_pago: null,
    comprobantes: []
  }];
  const res = crearRespuesta();
  await obtenerPagosDelMes({
    query: { year: "2026", month: "10" },
    supabase: crearSupabase(datos)
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.totalMes, 100);
});
