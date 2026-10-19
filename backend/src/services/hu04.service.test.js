import test from "node:test";
import assert from "node:assert/strict";

import {
  fechaPagoValida,
  sanitizarNombreArchivo,
  construirStoragePath,
  validarComprobante
} from "./hu04.service.js";


const HOY = "2026-10-18";

const PDF_REAL = Buffer.from(
  "%PDF-1.4\narchivo de prueba"
);

const JPEG_REAL = Buffer.from([
  0xff,
  0xd8,
  0xff,
  0xe0,
  0x00
]);

const PNG_REAL = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a
]);


test(
  "Debe aceptar una fecha de pago válida",
  () => {
    assert.equal(
      fechaPagoValida(
        "2026-10-18",
        HOY
      ),
      true
    );
  }
);


test(
  "Debe rechazar una fecha inexistente",
  () => {
    assert.equal(
      fechaPagoValida(
        "2026-02-31",
        HOY
      ),
      false
    );
  }
);


test(
  "Debe rechazar una fecha con formato incorrecto",
  () => {
    assert.equal(
      fechaPagoValida(
        "18/10/2026",
        HOY
      ),
      false
    );
  }
);


test(
  "Debe rechazar una fecha de pago futura",
  () => {
    assert.equal(
      fechaPagoValida(
        "2099-01-01",
        HOY
      ),
      false
    );
  }
);


test(
  "Debe aceptar un comprobante PDF real",
  () => {
    const archivo = {
      mimetype: "application/pdf",
      size: PDF_REAL.length,
      buffer: PDF_REAL
    };

    assert.equal(
      validarComprobante(archivo).valido,
      true
    );
  }
);


test(
  "Debe aceptar una imagen JPEG real",
  () => {
    const archivo = {
      mimetype: "image/jpeg",
      size: JPEG_REAL.length,
      buffer: JPEG_REAL
    };

    assert.equal(
      validarComprobante(archivo).valido,
      true
    );
  }
);


test(
  "Debe aceptar una imagen PNG real",
  () => {
    const archivo = {
      mimetype: "image/png",
      size: PNG_REAL.length,
      buffer: PNG_REAL
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
      mimetype: "text/plain",
      size: 10,
      buffer: Buffer.from("texto")
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
      size: 6 * 1024 * 1024,
      buffer: PDF_REAL
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
  "Debe rechazar un archivo vacío",
  () => {
    const archivo = {
      mimetype: "application/pdf",
      size: 0,
      buffer: Buffer.alloc(0)
    };

    assert.equal(
      validarComprobante(archivo).valido,
      false
    );
  }
);


test(
  "Debe rechazar un TXT disfrazado de PDF",
  () => {
    const falsoPdf = Buffer.from(
      "Este archivo realmente es texto"
    );

    const archivo = {
      mimetype: "application/pdf",
      size: falsoPdf.length,
      buffer: falsoPdf
    };

    assert.equal(
      validarComprobante(archivo).valido,
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