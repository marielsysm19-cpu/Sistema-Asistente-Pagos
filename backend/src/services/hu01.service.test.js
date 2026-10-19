import test from "node:test";
import assert from "node:assert/strict";
import { validarObligacion, fechaISOValida } from "./hu01.service.js";

const valido = {
  provider: "Empresa eléctrica",
  concept: "Servicio de octubre",
  category: "Servicios",
  amount: "350.50",
  dueDate: "2026-10-25"
};

test("acepta una obligación válida", () => {
  const resultado = validarObligacion(valido);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.datos.proveedor_entidad, "Empresa eléctrica");
  assert.equal(resultado.datos.monto, 350.5);
});

test("rechaza campos obligatorios vacíos", () => {
  const resultado = validarObligacion({
    ...valido, provider: " ", concept: "", category: "", dueDate: ""
  });
  assert.equal(resultado.valido, false);
  assert.ok(resultado.errores.length >= 4);
});

test("rechaza monto cero, negativo, no numérico y con más de dos decimales", () => {
  for (const amount of ["0", "-1", "abc", "1.234"]) {
    assert.equal(validarObligacion({ ...valido, amount }).valido, false, amount);
  }
});

test("rechaza categoría no permitida", () => {
  assert.equal(validarObligacion({ ...valido, category: "Otros" }).valido, false);
});

test("valida fechas reales y formato ISO", () => {
  assert.equal(fechaISOValida("2026-10-25"), true);
  assert.equal(fechaISOValida("2026-02-30"), false);
  assert.equal(fechaISOValida("25-10-2026"), false);
  assert.equal(validarObligacion({ ...valido, dueDate: "2026-02-30" }).valido, false);
});

test("acepta los nombres de propiedades usados por la base de datos", () => {
  const resultado = validarObligacion({
    proveedor_entidad: "Proveedor",
    concepto: "Servicio",
    categoria: "Proveedores",
    monto: 20,
    fecha_vencimiento: "2026-11-01"
  });
  assert.equal(resultado.valido, true);
});