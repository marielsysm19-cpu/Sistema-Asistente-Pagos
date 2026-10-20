import { Router } from "express";
import { registrarObligacion } from "../controllers/hu01.controller.js";
import { autenticar } from "../middleware/auth.js";
import { permitirRoles } from "../middleware/role.js";

const router = Router();

router.post(
  "/",
  autenticar,
  permitirRoles("ASISTENTE"),
  registrarObligacion
);

export default router;
