import {
  supabase,
  crearClienteUsuario
} from "../config/supabase.js";

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son obligatorios"
      });
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos"
      });
    }

    const clienteUsuario =
      crearClienteUsuario(data.session.access_token);

    const { data: perfil, error: perfilError } =
      await clienteUsuario
        .from("profiles")
        .select("id, nombre, rol")
        .eq("id", data.user.id)
        .single();

    if (perfilError || !perfil) {
      return res.status(403).json({
        mensaje: "No se pudo obtener el perfil del usuario"
      });
    }

    return res.json({
      mensaje: "Inicio de sesión correcto",
      usuario: {
        id: data.user.id,
        email: data.user.email,
        nombre: perfil.nombre,
        rol: perfil.rol
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    });

  } catch (error) {
    console.error("Error en login:", error);

    return res.status(500).json({
      mensaje: "Error interno del servidor"
    });
  }
}

export async function obtenerSesion(req, res) {
  return res.json({
    usuario: {
      id: req.user.id,
      email: req.user.email,
      nombre: req.perfil.nombre,
      rol: req.perfil.rol
    }
  });
}