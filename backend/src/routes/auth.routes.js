import { Router } from "express";
import {
  login,
  obtenerSesion
} from "../controllers/auth.controller.js";
import { autenticar } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", autenticar, obtenerSesion);

export default router;