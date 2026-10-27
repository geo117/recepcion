import { useEffect, useState } from "react";
import { Form, Modal } from "react-bootstrap";
import {
  FiCamera,
  FiClock,
  FiInfo,
  FiLogOut,
  FiPhone,
  FiUserCheck,
  FiUserPlus,
} from "react-icons/fi";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/authContext";
import {
  alertaError,
  alertaExito,
  alertaTemporal,
  confirmarAccion,
} from "../../utils/alertas";
import { formatearHora } from "../../utils/fecha";
import { nombreArchivoFoto } from "../../utils/fotos";
import {
  EPS,
  sanitizarTexto,
  validarDocumento,
  validarRegistro,
  tieneErrores,
} from "../../utils/validaciones";
import GYJButton from "../ui/GYJButton";
import GYJInput from "../ui/GYJInput";
import ModalFotoVisita from "./ModalFotoVisita";

const FORMULARIO_INICIAL = {
  nombre: "",
  documento: "",
  empresa: "",
  personaId: "",
  motivo: "",
  telefono: "",
  telefonoEmergencia: "",
  eps: "",
  arl: "",
};

export default function ModalAgregarVisita({ show = false, onHide, onRegistrado }) {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(FORMULARIO_INICIAL);
  const [personaTexto, setPersonaTexto] = useState("");
  const [errores, setErrores] = useState({});
  const [foto, setFoto] = useState("");
  const [fotoAbierta, setFotoAbierta] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(true);
  const [errorEmpleados, setErrorEmpleados] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [salida, setSalida] = useState(null);
  const [buscandoSalida, setBuscandoSalida] = useState(false);
  const [procesandoSalida, setProcesandoSalida] = useState(false);
  const [reintentoEmpleados, setReintentoEmpleados] = useState(0);

  useEffect(() => {
    let activo = true;
    const temporizador = window.setTimeout(() => {
      api
        .listarEmpleados()
        .then((lista) => {
          if (!activo) return;
          setEmpleados(lista);
          setErrorEmpleados("");
        })
        .catch(() => {
          if (!activo) return;
          setErrorEmpleados(
            "No se pudieron cargar los colaboradores. Verifica la conexión e intenta nuevamente.",
          );
        })
        .finally(() => {
          if (activo) setCargandoEmpleados(false);
        });
    }, 0);

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [reintentoEmpleados]);

  const reintentarEmpleados = () => {
    setCargandoEmpleados(true);
    setErrorEmpleados("");
    setReintentoEmpleados((intento) => intento + 1);
  };

  const actualizarCampo = (campo, valor) => {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }));
    if (errores[campo]) {
      setErrores((actuales) => ({ ...actuales, [campo]: "" }));
    }
    if (campo === "documento") setSalida(null);
  };

  const manejarPersona = (valor) => {
    setPersonaTexto(valor);
    const encontrada = empleados.find(
      (empleado) =>
        empleado.nombre.toLowerCase() === valor.trim().toLowerCase(),
    );
    setDatos((actuales) => ({
      ...actuales,
      personaId: encontrada?.id ?? "",
    }));
    if (errores.personaId) {
      setErrores((actuales) => ({ ...actuales, personaId: "" }));
    }
  };

  const buscarSalidaPendiente = async () => {
    if (validarDocumento(datos.documento)) {
      setSalida(null);
      return;
    }

    setBuscandoSalida(true);
    try {
      const encontrada = await api.buscarVisitaAbierta(datos.documento);
      setSalida(encontrada);
    } catch {
      setSalida(null);
    } finally {
      setBuscandoSalida(false);
    }
  };

  const resetear = () => {
    setDatos(FORMULARIO_INICIAL);
    setPersonaTexto("");
    setErrores({});
    setSalida(null);
    setFoto("");
    setFotoAbierta(false);
  };

  const cerrar = () => {
    if (enviando || procesandoSalida) return;
    resetear();
    onHide?.();
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();

    const validaciones = validarRegistro(datos);
    setErrores(validaciones);
    if (tieneErrores(validaciones)) return;

    const carga = {
      nombre: sanitizarTexto(datos.nombre, 80),
      documento: sanitizarTexto(datos.documento, 12).toUpperCase(),
      empresa: sanitizarTexto(datos.empresa, 60),
      personaId: datos.personaId,
      motivo: datos.motivo,
      telefono: sanitizarTexto(datos.telefono, 10),
      telefonoEmergencia: sanitizarTexto(datos.telefonoEmergencia, 10),
      eps: sanitizarTexto(datos.eps, 60),
      arl: sanitizarTexto(datos.arl, 60),
      foto,
      registradoPor: usuario?.nombre ?? "Recepcionista",
    };

    setEnviando(true);
    try {
      const creada = await api.crearVisita(carga);
      resetear();
      onRegistrado?.();
      onHide?.();
      await alertaTemporal(
        "Visitante registrado",
        `${creada.nombre} ingresó a las ${formatearHora(creada.horaEntrada)}.`,
      );
    } catch (error) {
      const mensaje =
        error?.codigo === 409
          ? error.message
          : error?.message?.includes("conectar")
            ? "No se pudo conectar con el servidor. Intenta nuevamente."
            : "No se pudo registrar la entrada. Revisa los datos e intenta nuevamente.";
      await alertaError("No se pudo completar el registro", mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const manejarSalida = async () => {
    if (!salida) return;

    const confirmado = await confirmarAccion(
      "Registrar salida",
      `¿Confirmas la salida de ${salida.nombre}? Se guardará la hora actual.`,
      { confirmar: "Registrar salida" },
    );
    if (!confirmado) return;

    setProcesandoSalida(true);
    try {
      const actualizada = await api.registrarSalida(salida.id);
      setSalida(null);
      onRegistrado?.();
      onHide?.();
      await alertaExito(
        "Salida registrada",
        `${actualizada.nombre} salió a las ${formatearHora(actualizada.horaSalida)}.`,
      );
    } catch (error) {
      await alertaError(
        "No se pudo registrar la salida",
        error?.codigo === 409
          ? error.message
          : "Intenta nuevamente en unos segundos.",
      );
    } finally {
      setProcesandoSalida(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={cerrar}
      centered
      size="lg"
      dialogClassName="gyj-modal"
      backdrop={enviando || procesandoSalida ? "static" : true}
      keyboard={!fotoAbierta && !enviando && !procesandoSalida}
      enforceFocus={!fotoAbierta}
      aria-labelledby="titulo-agregar-visita"
    >
      <Modal.Header closeButton>
        <div>
          <Modal.Title id="titulo-agregar-visita">Agregar visita</Modal.Title>
          <p className="texto-secundario texto-pequeno mb-0">
            Completa los datos del visitante. El registro toma menos de 30
            segundos.
          </p>
        </div>
      </Modal.Header>

      <Modal.Body>
        <Form id="form-agregar-visita" onSubmit={manejarEnvio} noValidate>
          <div className="foto-visita">
            {foto ? (
              <div className="foto-visita__resumen">
                <img
                  className="foto-visita__miniatura"
                  src={foto}
                  alt={`Foto de ${datos.nombre || "visitante"}`}
                />
                <div className="foto-visita__datos">
                  <span className="foto-visita__archivo">
                    {nombreArchivoFoto(datos.nombre)}
                  </span>
                  <GYJButton
                    variant="outline"
                    className="gyj-btn--sm"
                    icono={FiCamera}
                    onClick={() => setFotoAbierta(true)}
                  >
                    Cambiar foto
                  </GYJButton>
                </div>
              </div>
            ) : (
              <GYJButton
                variant="outline"
                className="gyj-btn--sm"
                icono={FiCamera}
                onClick={() => setFotoAbierta(true)}
              >
                Tomar foto
              </GYJButton>
            )}
          </div>

          <div className="registro-grid registro-grid--tres">
            <GYJInput
              label="Nombre completo"
              name="nombre"
              placeholder="Nombre y apellido"
              value={datos.nombre}
              onChange={(evento) =>
                actualizarCampo("nombre", evento.target.value)
              }
              error={errores.nombre}
              maxLength={80}
              autoComplete="off"
              autoFocus
              obligatorio
              required
            />

            <GYJInput
              label="Documento de identidad"
              name="documento"
              placeholder="CC, CE o pasaporte"
              value={datos.documento}
              onChange={(evento) =>
                actualizarCampo(
                  "documento",
                  evento.target.value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase(),
                )
              }
              onBlur={buscarSalidaPendiente}
              error={errores.documento}
              ayuda={
                buscandoSalida
                  ? "Buscando visita activa…"
                  : "Entre 6 y 12 caracteres."
              }
              maxLength={12}
              autoComplete="off"
              obligatorio
              required
            />

            <Form.Group className="gyj-campo">
              <Form.Label htmlFor="eps">EPS</Form.Label>
              <Form.Select
                id="eps"
                name="eps"
                value={datos.eps}
                onChange={(evento) =>
                  actualizarCampo("eps", evento.target.value)
                }
                isInvalid={Boolean(errores.eps)}
                aria-invalid={Boolean(errores.eps)}
              >
                <option value="">Selecciona la EPS</option>
                {EPS.map((eps) => (
                  <option key={eps} value={eps}>
                    {eps}
                  </option>
                ))}
              </Form.Select>
              {errores.eps && (
                <div className="invalid-feedback d-block">{errores.eps}</div>
              )}
            </Form.Group>

            <GYJInput
              label="Empresa / procedencia"
              name="empresa"
              placeholder="Opcional"
              value={datos.empresa}
              onChange={(evento) =>
                actualizarCampo("empresa", evento.target.value)
              }
              error={errores.empresa}
              maxLength={60}
              autoComplete="organization"
            />

            <GYJInput
              label="Teléfono de contacto"
              name="telefono"
              type="tel"
              icono={FiPhone}
              placeholder="10 dígitos (opcional)"
              value={datos.telefono}
              onChange={(evento) =>
                actualizarCampo(
                  "telefono",
                  evento.target.value.replace(/\D/g, ""),
                )
              }
              error={errores.telefono}
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel"
            />

            <GYJInput
              label="Teléfono de emergencia"
              name="telefonoEmergencia"
              type="tel"
              icono={FiPhone}
              placeholder="10 dígitos (opcional)"
              value={datos.telefonoEmergencia}
              onChange={(evento) =>
                actualizarCampo(
                  "telefonoEmergencia",
                  evento.target.value.replace(/\D/g, ""),
                )
              }
              error={errores.telefonoEmergencia}
              maxLength={10}
              inputMode="numeric"
            />

            <GYJInput
              label="Persona a visitar"
              name="persona"
              icono={FiUserCheck}
              placeholder="Escribe para buscar…"
              value={personaTexto}
              onChange={(evento) => manejarPersona(evento.target.value)}
              error={errores.personaId}
              ayuda="Selecciona un colaborador de la lista."
              list="personas-disponibles"
              autoComplete="off"
              disabled={cargandoEmpleados}
              obligatorio
              required
            />

            <datalist id="personas-disponibles">
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.nombre}>
                  {empleado.cargo} · {empleado.area}
                </option>
              ))}
            </datalist>

            <GYJInput
              label="Area de visita"
              name="motivo"
              placeholder="Digite el area de la visita"
              value={datos.motivo}
              onChange={(evento) =>
                actualizarCampo("motivo", evento.target.value)
              }
              error={errores.motivo}
              maxLength={120}
              autoComplete="off"
              obligatorio
              required
            />

            <GYJInput
              label="ARL"
              name="arl"
              placeholder="Ej. ARL Sura"
              value={datos.arl}
              onChange={(evento) =>
                actualizarCampo("arl", evento.target.value)
              }
              error={errores.arl}
              maxLength={60}
              autoComplete="off"
            />
          </div>

          {errorEmpleados && (
            <div className="aviso-sesion" role="alert">
              <FiInfo aria-hidden="true" />
              <span>{errorEmpleados}</span>
              <GYJButton
                variant="outline"
                className="gyj-btn--sm ms-auto"
                onClick={reintentarEmpleados}
              >
                Reintentar
              </GYJButton>
            </div>
          )}

          {salida && (
            <div className="aviso-sesion" role="status">
              <FiInfo aria-hidden="true" />
              <span>
                <strong>{salida.nombre}</strong> tiene una visita activa hoy
                desde las {formatearHora(salida.horaEntrada)}. Puedes registrar
                su salida.
              </span>
            </div>
          )}

          <p className="registro-nota">
            <FiClock aria-hidden="true" />
            La hora de entrada se guarda automáticamente.
          </p>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <GYJButton
          variant="ghost"
          onClick={cerrar}
          disabled={enviando || procesandoSalida}
        >
          Cancelar
        </GYJButton>

        {salida && (
          <GYJButton
            variant="outline"
            icono={FiLogOut}
            onClick={manejarSalida}
            cargando={procesandoSalida}
            disabled={enviando}
          >
            Registrar salida
          </GYJButton>
        )}

        <GYJButton
          type="submit"
          form="form-agregar-visita"
          icono={FiUserPlus}
          cargando={enviando}
          disabled={cargandoEmpleados || Boolean(errorEmpleados)}
        >
          Registrar entrada
        </GYJButton>
      </Modal.Footer>

      <ModalFotoVisita
        show={fotoAbierta}
        nombre={datos.nombre}
        onHide={() => setFotoAbierta(false)}
        onConfirmar={setFoto}
      />
    </Modal>
  );
}
