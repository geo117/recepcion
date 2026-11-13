import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Modal } from "react-bootstrap";
import { FiCamera, FiPrinter } from "react-icons/fi";
import { formatearFecha, formatearHora } from "../../utils/fecha";
import { empresaPorCodigo } from "../../utils/usuarios";
import GYJButton from "../ui/GYJButton";
import LogoEmpresa from "../ui/LogoEmpresa";

/**
 * Medidas de la etiqueta térmica (rollo tipo 4" x 30 mm, gap de 3 mm).
 * Se mantienen en milímetros para que la vista previa y la impresión
 * coincidan con el sticker físico.
 */
const ANCHO_ETIQUETA_MM = 100;
const ALTO_ETIQUETA_MM = 30;
const SEPARACION_ETIQUETAS_MM = 3;

function Campo({ etiqueta, valor }) {
  return (
    <div className="sticker-canvas__campo">
      <span className="sticker-canvas__etiqueta">{etiqueta}</span>
      <span className="sticker-canvas__valor">{valor}</span>
    </div>
  );
}

/**
 * Contenido del sticker. Se usa igual en la vista previa y en la copia que
 * se envía a la impresora.
 */
function EtiquetaSticker({ visitante, empresaRegistro }) {
  const fechaHora = `${formatearFecha(visitante.fecha)} · ${formatearHora(
    visitante.horaEntrada,
  )}`;

  return (
    <div className="sticker-canvas">
      <div className="sticker-canvas__info">
        <div className="sticker-canvas__marca">
          <span className="sticker-canvas__empresa">{empresaRegistro}</span>
          <LogoEmpresa
            empresa={empresaRegistro}
            tamano="sm"
            decorativo
            className="sticker-canvas__logo"
          />
        </div>

        <p className="sticker-canvas__nombre">{visitante.nombre}</p>

        <div className="sticker-canvas__datos">
          <Campo etiqueta="Documento" valor={visitante.documento || "—"} />
          <Campo etiqueta="Área que visita" valor={visitante.motivo || "—"} />
          <Campo
            etiqueta="Procedencia"
            valor={visitante.empresa || "—"}
          />
          <Campo etiqueta="Fecha y hora" valor={fechaHora} />
          <Campo etiqueta="RH" valor={visitante.rh || "—"} />
          <Campo
            etiqueta="Tel. emergencia"
            valor={visitante.telefonoEmergencia || "—"}
          />
        </div>
      </div>

      <div className="sticker-canvas__foto">
        {visitante.foto ? (
          <img src={visitante.foto} alt={`Foto de ${visitante.nombre}`} />
        ) : (
          <div className="sticker-canvas__foto-vacia">
            <FiCamera aria-hidden="true" />
            <span>Sin foto</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModalImprimirEtiqueta({ visitante, onHide }) {
  const empresaRegistro =
    visitante?.companyNombre ||
    empresaPorCodigo(visitante?.companyReg) ||
    "GYJ Ferreterías";

  /**
   * `@page` no se puede condicionar por selector, así que el tamaño del
   * papel solo se inyecta mientras esta etiqueta está abierta. De este modo
   * la impresión de reportes (A4) sigue usando su propia configuración.
   */
  useEffect(() => {
    if (!visitante) return undefined;

    const estilo = document.createElement("style");
    estilo.dataset.gyjEtiqueta = "true";
    estilo.textContent = `@page { size: ${ANCHO_ETIQUETA_MM}mm ${ALTO_ETIQUETA_MM}mm; margin: 0; }`;
    document.head.appendChild(estilo);
    document.body.classList.add("gyj-etiqueta-print");

    return () => {
      estilo.remove();
      document.body.classList.remove("gyj-etiqueta-print");
    };
  }, [visitante]);

  const imprimir = () => {
    if (!visitante) return;

    // Espera a que el navegador pinte la copia de impresión (y sus imágenes)
    // antes de abrir el diálogo del sistema.
    window.requestAnimationFrame(() => {
      window.setTimeout(() => window.print(), 120);
    });
  };

  return (
    <>
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
              Rollo térmico de {ANCHO_ETIQUETA_MM} × {ALTO_ETIQUETA_MM} mm con{" "}
              {SEPARACION_ETIQUETAS_MM} mm de separación entre stickers.
            </p>
          </div>
        </Modal.Header>

        {visitante && (
          <>
            <Modal.Body>
              <div className="etiqueta-visita__vista">
                <EtiquetaSticker
                  visitante={visitante}
                  empresaRegistro={empresaRegistro}
                />
                <p className="etiqueta-visita__leyenda mb-0">
                  Vista previa a tamaño real ({ANCHO_ETIQUETA_MM} ×{" "}
                  {ALTO_ETIQUETA_MM} mm). En el diálogo de impresión elige la
                  impresora térmica, el papel de {ANCHO_ETIQUETA_MM} ×{" "}
                  {ALTO_ETIQUETA_MM} mm y escala al 100&nbsp;% (sin ajustar a la
                  página).
                </p>
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

      {/*
        Copia aislada para imprimir: en pantalla está oculta y en impresión
        reemplaza a toda la aplicación gracias a las reglas de global.css.
      */}
      {visitante &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="etiqueta-impresion" aria-hidden="true">
            <EtiquetaSticker
              visitante={visitante}
              empresaRegistro={empresaRegistro}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
