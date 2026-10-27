import { useNavigate, useLocation } from "react-router-dom";
import { FiLogOut, FiMenu } from "react-icons/fi";
import { useAuth } from "../../hooks/authContext";
import { confirmarAccion } from "../../utils/alertas";
import { formatearFecha, hoyISO } from "../../utils/fecha";
import { iniciales } from "../../utils/validaciones";
import GYJButton from "../ui/GYJButton";

function nombreSeccion(pathname) {
  if (pathname.startsWith("/recepcion/visitantes/")) return "Detalle del visitante";
  if (pathname.startsWith("/recepcion/reportes")) return "Reportes";
  if (pathname.startsWith("/administracion")) return "Administración";
  if (pathname.startsWith("/recepcion")) return "Recepción";
  return "Panel";
}

export default function Header({ onAbrirMenu }) {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const manejarSalida = async () => {
    const confirmado = await confirmarAccion(
      "¿Cerrar sesión?",
      "Se eliminarán los datos de la sesión actual en este navegador.",
      { confirmar: "Cerrar sesión", cancelar: "Seguir aquí" },
    );

    if (!confirmado) return;
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  return (
    <header className="app-header">
      <button
        type="button"
        className="app-header__menu"
        aria-label="Abrir menú de navegación"
        onClick={onAbrirMenu}
      >
        <FiMenu aria-hidden="true" />
      </button>

      <div className="app-header__ruta" aria-label="Ubicación actual">
        <span>GYJ</span>
        <span aria-hidden="true">/</span>
        <strong>{nombreSeccion(pathname)}</strong>
      </div>

      <div className="app-header__acciones">
        <span className="app-header__fecha">{formatearFecha(hoyISO())}</span>

        <div className="app-header__usuario">
          <span className="app-header__avatar" aria-hidden="true">
            {iniciales(usuario?.nombre)}
          </span>
          <div className="app-header__datos">
            <span className="app-header__nombre">{usuario?.nombre}</span>
            <span className="app-header__rol">
              {usuario?.rol === "admin" ? "Administradora" : "Recepcionista"}
            </span>
          </div>
        </div>

        <GYJButton
          variant="ghost"
          className="gyj-btn--icono"
          icono={FiLogOut}
          onClick={manejarSalida}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        />
      </div>
    </header>
  );
}
