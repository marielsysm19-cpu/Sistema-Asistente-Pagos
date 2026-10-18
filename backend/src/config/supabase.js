import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en el archivo .env"
  );
}

const opciones = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
};

// Cliente general: login y validación de tokens
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  opciones
);

// Cliente asociado al usuario autenticado.
// Este cliente permite que Supabase aplique nuestras políticas RLS.
export function crearClienteUsuario(accessToken) {
  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      ...opciones,
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}