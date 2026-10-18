export function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.perfil) {
      return res.status(401).json({
        mensaje: "Usuario no autenticado"
      });
    }

    if (!rolesPermitidos.includes(req.perfil.rol)) {
      return res.status(403).json({
        mensaje: "No tienes permisos para realizar esta acción"
      });
    }

    next();
  };
}