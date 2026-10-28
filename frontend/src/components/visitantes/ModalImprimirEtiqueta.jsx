import { Modal } from "react-bootstrap";
import { FiCamera, FiPrinter } from "react-icons/fi";
import { alertaExito } from "../../utils/alertas";
import { formatearFecha, formatearHora } from "../../utils/fecha";
import GYJButton from "../ui/GYJButton";

export default function ModalImprimirEtiqueta({ visitante, onHide }) {
  const imprimir = async () => {
    if (!visitante) return;
    await alertaExito(
      "Etiqueta lista para imprimir",
      `La etiqueta de ${visitante.nombre} está preparada. Conecta la impresora para completar la impresión.`,
    );
  };

  return (
    <Modal
      show={Boolean(visitante)}
      onHide={onHide}
      centered
      size="lg"
      scrollable
      dialogClassName="gyj-modal modal-etiqueta"
      aria-labelledby="titulo-etiqueta-visita"
    >
      <Modal.Header closeButton>
        <div>
          <Modal.Title id="titulo-etiqueta-visita">
            Vista previa de la etiqueta
          </Modal.Title>
          <p className="texto-secundario texto-pequeno mb-0">
            Revisa la información antes de imprimir.
          </p>
        </div>
      </Modal.Header>

      {visitante && (
        <>
          <Modal.Body>
            <div className="etiqueta-visita">
              <div className="etiqueta-visita__principal">
                <div className="etiqueta-visita__marca">
                  <span className="etiqueta-visita__logo" aria-hidden="true">
                    GYJ
                  </span>
                  <span className="etiqueta-visita__empresa">
                    GYJ Ferreterías
                  </span>
                </div>

                <p className="etiqueta-visita__nombre">{visitante.nombre}</p>

                <div className="etiqueta-visita__fila">
                  <div className="etiqueta-visita__campo">
                    <span className="etiqueta-visita__etiqueta">
                      Documento
                    </span>
                    <span className="etiqueta-visita__valor">
                      {visitante.documento}
                    </span>
                  </div>
                  <div className="etiqueta-visita__campo">
                    <span className="etiqueta-visita__etiqueta">Empresa</span>
                    <span className="etiqueta-visita__valor">
                      {visitante.empresa || "—"}
                    </span>
                  </div>
                </div>

                <div className="etiqueta-visita__fila">
                  <div className="etiqueta-visita__campo">
                    <span className="etiqueta-visita__etiqueta">Fecha</span>
                    <span className="etiqueta-visita__valor">
                      {formatearFecha(visitante.fecha)}
                    </span>
                  </div>
                  <div className="etiqueta-visita__campo">
                    <span className="etiqueta-visita__etiqueta">Hora</span>
                    <span className="etiqueta-visita__valor">
                      {formatearHora(visitante.horaEntrada)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="etiqueta-visita__foto">
                {visitante.foto ? (
                  <img
                    src={visitante.foto}
                    alt={`Foto de ${visitante.nombre}`}
                  />
                ) : (
                  <div className="etiqueta-visita__foto-vacia">
                    <FiCamera aria-hidden="true" />
                    <span>Foto del visitante</span>
                  </div>
                )}
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <GYJButton variant="ghost" onClick={onHide}>
              Cerrar
            </GYJButton>
            <GYJButton icono={FiPrinter} onClick={imprimir}>
              Imprimir etiqueta
            </GYJButton>
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
}
