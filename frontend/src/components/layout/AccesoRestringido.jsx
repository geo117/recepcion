import { Link } from "react-router-dom";
import { FiLock } from "react-icons/fi";

export default function AccesoRestringido({ modulo = "este módulo" }) {
  return (
    <div className="estado-pantalla">
      <span className="estado-pantalla__icono" aria-hidden="true">
        <FiLock />
      </span>
      <h2>Acceso restringido</h2>
      <p>
        El módulo de {modulo} está disponible únicamente para administración.
        Si necesitas esta información, solicítala a tu supervisora.
      </p>
      <Link className="btn gyj-btn gyj-btn--primary" to="/recepcion">
        Volver a recepción
      </Link>
    </div>
  );
}
