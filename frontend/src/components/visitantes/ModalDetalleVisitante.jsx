import { useState } from "react";
import { Modal } from "react-bootstrap";
import {
  formatearFechaHora,
  formatearFechaLarga,
  formatearHora,
} from "../../utils/fecha";
import { nombreArchivoFoto } from "../../utils/fotos";
import GYJBadge from "../ui/GYJBadge";
import GYJButton from "../ui/GYJButton";
import ModalVerFoto from "./ModalVerFoto";

function Dato({ etiqueta, valor, children, ancho = false }) {
  return (
    <div
      className={`datos-lista__item ${ancho ? "datos-lista__item--ancho" : ""}`.trim()}
    >
      <dt className="datos-lista__etiqueta">{etiqueta}</dt>
      <dd className="datos-lista__valor mb-0">
        {children ?? (valor || "—")}
      </dd>
    </div>
  );
}

export default function ModalDetalleVisitante({ visitante, onHide }) {
  const [verFoto, setVerFoto] = useState(false);

  const cerrar = () => {
    setVerFoto(false);
    onHide?.();
  };

  return (
    <Modal
      show={Boolean(visitante)}
      onHide={cerrar}
      centered
      size="lg"
      dialogClassName="gyj-modal"
      keyboard={!verFoto}
      enforceFocus={!verFoto}
      aria-labelledby="titulo-detalle-visitante"
    >
      {visitante && (
        <>
          <Modal.Header closeButton>
            <div>
              <Modal.Title id="titulo-detalle-visitante">
                {visitante.nombre}
              </Modal.Title>
              <p className="texto-secundario texto-pequeno mb-0">
                {formatearFechaLarga(visitante.fecha)} · {visitante.motivo}
              </p>
            </div>
          </Modal.Header>

          <Modal.Body>
            <dl className="datos-lista datos-lista--tres">
              <Dato etiqueta="Documento" valor={visitante.documento} />
              <Dato etiqueta="EPS" valor={visitante.eps} />
              <Dato etiqueta="RH" valor={visitante.rh} />
              <Dato etiqueta="Empresa" valor={visitante.empresa} />
              <Dato etiqueta="Teléfono" valor={visitante.telefono} />
              <Dato
                etiqueta="Teléfono de emergencia"
                valor={visitante.telefonoEmergencia}
              />
              <Dato etiqueta="ARL" valor={visitante.arl} />
              <Dato
                etiqueta="Persona a visitar"
                valor={visitante.personaVisitar}
              />
              <Dato etiqueta="Motivo" valor={visitante.motivo} />
              <Dato
                etiqueta="Fecha"
                valor={formatearFechaLarga(visitante.fecha)}
              />
              <Dato
                etiqueta="Horario"
                valor={`${formatearHora(visitante.horaEntrada)}${
                  visitante.horaSalida
                    ? ` – ${formatearHora(visitante.horaSalida)}`
                    : " · En oficina"
                }`}
              />
              <Dato etiqueta="Estado">
                <GYJBadge estado={visitante.estado} />
              </Dato>
              <Dato etiqueta="Registrado por" valor={visitante.registradoPor} />
              <Dato
                etiqueta="Registrado el"
                valor={formatearFechaHora(visitante.creadoEn)}
              />
              <Dato
                etiqueta="Última actualización"
                valor={formatearFechaHora(visitante.actualizadoEn)}
              />
              {visitante.foto && (
                <Dato etiqueta="Foto del visitante">
                  <button
                    type="button"
                    className="link-foto"
                    onClick={() => setVerFoto(true)}
                  >
                    Ver foto ({nombreArchivoFoto(visitante.nombre)})
                  </button>
                </Dato>
              )}
            </dl>
          </Modal.Body>

          <Modal.Footer>
            <GYJButton variant="ghost" onClick={cerrar}>
              Cerrar
            </GYJButton>
          </Modal.Footer>
        </>
      )}

      {visitante && (
        <ModalVerFoto
          show={verFoto}
          nombre={visitante.nombre}
          foto={visitante.foto}
          onHide={() => setVerFoto(false)}
        />
      )}
    </Modal>
  );
}
