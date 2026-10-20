import { Router } from "express";
import { autenticar } from "../middleware/auth.js";
import { permitirRoles } from "../middleware/role.js";
import { obtenerComprobante, verificarComprobante } from "../controllers/hu06.controller.js";

const router = Router();

router.get(
  "/pagos/:id/comprobante",
  autenticar,
  permitirRoles("GERENTE", "ASISTENTE"),
  obtenerComprobante
);

router.patch(
  "/pagos/:id/comprobante/verificacion",
  autenticar,
  permitirRoles("GERENTE"),
  verificarComprobante
);

export default router;
