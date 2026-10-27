import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { FiCamera, FiCheck, FiRefreshCw, FiUpload } from "react-icons/fi";
import { nombreArchivoFoto } from "../../utils/fotos";
import GYJButton from "../ui/GYJButton";

const LADO_MAXIMO = 480;

export default function ModalFotoVisita({
  show = false,
  nombre = "",
  onHide,
  onConfirmar,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const archivoRef = useRef(null);
  const streamRef = useRef(null);
  const solicitudRef = useRef(0);
  const [foto, setFoto] = useState("");
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(false);

  const detenerCamara = useCallback(() => {
    solicitudRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const iniciarCamara = useCallback(async () => {
    detenerCamara();
    const solicitud = solicitudRef.current;
    setError("");
    setIniciando(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Tu navegador no permite usar la cámara. Puedes subir una imagen.",
      );
      setIniciando(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (solicitud !== solicitudRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      if (solicitud === solicitudRef.current) {
        setError("No se pudo acceder a la cámara. Puedes subir una imagen.");
      }
    } finally {
      if (solicitud === solicitudRef.current) setIniciando(false);
    }
  }, [detenerCamara]);

  useEffect(() => {
    if (!show || foto) {
      detenerCamara();
      return undefined;
    }

    const temporizador = window.setTimeout(() => {
      iniciarCamara();
    }, 0);

    return () => {
      window.clearTimeout(temporizador);
      detenerCamara();
    };
  }, [show, foto, iniciarCamara, detenerCamara]);

  const procesarImagen = (fuente, ancho, alto, espejo = false) => {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));
    const canvas = canvasRef.current;
    if (!canvas || !ancho || !alto) return "";

    canvas.width = Math.max(1, Math.round(ancho * escala));
    canvas.height = Math.max(1, Math.round(alto * escala));

    const contexto = canvas.getContext("2d");
    if (!contexto) return "";

    contexto.save();
    if (espejo) {
      contexto.translate(canvas.width, 0);
      contexto.scale(-1, 1);
    }
    contexto.drawImage(fuente, 0, 0, canvas.width, canvas.height);
    contexto.restore();

    return canvas.toDataURL("image/png");
  };

  const tomarFoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("La cámara aún no está lista. Intenta nuevamente.");
      return;
    }

    const captura = procesarImagen(
      video,
      video.videoWidth,
      video.videoHeight,
      true,
    );
    if (!captura) {
      setError("No se pudo capturar la imagen. Intenta nuevamente.");
      return;
    }

    detenerCamara();
    setError("");
    setFoto(captura);
  };

  const subirArchivo = (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen válido.");
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const imagen = new Image();
      imagen.onload = () => {
        const captura = procesarImagen(
          imagen,
          imagen.naturalWidth,
          imagen.naturalHeight,
        );
        if (!captura) {
          setError("No se pudo procesar la imagen.");
          return;
        }
        detenerCamara();
        setError("");
        setFoto(captura);
      };
      imagen.onerror = () => setError("No se pudo leer la imagen.");
      imagen.src = lector.result;
    };
    lector.onerror = () => setError("No se pudo leer la imagen.");
    lector.readAsDataURL(archivo);
  };

  const repetir = () => {
    setError("");
    setFoto("");
  };

  const cerrar = () => {
    detenerCamara();
    setFoto("");
    setError("");
    onHide?.();
  };

  const confirmar = () => {
    if (!foto) return;
    onConfirmar?.(foto);
    cerrar();
  };

  return (
    <Modal
      show={show}
      onHide={cerrar}
      centered
      size="lg"
      dialogClassName="gyj-modal"
      className="gyj-modal-foto"
      backdropClassName="gyj-backdrop-foto"
      aria-labelledby="titulo-foto-visita"
    >
      <Modal.Header closeButton>
        <div>
          <Modal.Title id="titulo-foto-visita">Tomar foto</Modal.Title>
          <p className="texto-secundario texto-pequeno mb-0">
            Se guardará como {nombreArchivoFoto(nombre)}.
          </p>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="foto-captura">
          {foto ? (
            <img
              className="foto-captura__media"
              src={foto}
              alt={`Foto de ${nombre || "visitante"}`}
            />
          ) : error ? (
            <div className="foto-captura__vacio">
              <FiCamera aria-hidden="true" />
              <span>Sin cámara disponible</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="foto-captura__media foto-captura__media--video"
              autoPlay
              playsInline
              muted
            />
          )}
        </div>

        {error && (
          <p className="foto-captura__error" role="alert">
            {error}
          </p>
        )}

        <canvas ref={canvasRef} className="d-none" />

        <input
          ref={archivoRef}
          type="file"
          accept="image/*"
          capture="user"
          className="d-none"
          onChange={subirArchivo}
        />
      </Modal.Body>

      <Modal.Footer>
        <GYJButton variant="ghost" onClick={cerrar}>
          Cancelar
        </GYJButton>

        <GYJButton
          variant="outline"
          icono={FiUpload}
          onClick={() => archivoRef.current?.click()}
        >
          Subir foto
        </GYJButton>

        {foto ? (
          <>
            <GYJButton variant="outline" icono={FiRefreshCw} onClick={repetir}>
              Repetir
            </GYJButton>
            <GYJButton icono={FiCheck} onClick={confirmar}>
              Usar foto
            </GYJButton>
          </>
        ) : (
          <GYJButton
            icono={FiCamera}
            onClick={tomarFoto}
            cargando={iniciando}
            disabled={Boolean(error)}
          >
            Tomar foto
          </GYJButton>
        )}
      </Modal.Footer>
    </Modal>
  );
}
