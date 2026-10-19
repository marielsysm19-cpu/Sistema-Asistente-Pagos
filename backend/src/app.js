import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import hu01Routes from "./routes/hu01.routes.js";
import hu04Routes from "./routes/hu04.routes.js";

const app = express();

app.use(cors());
app.use(express.json());


app.get("/api/health", (req, res) => {
  res.json({
    estado: "ok",
    mensaje: "API Sistema Asistente de Pagos funcionando"
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/pagos", hu01Routes);
app.use("/api/pagos", hu04Routes);

app.use("/api/pagos", hu04Routes);


// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    mensaje: "Ruta no encontrada"
  });
});


export default app;