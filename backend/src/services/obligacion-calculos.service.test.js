import test from "node:test";
import assert from "node:assert/strict";
import {
  diasAtraso,
  calcularMoraPrestamo,
  calcularTotalActual,
  calcularCuotaFrancesa,
  sumarPeriodo
} from "./obligacion-calculos.service.js";

test("calcula días de atraso", () => {
  assert.equal(diasAtraso("2026-10-15", "2026-10-20"), 5);
  assert.equal(diasAtraso("2026-10-20", "2026-10-20"), 0);
});

test("mora diaria aumenta con los días de atraso", () => {
  const prestamo = {
    categoria: "Préstamos",
    monto: 1000,
    fecha_vencimiento: "2026-10-15",
    fecha_pago: null,
    prestamo_aplica_mora: true,
    prestamo_tasa_mora_diaria: 0.1
  };
  assert.equal(calcularMoraPrestamo(prestamo, "2026-10-20"), 5);
  assert.equal(calcularMoraPrestamo(prestamo, "2026-10-21"), 6);
  assert.equal(calcularTotalActual(prestamo, "2026-10-21"), 1006);
});

test("impuesto suma solo el recargo informado", () => {
  const impuesto = {
    categoria: "Impuestos",
    monto: 1350,
    impuesto_recargo: 42.5,
    fecha_vencimiento: "2026-10-15",
    fecha_pago: null
  };
  assert.equal(calcularTotalActual(impuesto, "2026-10-20"), 1392.5);
});

test("calcula cuota francesa con tasa por periodo", () => {
  const cuota = calcularCuotaFrancesa(10000, 2, 12);
  assert.ok(cuota > 945 && cuota < 946);
});

test("genera vencimientos mensuales", () => {
  assert.equal(sumarPeriodo("2026-11-15", "MENSUAL", 1), "2026-12-15");
  assert.equal(sumarPeriodo("2026-11-15", "MENSUAL", 2), "2027-01-15");
});
