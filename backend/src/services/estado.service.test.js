import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularEstado,
  agregarEstado,
  agregarEstados
} from "./estado.service.js";

const HOY = "2026-10-18";

test("Una obligación pagada debe tener estado PAGADO", () => {
  const obligacion = {
    fecha_vencimiento: "2026-10-10",
    fecha_pago: "2026-10-09"
  };

  assert.equal(
    calcularEstado(obligacion, HOY),
    "PAGADO"
  );
});

test("Una obligación sin pago y vencida debe tener estado VENCIDO", () => {
  const obligacion = {
    fecha_vencimiento: "2026-10-10",
    fecha_pago: null
  };

  assert.equal(
    calcularEstado(obligacion, HOY),
    "VENCIDO"
  );
});

test("Una obligación que vence hoy debe continuar PENDIENTE", () => {
  const obligacion = {
    fecha_vencimiento: "2026-10-18",
    fecha_pago: null
  };

  assert.equal(
    calcularEstado(obligacion, HOY),
    "PENDIENTE"
  );
});

test("Una obligación futura debe tener estado PENDIENTE", () => {
  const obligacion = {
    fecha_vencimiento: "2026-10-25",
    fecha_pago: null
  };

  assert.equal(
    calcularEstado(obligacion, HOY),
    "PENDIENTE"
  );
});

test("PAGADO tiene prioridad aunque la fecha de vencimiento sea antigua", () => {
  const obligacion = {
    fecha_vencimiento: "2026-01-01",
    fecha_pago: "2026-01-02"
  };

  assert.equal(
    calcularEstado(obligacion, HOY),
    "PAGADO"
  );
});

test("agregarEstado incorpora el estado calculado", () => {
  const obligacion = {
    id: "1",
    concepto: "Internet",
    fecha_vencimiento: "2026-10-25",
    fecha_pago: null
  };

  const resultado = agregarEstado(obligacion, HOY);

  assert.equal(resultado.estado, "PENDIENTE");
  assert.equal(resultado.concepto, "Internet");
});

test("agregarEstados calcula los estados de varias obligaciones", () => {
  const obligaciones = [
    {
      fecha_vencimiento: "2026-10-10",
      fecha_pago: null
    },
    {
      fecha_vencimiento: "2026-10-25",
      fecha_pago: null
    },
    {
      fecha_vencimiento: "2026-10-15",
      fecha_pago: "2026-10-14"
    }
  ];

  const resultado = agregarEstados(obligaciones, HOY);

  assert.deepEqual(
    resultado.map((item) => item.estado),
    ["VENCIDO", "PENDIENTE", "PAGADO"]
  );
});