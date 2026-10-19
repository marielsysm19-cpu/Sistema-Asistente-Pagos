import { Router } from "express";
import {
  registrarObligacion,
  listarPagosMes
} from "../controllers/hu01.controller.js";
import { autenticar } from "../middleware/auth.js";
import { permitirRoles } from "../middleware/role.js";

const router = Router();

// Listar las obligaciones del mes de vencimiento.
router.get("/", autenticar, listarPagosMes);

// Crear solo como ASISTENTE. El middleware protege también llamadas directas a la API.
router.post("/", autenticar, permitirRoles("ASISTENTE"), registrarObligacion);

export default router;