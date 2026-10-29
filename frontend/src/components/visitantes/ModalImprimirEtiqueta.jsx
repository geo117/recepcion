import { Modal } from "react-bootstrap";
import { FiCamera, FiPrinter } from "react-icons/fi";
import { alertaExito } from "../../utils/alertas";
import { formatearFecha, formatearHora } from "../../utils/fecha";
import { empresaPorCodigo } from "../../utils/usuarios";
import GYJButton from "../ui/GYJButton";

function Dato({ etiqueta, valor }) {
  return (
    <div className="etiqueta-visita__campo">
      <span className="etiqueta-visita__etiqueta">{etiqueta}</span>
      <span className="etiqueta-visita__valor">{valor}</span>
    </div>
  );
}

export default function ModalImprimirEtiqueta({ visitante, onHide }) {
  const empresaRegistro =
    visitante?.companyNombre ||
    empresaPorCodigo(visitante?.companyReg) ||
    "GYJ Ferreterías";

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
                    {empresaRegistro}
                  </span>
                </div>

                <p className="etiqueta-visita__nombre">{visitante.nombre}</p>

                <div className="etiqueta-visita__datos">
                  <Dato etiqueta="Documento" valor={visitante.documento} />
                  <Dato etiqueta="Empresa" valor={empresaRegistro} />
                  <Dato
                    etiqueta="Procedencia"
                    valor={visitante.empresa || "—"}
                  />
                  <Dato
                    etiqueta="Área que visita"
                    valor={visitante.motivo || "—"}
                  />
                  <Dato
                    etiqueta="Fecha"
                    valor={formatearFecha(visitante.fecha)}
                  />
                  <Dato
                    etiqueta="Hora"
                    valor={formatearHora(visitante.horaEntrada)}
                  />
                  <Dato etiqueta="RH" valor={visitante.rh || "—"} />
                  <Dato
                    etiqueta="Teléfono de emergencia"
                    valor={visitante.telefonoEmergencia || "—"}
                  />
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
