import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import { api, esModoDemo } from "../services/api";
import {
  guardarSesion,
  leerSesion,
  limpiarSesion,
} from "../services/sesion";

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => leerSesion());

  const iniciarSesion = useCallback(async ({ usuario, password }) => {
    const resultado = await api.iniciarSesion({ usuario, password });
    guardarSesion(resultado.token, resultado.usuario);
    setSesion({ token: resultado.token, usuario: resultado.usuario });
    return resultado.usuario;
  }, []);

  const cerrarSesion = useCallback(() => {
    limpiarSesion();
    setSesion(null);
  }, []);

  const valor = useMemo(
    () => ({
      sesion,
      usuario: sesion?.usuario ?? null,
      autenticado: Boolean(sesion),
      esAdmin: sesion?.usuario?.rol === "admin",
      iniciarSesion,
      cerrarSesion,
      esModoDemo,
    }),
    [sesion, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
