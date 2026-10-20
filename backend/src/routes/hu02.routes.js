import { Router } from "express";
import {
  obtenerPagosDelMes,
  obtenerPagoPorId
} from "../controllers/hu02.controller.js";
import { autenticar } from "../middleware/auth.js";
import { permitirRoles } from "../middleware/role.js";

const router = Router();

router.get(
  "/pagos",
  autenticar,
  permitirRoles("ASISTENTE", "GERENTE"),
  obtenerPagosDelMes
);

router.get(
  "/pagos/:id",
  autenticar,
  permitirRoles("ASISTENTE", "GERENTE"),
  obtenerPagoPorId
);

export default router;
