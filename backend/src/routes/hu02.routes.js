import { Router } from "express";
import { obtenerPagosDelMes } from "../controllers/hu02.controller.js";
import { autenticar } from "../middleware/auth.js";
import { permitirRoles } from "../middleware/role.js";

const router = Router();

// HU02 - Visualizar las obligaciones correspondientes a un mes.
// ASISTENTE y GERENTE pueden consultar la vista mensual.
router.get(
  "/pagos",
  autenticar,
  permitirRoles("ASISTENTE", "GERENTE"),
  obtenerPagosDelMes
);

export default router;