import {
  supabase,
  crearClienteUsuario
} from "../config/supabase.js";

export async function autenticar(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        mensaje: "Usuario no autenticado"
      });
    }

    const token = authorization.split(" ")[1];

    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        mensaje: "Sesión inválida o vencida"
      });
    }

    const clienteUsuario = crearClienteUsuario(token);

    const { data: perfil, error: perfilError } =
      await clienteUsuario
        .from("profiles")
        .select("id, nombre, rol")
        .eq("id", user.id)
        .single();

    if (perfilError || !perfil) {
      return res.status(403).json({
        mensaje: "No se encontró el perfil del usuario"
      });
    }

    req.user = user;
    req.perfil = perfil;
    req.supabase = clienteUsuario;
    req.accessToken = token;

    next();
  } catch (error) {
    console.error("Error de autenticación:", error);

    res.status(500).json({
      mensaje: "Error al validar la sesión"
    });
  }
}