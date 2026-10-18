import test from "node:test";
import assert from "node:assert/strict";

import {
  fechaPagoValida,
  sanitizarNombreArchivo,
  construirStoragePath,
  validarComprobante
} from "./hu04.service.js";


test(
  "Debe aceptar una fecha de pago válida",
  () => {
    assert.equal(
      fechaPagoValida("2026-10-18"),
      true
    );
  }
);


test(
  "Debe rechazar una fecha inexistente",
  () => {
    assert.equal(
      fechaPagoValida("2026-02-31"),
      false
    );
  }
);


test(
  "Debe rechazar una fecha con formato incorrecto",
  () => {
    assert.equal(
      fechaPagoValida("18/10/2026"),
      false
    );
  }
);


test(
  "Debe aceptar un comprobante PDF",
  () => {
    const archivo = {
      mimetype: "application/pdf",
      size: 500000
    };

    assert.equal(
      validarComprobante(archivo).valido,
      true
    );
  }
);


test(
  "Debe aceptar una imagen JPEG",
  () => {
    const archivo = {
      mimetype: "image/jpeg",
      size: 500000
    };

    assert.equal(
      validarComprobante(archivo).valido,
      true
    );
  }
);


test(
  "Debe aceptar una imagen PNG",
  () => {
    const archivo = {
      mimetype: "image/png",
      size: 500000
    };

    assert.equal(
      validarComprobante(archivo).valido,
      true
    );
  }
);


test(
  "Debe rechazar formatos no permitidos",
  () => {
    const archivo = {
      mimetype: "application/exe",
      size: 1000
    };

    assert.equal(
      validarComprobante(archivo).valido,
      false
    );
  }
);


test(
  "Debe rechazar un comprobante mayor a 5 MB",
  () => {
    const archivo = {
      mimetype: "application/pdf",
      size: 6 * 1024 * 1024
    };

    assert.equal(
      validarComprobante(archivo).valido,
      false
    );
  }
);


test(
  "Debe rechazar si no existe comprobante",
  () => {
    assert.equal(
      validarComprobante(null).valido,
      false
    );
  }
);


test(
  "Debe limpiar caracteres problemáticos del nombre",
  () => {
    assert.equal(
      sanitizarNombreArchivo(
        "comprobante pago #1.pdf"
      ),
      "comprobante_pago__1.pdf"
    );
  }
);


test(
  "Debe generar una ruta de Storage",
  () => {
    const resultado =
      construirStoragePath(
        "usuario-1",
        "obligacion-1",
        "pago.pdf",
        123456
      );

    assert.equal(
      resultado,
      "usuario-1/obligacion-1/123456-pago.pdf"
    );
  }
);