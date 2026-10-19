import test from "node:test";
import assert from "node:assert/strict";

import { permitirRoles } from "./role.js";

function crearRespuesta() {
  return {
    statusCode: 200,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("Rechaza una petición si no existe un usuario autenticado", () => {
  const req = {};
  const res = crearRespuesta();

  let nextEjecutado = false;

  permitirRoles("ASISTENTE")(
    req,
    res,
    () => {
      nextEjecutado = true;
    }
  );

  assert.equal(res.statusCode, 401);
  assert.equal(
    res.body.mensaje,
    "Usuario no autenticado"
  );
  assert.equal(nextEjecutado, false);
});

test("GERENTE no puede acceder a una operación exclusiva del ASISTENTE", () => {
  const req = {
    perfil: {
      rol: "GERENTE"
    }
  };

  const res = crearRespuesta();

  let nextEjecutado = false;

  permitirRoles("ASISTENTE")(
    req,
    res,
    () => {
      nextEjecutado = true;
    }
  );

  assert.equal(res.statusCode, 403);
  assert.equal(
    res.body.mensaje,
    "No tienes permisos para realizar esta acción"
  );
  assert.equal(nextEjecutado, false);
});

test("ASISTENTE puede acceder a una operación permitida", () => {
  const req = {
    perfil: {
      rol: "ASISTENTE"
    }
  };

  const res = crearRespuesta();

  let nextEjecutado = false;

  permitirRoles("ASISTENTE")(
    req,
    res,
    () => {
      nextEjecutado = true;
    }
  );

  assert.equal(nextEjecutado, true);
});

test("GERENTE puede acceder a una operación permitida para ambos roles", () => {
  const req = {
    perfil: {
      rol: "GERENTE"
    }
  };

  const res = crearRespuesta();

  let nextEjecutado = false;

  permitirRoles(
    "GERENTE",
    "ASISTENTE"
  )(
    req,
    res,
    () => {
      nextEjecutado = true;
    }
  );

  assert.equal(nextEjecutado, true);
});

test("ASISTENTE puede acceder a una operación permitida para ambos roles", () => {
  const req = {
    perfil: {
      rol: "ASISTENTE"
    }
  };

  const res = crearRespuesta();

  let nextEjecutado = false;

  permitirRoles(
    "GERENTE",
    "ASISTENTE"
  )(
    req,
    res,
    () => {
      nextEjecutado = true;
    }
  );

  assert.equal(nextEjecutado, true);
});