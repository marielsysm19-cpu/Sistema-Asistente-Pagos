import { Router } from "express";
import { obtenerPagosDelMes } from "../controllers/hu02.controller.js";

const router = Router();

// HU02 - Visualizar las obligaciones correspondientes a un mes.
router.get("/pagos", obtenerPagosDelMes);

export default router;