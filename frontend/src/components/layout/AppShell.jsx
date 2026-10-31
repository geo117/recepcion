import { useCallback, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiInfo } from "react-icons/fi";
import { useAuth } from "../../hooks/authContext";
import { useInactividad } from "../../hooks/useInactividad";
import { alertaAviso } from "../../utils/alertas";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { cerrarSesion, esModoDemo } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const manejarExpiracion = useCallback(() => {
    cerrarSesion();
    navigate("/login", { replace: true });
    alertaAviso(
      "Sesión cerrada por inactividad",
      "Por seguridad, tu sesión se cerró tras 30 minutos sin actividad.",
    );
  }, [cerrarSesion, navigate]);

  useInactividad({ onExpirar: manejarExpiracion });

  return (
    <div className="app-shell">
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>

      <Sidebar
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
      />

      <div className="app-main">
        <Header onAbrirMenu={() => setMenuAbierto(true)} />

        <main id="contenido" className="app-content">
          {esModoDemo && pathname === "/recepcion" && (
            <div className="aviso-sesion" role="status">
              <FiInfo aria-hidden="true" />
              <span>
                Modo demostración: los datos se guardan en este navegador. Configura
                <code> VITE_API_URL </code>
                para conectar el backend.
              </span>
            </div>
          )}
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>Acceza360 · GYJ Ferreterías S.A. · Uso interno</span>
          <span>Recepción de visitantes v1.0</span>
        </footer>
      </div>
    </div>
  );
}
