import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiUsers } from "react-icons/fi";
import { api } from "../services/api";
import { alertaError, alertaTemporal, confirmarAccion } from "../utils/alertas";
import { hoyISO, hoyTexto } from "../utils/fecha";
import RegistroRapido from "../components/visitantes/RegistroRapido";
import TablaUltimos from "../components/visitantes/TablaUltimos";

export default function Dashboard() {
  const [ultimos, setUltimos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [registrandoId, setRegistrandoId] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;

    api
      .listarVisitas({ fecha: hoyISO(), limite: 5 })
      .then((resultado) => {
        if (activo) setUltimos(resultado.datos);
      })
      .catch(() => {
        if (activo) {
          setError(
            "No se pudo conectar con el servidor. Verifica la conexión e intenta nuevamente.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [version]);

  const cargarUltimos = () => {
    setCargando(true);
    setError("");
    setVersion((actual) => actual + 1);
  };

  const manejarSalida = async (visitante) => {
    const confirmado = await confirmarAccion(
      "Registrar salida",
      `¿Confirmas la salida de ${visitante.nombre}? Se guardará la hora actual.`,
      { confirmar: "Registrar salida" },
    );
    if (!confirmado) return;

    setRegistrandoId(visitante.id);
    try {
      await api.registrarSalida(visitante.id);
      cargarUltimos();
      alertaTemporal(
        "Salida registrada",
        `${visitante.nombre} ya no aparece como visitante dentro de la oficina.`,
      );
    } catch (fallo) {
      await alertaError(
        "No se pudo registrar la salida",
        fallo?.message?.includes("conectar")
          ? "No se pudo conectar con el servidor. Intenta nuevamente."
          : "Intenta nuevamente en unos segundos.",
      );
    } finally {
      setRegistrandoId("");
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__titulo">Recepción</h1>
          <p className="page-head__descripcion">
            {hoyTexto()} · Registra la entrada de cada visitante y consulta los
            movimientos del día.
          </p>
        </div>
        <div className="page-head__acciones">
          <Link className="btn gyj-btn gyj-btn--outline" to="/recepcion/visitantes">
            <FiUsers aria-hidden="true" />
            <span>Ver visitantes</span>
          </Link>
        </div>
      </div>

      <RegistroRapido onRegistrado={cargarUltimos} />

      <TablaUltimos
        visitantes={ultimos}
        cargando={cargando}
        error={error}
        onReintentar={cargarUltimos}
        onRegistrarSalida={manejarSalida}
        registrandoId={registrandoId}
      />
    </>
  );
}
