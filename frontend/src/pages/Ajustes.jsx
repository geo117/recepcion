import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiDatabase,
  FiLogOut,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../hooks/authContext";
import { api } from "../services/api";
import { decodificarToken } from "../services/sesion";
import {
  alertaError,
  alertaExito,
  confirmarAccion,
} from "../utils/alertas";
import { formatearFechaHora } from "../utils/fecha";
import { iniciales } from "../utils/validaciones";
import GYJButton from "../components/ui/GYJButton";
import GYJCard from "../components/ui/GYJCard";

export default function Ajustes() {
  const {
    usuario,
    sesion,
    cerrarSesion,
    esModoDemo,
  } = useAuth();
  const navigate = useNavigate();
  const [restableciendo, setRestableciendo] = useState(false);

  const payload = decodificarToken(sesion?.token);
  const expiracion = payload?.exp
    ? formatearFechaHora(new Date(payload.exp * 1000).toISOString())
    : "Al cerrar el navegador";

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

  const restablecerDemo = async () => {
    const confirmado = await confirmarAccion(
      "Restablecer datos de demostración",
      "Se eliminarán los visitantes que hayas registrado y se restaurarán los datos de ejemplo.",
      { confirmar: "Restablecer datos" },
    );
    if (!confirmado) return;

    setRestableciendo(true);
    try {
      await api.reiniciarDemo();
      await alertaExito(
        "Datos restablecidos",
        "La demostración volvió a su estado inicial.",
      );
      navigate("/recepcion");
    } catch {
      await alertaError(
        "No se pudieron restablecer los datos",
        "Intenta nuevamente en unos segundos.",
      );
    } finally {
      setRestableciendo(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__titulo">Ajustes</h1>
          <p className="page-head__descripcion">
            Información de tu cuenta y opciones de seguridad de la sesión.
          </p>
        </div>
      </div>

      <div className="ajustes-grid">
        <GYJCard>
          <div className="ajustes-perfil">
            <span className="ajustes-perfil__avatar" aria-hidden="true">
              {iniciales(usuario?.nombre)}
            </span>
            <div>
              <h2 className="gyj-card__titulo">{usuario?.nombre}</h2>
              <p className="texto-secundario texto-pequeno">
                {usuario?.cargo}
              </p>
            </div>
          </div>

          <ul className="ajustes-lista">
            <li>
              <span>Usuario</span>
              <span>{usuario?.usuario}</span>
            </li>
            <li>
              <span>Rol</span>
              <span>
                {usuario?.rol === "admin" ? "Administradora" : "Recepcionista"}
              </span>
            </li>
            <li>
              <span>Empresa</span>
              <span>{usuario?.empresa ?? "GYJ Ferreterías"}</span>
            </li>
            <li>
              <span>Cierre de sesión automático</span>
              <span>30 min de inactividad</span>
            </li>
          </ul>
        </GYJCard>

        <GYJCard
          titulo="Seguridad de la sesión"
          descripcion="Tu acceso está protegido y se cierra automáticamente por inactividad."
        >
          <div className="meta-lista">
            <div className="meta-lista__item">
              <FiShield aria-hidden="true" />
              <div>
                <p className="meta-lista__etiqueta">Almacenamiento del token</p>
                <p className="meta-lista__valor">
                  sessionStorage (se borra al cerrar la pestaña)
                </p>
              </div>
            </div>
            <div className="meta-lista__item">
              <FiUser aria-hidden="true" />
              <div>
                <p className="meta-lista__etiqueta">Sesión válida hasta</p>
                <p className="meta-lista__valor">{expiracion}</p>
              </div>
            </div>
            <div className="meta-lista__item">
              <FiDatabase aria-hidden="true" />
              <div>
                <p className="meta-lista__etiqueta">Restablecer contraseña</p>
                <p className="meta-lista__valor">
                  Contacta a Tecnología de la Información (ext. 214)
                </p>
              </div>
            </div>
          </div>

          <div className="detalle-acciones">
            <GYJButton variant="outline" icono={FiLogOut} onClick={manejarSalida}>
              Cerrar sesión
            </GYJButton>
          </div>
        </GYJCard>

        {esModoDemo && (
          <GYJCard
            titulo="Datos de demostración"
            descripcion="Este entorno guarda la información en el navegador. Puedes restaurar los datos de ejemplo cuando lo necesites."
          >
            <GYJButton
              variant="ghost"
              icono={FiDatabase}
              onClick={restablecerDemo}
              cargando={restableciendo}
            >
              Restablecer datos de ejemplo
            </GYJButton>
          </GYJCard>
        )}
      </div>
    </>
  );
}
