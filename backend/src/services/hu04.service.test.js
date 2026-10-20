import test from "node:test";
import assert from "node:assert/strict";
import {
  fechaPagoValida,
  validarComprobante,
  validarDatosMedioPago
} from "./hu04.service.js";

const HOY = "2026-10-20";
const PDF_REAL = Buffer.from("%PDF-1.4\narchivo de prueba");

test("acepta fecha de pago válida", () => {
  assert.equal(fechaPagoValida("2026-10-20", HOY), true);
});

test("rechaza fecha futura", () => {
  assert.equal(fechaPagoValida("2026-10-21", HOY), false);
});

test("acepta PDF real", () => {
  const archivo = {
    mimetype: "application/pdf",
    size: PDF_REAL.length,
    buffer: PDF_REAL
  };
  assert.equal(validarComprobante(archivo).valido, true);
});

test("rechaza falso PDF", () => {
  const buffer = Buffer.from("texto que no es pdf");
  assert.equal(validarComprobante({
    mimetype: "application/pdf",
    size: buffer.length,
    buffer
  }).valido, false);
});

test("valida datos de Yape", () => {
  const r = validarDatosMedioPago({
    metodoPago: "YAPE",
    codigoOperacion: "34758141",
    pagadorNombre: "Marielsys Martino",
    montoPagado: "150.00"
  });
  assert.equal(r.valido, true);
  assert.equal(r.datos.metodo_pago, "YAPE");
});

test("tarjeta exige últimos cuatro dígitos", () => {
  const r = validarDatosMedioPago({
    metodoPago: "TARJETA",
    codigoOperacion: "AUTH-123",
    pagadorNombre: "Marielsys Martino",
    tarjetaMarca: "VISA",
    tarjetaUltimos4: "12"
  });
  assert.equal(r.valido, false);
});

test("transferencia exige banco", () => {
  const r = validarDatosMedioPago({
    metodoPago: "TRANSFERENCIA",
    codigoOperacion: "OP-123",
    pagadorNombre: "Marielsys Martino"
  });
  assert.equal(r.valido, false);
});


test("Yape exige exactamente 8 dígitos", () => {
  for (const codigo of ["1234567", "123456789", "1234A678", "1234-678"]) {
    const r = validarDatosMedioPago({
      metodoPago: "YAPE",
      codigoOperacion: codigo,
      pagadorNombre: "Marielsys Martino",
      montoPagado: "150.00"
    });
    assert.equal(r.valido, false, codigo);
  }
});

test("tarjeta permite hasta 20 caracteres en autorización", () => {
  const valido = validarDatosMedioPago({
    metodoPago: "TARJETA",
    codigoOperacion: "AUTH-123456789012345",
    pagadorNombre: "Marielsys Martino",
    montoPagado: "150",
    tarjetaMarca: "VISA",
    tarjetaUltimos4: "4582"
  });
  assert.equal(valido.valido, true);

  const largo = validarDatosMedioPago({
    metodoPago: "TARJETA",
    codigoOperacion: "AUTH-12345678901234567890",
    pagadorNombre: "Marielsys Martino",
    montoPagado: "150",
    tarjetaMarca: "VISA",
    tarjetaUltimos4: "4582"
  });
  assert.equal(largo.valido, false);
});

test("transferencia permite referencia de hasta 30 caracteres", () => {
  const r = validarDatosMedioPago({
    metodoPago: "TRANSFERENCIA",
    codigoOperacion: "TRX-20261020-583921",
    pagadorNombre: "Marielsys Martino",
    montoPagado: "150",
    bancoOrigen: "BCP"
  });
  assert.equal(r.valido, true);
});

test("efectivo no exige código de operación", () => {
  const r = validarDatosMedioPago({
    metodoPago: "EFECTIVO",
    codigoOperacion: "",
    pagadorNombre: "Marielsys Martino",
    montoPagado: "150"
  });
  assert.equal(r.valido, true);
  assert.equal(r.datos.codigo_operacion, null);
});


test("rechaza monto pagado superior al máximo", () => {
  const r = validarDatosMedioPago({
    metodoPago: "EFECTIVO",
    codigoOperacion: "",
    pagadorNombre: "Marielsys Martino",
    montoPagado: "10000000000.00"
  });
  assert.equal(r.valido, false);
  assert.ok(r.errores.some(e => e.includes("9,999,999,999.99")));
});

test("rechaza monto pagado con más de dos decimales", () => {
  const r = validarDatosMedioPago({
    metodoPago: "EFECTIVO",
    codigoOperacion: "",
    pagadorNombre: "Marielsys Martino",
    montoPagado: "150.123"
  });
  assert.equal(r.valido, false);
  assert.ok(r.errores.some(e => e.includes("dos decimales")));
});
