import { NavLink } from "react-router-dom";
import {
  FiBarChart2,
  FiHome,
  FiShield,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../hooks/authContext";

const ENLACES = [
  { ruta: "/recepcion", etiqueta: "Recepción", icono: FiHome, fin: true },
  {
    ruta: "/recepcion/reportes",
    etiqueta: "Reportes",
    icono: FiBarChart2,
    soloAdmin: true,
  },
  {
    ruta: "/administracion",
    etiqueta: "Administración",
    icono: FiShield,
    soloAdmin: true,
  },
];

export default function Sidebar({ abierto = false, onCerrar }) {
  const { usuario, esAdmin } = useAuth();
  const enlaces = ENLACES.filter((enlace) => !enlace.soloAdmin || esAdmin);
  const nombreEmpresa = esAdmin
    ? "GYJ Ferreterías"
    : usuario?.empresa || "GYJ Ferreterías";

  return (
    <>
      {abierto && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar menú de navegación"
          onClick={onCerrar}
        />
      )}

      <aside
        className={`sidebar ${abierto ? "sidebar--abierto" : ""}`.trim()}
        aria-label="Navegación principal"
      >
        <button
          type="button"
          className="sidebar__cerrar"
          aria-label="Cerrar menú"
          onClick={onCerrar}
        >
          <FiX aria-hidden="true" />
        </button>

        <div className="sidebar__marca">
          <span className="sidebar__logo" aria-hidden="true">
            GYJ
          </span>
          <div className="sidebar__marca-texto">
            <p className="sidebar__marca-nombre" title={nombreEmpresa}>
              {nombreEmpresa}
            </p>
            <p className="sidebar__marca-sub">Recepción de visitantes</p>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Módulos del sistema">
          <p className="sidebar__seccion">Operación</p>
          {enlaces.map(({ ruta, etiqueta, icono: Icono, fin }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={fin}
              className={({ isActive }) =>
                `sidebar__enlace ${isActive ? "active" : ""}`.trim()
              }
              onClick={onCerrar}
            >
              <Icono aria-hidden="true" />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__pie">
          <span className="sidebar__estado">Turno activo</span>
          <span className="sidebar__marca-sub">
            {usuario?.nombre ?? "Sesión sin iniciar"}
          </span>
        </div>
      </aside>
    </>
  );
}
