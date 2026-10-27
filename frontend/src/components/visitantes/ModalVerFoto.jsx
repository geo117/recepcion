import { Modal } from "react-bootstrap";
import { nombreArchivoFoto } from "../../utils/fotos";
import GYJButton from "../ui/GYJButton";

export default function ModalVerFoto({ show = false, nombre = "", foto = "", onHide }) {
  return (
    <Modal
      show={show && Boolean(foto)}
      onHide={onHide}
      centered
      size="lg"
      dialogClassName="gyj-modal"
      className="gyj-modal-foto"
      backdropClassName="gyj-backdrop-foto"
      aria-labelledby="titulo-ver-foto"
    >
      <Modal.Header closeButton>
        <div>
          <Modal.Title id="titulo-ver-foto">
            {nombreArchivoFoto(nombre)}
          </Modal.Title>
          <p className="texto-secundario texto-pequeno mb-0">
            Foto capturada en recepción.
          </p>
        </div>
      </Modal.Header>

      <Modal.Body>
        {foto && (
          <img
            className="foto-visita__completa"
            src={foto}
            alt={`Foto de ${nombre || "visitante"}`}
          />
        )}
      </Modal.Body>

      <Modal.Footer>
        <GYJButton variant="ghost" onClick={onHide}>
          Cerrar
        </GYJButton>
      </Modal.Footer>
    </Modal>
  );
}
