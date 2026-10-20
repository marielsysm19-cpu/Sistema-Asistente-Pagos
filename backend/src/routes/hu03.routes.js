
import { Router } from "express";
import { modificarVencimiento } from "../controllers/hu03.controller.js";
import { autenticar } from "../middleware/auth.js";
import { permitirRoles } from "../middleware/role.js";

const router = Router();

router.patch(
  "/:id/vencimiento",
  autenticar,
  permitirRoles("ASISTENTE"),
  modificarVencimiento
);

export default router;
