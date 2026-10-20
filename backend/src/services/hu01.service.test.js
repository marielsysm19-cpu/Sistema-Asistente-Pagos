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
});

test("rechaza una nueva obligación con vencimiento anterior a hoy", () => {
  const resultado = validarObligacion({
    ...valido,
    dueDate: "2026-10-19"
  }, "2026-10-20");
  assert.equal(resultado.valido, false);
  assert.ok(resultado.errores.some(e => e.includes("no puede ser anterior a hoy")));
});

test("valida préstamo por cuotas con mora", () => {
  const resultado = validarObligacion({
    provider: "Banco ABC",
    concept: "Préstamo de capital",
    category: "Préstamos",
    dueDate: "2026-11-15",
    loanMode: "CUOTAS",
    loanCapital: "10000",
    loanHasInterest: true,
    loanInterestRate: "2",
    loanInstallments: "12",
    loanFrequency: "MENSUAL",
    loanHasLateFee: true,
    loanLateFeeRate: "0.1"
  });
  assert.equal(resultado.valido, true);
  assert.equal(resultado.tipo, "PRESTAMO_CUOTAS");
  assert.equal(resultado.datos.prestamo_total_cuotas, 12);
});

test("valida impuesto sin calcular el tributo", () => {
  const resultado = validarObligacion({
    provider: "SUNAT",
    concept: "Impuesto a la Renta",
    category: "Impuestos",
    amount: "1350",
    dueDate: "2026-10-25",
    taxType: "Impuesto a la Renta",
    taxPeriod: "2025",
    taxOrder: "75821452",
    taxSurcharge: "42.50"
  });
  assert.equal(resultado.valido, true);
  assert.equal(resultado.datos.monto, 1350);
  assert.equal(resultado.datos.impuesto_recargo, 42.5);
});


test("rechaza montos superiores al máximo permitido", () => {
  const resultado = validarObligacion({ ...valido, amount: "10000000000.00" });
  assert.equal(resultado.valido, false);
  assert.ok(resultado.errores.some(e => e.includes("9,999,999,999.99")));
});

test("acepta el monto máximo permitido", () => {
  const resultado = validarObligacion({ ...valido, amount: "9999999999.99" });
  assert.equal(resultado.valido, true);
});

test("rechaza impuesto cuyo monto más recargo supera el máximo", () => {
  const resultado = validarObligacion({
    provider: "SUNAT",
    concept: "Impuesto",
    category: "Impuestos",
    amount: "9999999999.99",
    dueDate: "2026-10-25",
    taxType: "Renta",
    taxPeriod: "2025",
    taxSurcharge: "0.01"
  });
  assert.equal(resultado.valido, false);
  assert.ok(resultado.errores.some(e => e.includes("total del impuesto")));
});

test("rechaza préstamo cuyo total supera el máximo", () => {
  const resultado = validarObligacion({
    provider: "Banco",
    concept: "Préstamo",
    category: "Préstamos",
    dueDate: "2026-11-01",
    loanMode: "UNICO",
    loanCapital: "9999999999.99",
    loanHasInterest: true,
    loanInterestRate: "1",
    loanHasLateFee: false
  });
  assert.equal(resultado.valido, false);
  assert.ok(resultado.errores.some(e => e.includes("total del préstamo")));
});
