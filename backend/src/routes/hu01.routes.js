import { Router } from "express";
import { registrarObligacion } from "../controllers/hu01.controller.js";
import { autenticar } from "../middleware/auth.js";
import { permitirRoles } from "../middleware/role.js";

const router = Router();

// Crear obligación solo como ASISTENTE.
router.post(
  "/",
  autenticar,
  permitirRoles("ASISTENTE"),
  registrarObligacion
);

export default router;