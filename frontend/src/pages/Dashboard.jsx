import { useState } from "react";
import { FiUserPlus } from "react-icons/fi";
import { hoyTexto } from "../utils/fecha";
import GYJButton from "../components/ui/GYJButton";
import ListaVisitantes from "../components/visitantes/ListaVisitantes";
import ModalAgregarVisita from "../components/visitantes/ModalAgregarVisita";

export default function Dashboard() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const manejarRegistrado = () => setRecarga((actual) => actual + 1);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__titulo">Recepción</h1>
          <p className="page-head__descripcion">
            {hoyTexto()} · Registra la entrada de cada visitante y consulta el
            historial de la oficina.
          </p>
        </div>
        <div className="page-head__acciones">
          <GYJButton icono={FiUserPlus} onClick={() => setModalAbierto(true)}>
            Agregar visita
          </GYJButton>
        </div>
      </div>

      <ListaVisitantes recarga={recarga} />

      <ModalAgregarVisita
        show={modalAbierto}
        onHide={() => setModalAbierto(false)}
        onRegistrado={manejarRegistrado}
      />
    </>
  );
}
