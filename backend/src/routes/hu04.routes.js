import { Router } from "express";
import multer from "multer";

import {
  registrarPago
} from "../controllers/hu04.controller.js";

import {
  autenticar
} from "../middleware/auth.js";

import {
  permitirRoles
} from "../middleware/role.js";

import {
  TAMANO_MAXIMO_COMPROBANTE,
  TIPOS_COMPROBANTE_PERMITIDOS
} from "../services/hu04.service.js";


const router = Router();


const upload = multer({

  storage: multer.memoryStorage(),

  limits: {
    fileSize: TAMANO_MAXIMO_COMPROBANTE
  },

  fileFilter: (req, file, callback) => {

    if (
      !TIPOS_COMPROBANTE_PERMITIDOS.includes(
        file.mimetype
      )
    ) {
      return callback(
        new Error(
          "Formato de archivo no permitido"
        )
      );
    }

    callback(null, true);
  }
});


function procesarComprobante(req, res, next) {

  upload.single("receipt")(
    req,
    res,
    (error) => {

      if (error instanceof multer.MulterError) {

        if (error.code === "LIMIT_FILE_SIZE") {

          return res.status(400).json({
            mensaje:
              "El comprobante supera el tamaño máximo de 5 MB"
          });
        }

        return res.status(400).json({
          mensaje:
            "Error al procesar el comprobante"
        });
      }


      if (error) {

        return res.status(400).json({
          mensaje: error.message
        });
      }


      next();
    }
  );
}


router.post(
  "/:id/registrar-pago",

  autenticar,

  permitirRoles("ASISTENTE"),

  procesarComprobante,

  registrarPago
);


export default router;