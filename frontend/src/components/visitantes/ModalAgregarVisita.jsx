import { useCallback, useEffect, useRef, useState } from "react";
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
import { parsearCodigoCedula } from "../../utils/cedula";
import { formatearFechaLarga, formatearHora, hoyISO } from "../../utils/fecha";
import { nombreArchivoFoto } from "../../utils/fotos";
import {
  EPS,
  GRUPOS_SANGUINEOS,
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
  rh: "",
};

/** Tiempo máximo entre teclas para considerarlas parte del mismo escaneo. */
const REINICIO_ESCANEO_MS = 120;
/** Velocidad máxima (ms por carácter) para reconocer un escáner. */
const VELOCIDAD_ESCANER_MS = 45;
const LONGITUD_MINIMA_ESCANEO = 12;
const LONGITUD_MINIMA_SIN_DELIMITADOR = 24;
const DELIMITADORES_ESCANEO = /[@^|~]/;

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
  const [visitaEncontrada, setVisitaEncontrada] = useState(null);
  const [buscandoHistorial, setBuscandoHistorial] = useState(false);
  const [procesandoSalida, setProcesandoSalida] = useState(false);
  const [reintentoEmpleados, setReintentoEmpleados] = useState(0);
  const [mensajeEscaner, setMensajeEscaner] = useState("");
  const busquedaRef = useRef(0);

  // Referencias del lector USB (que se comporta como un teclado HID).
  const escanerRef = useRef(null);
  const datosRef = useRef(datos);
  const personaTextoRef = useRef(personaTexto);
  const bufferEscaneoRef = useRef("");
  const inicioEscaneoRef = useRef(0);
  const ultimaTeclaRef = useRef(0);
  const datosAntesEscaneoRef = useRef(null);
  const personaAntesEscaneoRef = useRef(null);
  const modalVisibleRef = useRef(show);
  const fotoAbiertaRef = useRef(fotoAbierta);
  const visitaEncontradaRef = useRef(visitaEncontrada);

  const escaneoActivo =
    show && !fotoAbierta && !enviando && !procesandoSalida;

  useEffect(() => {
    datosRef.current = datos;
  }, [datos]);

  useEffect(() => {
    personaTextoRef.current = personaTexto;
  }, [personaTexto]);

  useEffect(() => {
    modalVisibleRef.current = show;
  }, [show]);

  useEffect(() => {
    fotoAbiertaRef.current = fotoAbierta;
  }, [fotoAbierta]);

  useEffect(() => {
    visitaEncontradaRef.current = visitaEncontrada;
  }, [visitaEncontrada]);

  /** Enfoca el campo trampa cada vez que el modal queda disponible. */
  useEffect(() => {
    if (!show || fotoAbierta) return undefined;

    const temporizador = window.setTimeout(() => {
      escanerRef.current?.focus({ preventScroll: true });
    }, 150);

    return () => window.clearTimeout(temporizador);
  }, [show, fotoAbierta]);

  const reenfocarEscaner = () => {
    window.setTimeout(() => {
      if (!modalVisibleRef.current || fotoAbiertaRef.current) return;
      if (!escanerRef.current?.isConnected) return;

      const activo = document.activeElement;
      if (!activo || activo === document.body) {
        escanerRef.current.focus({ preventScroll: true });
      }
    }, 50);
  };

  const procesarEscaneo = useCallback((codigo) => {
    const resultado = parsearCodigoCedula(codigo);
    const datosPrevios = datosAntesEscaneoRef.current;
    const personaPrevia = personaAntesEscaneoRef.current;
    datosAntesEscaneoRef.current = null;
    personaAntesEscaneoRef.current = null;

    // Sin un documento válido no se toca el formulario: evita que un código
    // ajeno reemplace datos que la recepcionista ya haya escrito. Solo se
    // deshacen los caracteres que hayan alcanzado a colarse en un input.
    if (!resultado.documento) {
      if (datosPrevios) setDatos(datosPrevios);
      if (personaPrevia !== null) setPersonaTexto(personaPrevia);
      return;
    }

    // Si el formulario venía precargado con una visita anterior, se limpia
    // para no mezclar los datos de dos personas distintas.
    const habiaVisitaAnterior = Boolean(visitaEncontradaRef.current);
    if (habiaVisitaAnterior) {
      setPersonaTexto("");
      setFoto("");
    } else if (personaPrevia !== null) {
      setPersonaTexto(personaPrevia);
    }

    // Ignora cualquier carácter que se haya colado en un input mientras se
    // detectaba el escaneo y aplica únicamente los datos de la cédula.
    busquedaRef.current += 1;
    setBuscandoHistorial(false);
    setVisitaEncontrada(null);
    setSalida(null);
    setDatos((actuales) => {
      const base = habiaVisitaAnterior
        ? { ...FORMULARIO_INICIAL }
        : (datosPrevios ?? actuales);
      return {
        ...base,
        ...(resultado.documento ? { documento: resultado.documento } : {}),
        ...(resultado.nombre ? { nombre: resultado.nombre } : {}),
        ...(resultado.rh ? { rh: resultado.rh } : {}),
      };
    });
    setErrores((actuales) => ({
      ...actuales,
      documento: "",
      nombre: "",
      rh: "",
    }));

    if (escanerRef.current) {
      escanerRef.current.value = "";
      escanerRef.current.focus({ preventScroll: true });
    }

    setMensajeEscaner(
      `Cédula leída: ${resultado.nombre || resultado.documento}.`,
    );
  }, []);

  /**
   * Escucha el teclado en fase de captura para atrapar el escaneo incluso si
   * el foco está en otro campo del formulario. El buffer se arma con la
   * velocidad de las pulsaciones, no con el valor visible de un input.
   */
  useEffect(() => {
    if (!escaneoActivo) {
      bufferEscaneoRef.current = "";
      inicioEscaneoRef.current = 0;
      ultimaTeclaRef.current = 0;
      datosAntesEscaneoRef.current = null;
      personaAntesEscaneoRef.current = null;
      return undefined;
    }

    const manejarTecla = (evento) => {
      if (
        evento.isComposing ||
        evento.ctrlKey ||
        evento.altKey ||
        evento.metaKey
      ) {
        return;
      }

      const enCampoTrampa = evento.target === escanerRef.current;
      const esCaracter = evento.key.length === 1;
      const esFinalizador = evento.key === "Enter" || evento.key === "Tab";

      if (!esCaracter && !esFinalizador) return;

      const ahora = performance.now();

      if (esCaracter) {
        const inactividad = ahora - ultimaTeclaRef.current;

        if (
          !bufferEscaneoRef.current ||
          inactividad > REINICIO_ESCANEO_MS
        ) {
          bufferEscaneoRef.current = "";
          inicioEscaneoRef.current = ahora;
          datosAntesEscaneoRef.current = datosRef.current;
          personaAntesEscaneoRef.current = personaTextoRef.current;
        }

        ultimaTeclaRef.current = ahora;
        bufferEscaneoRef.current += evento.key;

        const buffer = bufferEscaneoRef.current;
        const duracion = Math.max(ahora - inicioEscaneoRef.current, 1);
        const velocidad = duracion / buffer.length;
        const pareceRapido =
          buffer.length >= 3 && velocidad <= VELOCIDAD_ESCANER_MS;
        const pareceCodigo =
          buffer.length >= 8 && DELIMITADORES_ESCANEO.test(buffer);

        // Evita que la cadena del escáner contamine el campo que tenga el foco.
        if (enCampoTrampa || pareceRapido || pareceCodigo) {
          evento.preventDefault();
        }
        return;
      }

      const payload = bufferEscaneoRef.current.trim();
      const duracion = Math.max(ahora - inicioEscaneoRef.current, 1);
      const velocidad = duracion / Math.max(payload.length, 1);
      const tieneDelimitador = DELIMITADORES_ESCANEO.test(payload);
      const esEscaneo =
        payload.length >= LONGITUD_MINIMA_ESCANEO &&
        (tieneDelimitador ||
          (payload.length >= LONGITUD_MINIMA_SIN_DELIMITADOR &&
            velocidad <= VELOCIDAD_ESCANER_MS));

      bufferEscaneoRef.current = "";
      inicioEscaneoRef.current = 0;
      ultimaTeclaRef.current = 0;

      if (esEscaneo) {
        // Frena el Enter del escáner antes de que el formulario lo interprete.
        evento.preventDefault();
        evento.stopPropagation();
        procesarEscaneo(payload);
        return;
      }

      datosAntesEscaneoRef.current = null;
      personaAntesEscaneoRef.current = null;
      if (enCampoTrampa && evento.key === "Enter") {
        evento.preventDefault();
      }
    };

    document.addEventListener("keydown", manejarTecla, true);
    return () => document.removeEventListener("keydown", manejarTecla, true);
  }, [escaneoActivo, procesarEscaneo]);

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
  };

  const limpiarDatosRecuperados = (documento = "") => {
    busquedaRef.current += 1;
    setBuscandoHistorial(false);
    setVisitaEncontrada(null);
    setSalida(null);
    setPersonaTexto("");
    setFoto("");
    setErrores({});
    setDatos({ ...FORMULARIO_INICIAL, documento });
  };

  const manejarDocumento = (valor) => {
    const documento = valor
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    if (visitaEncontrada) {
      limpiarDatosRecuperados(documento);
      return;
    }

    busquedaRef.current += 1;
    setBuscandoHistorial(false);
    setSalida(null);
    setDatos((actuales) => ({ ...actuales, documento }));
    if (errores.documento) {
      setErrores((actuales) => ({ ...actuales, documento: "" }));
    }
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

  const aplicarVisitaEncontrada = (visita) => {
    setVisitaEncontrada(visita);
    setPersonaTexto(visita.personaVisitar ?? "");
    setDatos((actuales) => ({
      ...actuales,
      documento: String(visita.documento ?? actuales.documento).toUpperCase(),
      nombre: visita.nombre ?? "",
      empresa: visita.empresa ?? "",
      personaId: visita.personaId ?? "",
      motivo: visita.motivo ?? "",
      telefono: visita.telefono ?? "",
      telefonoEmergencia: visita.telefonoEmergencia ?? "",
      eps: visita.eps ?? "",
      arl: visita.arl ?? "",
      rh: visita.rh ?? "",
    }));
    setFoto(visita.foto ?? "");
    setErrores({});
    const estaActiva =
      visita.fecha === hoyISO() && visita.estado === "dentro";
    setSalida(estaActiva ? visita : null);
  };

  const buscarHistorial = async (documentoParametro) => {
    const documento = String(documentoParametro ?? datos.documento)
      .trim()
      .toUpperCase();

    if (validarDocumento(documento)) {
      busquedaRef.current += 1;
      setBuscandoHistorial(false);
      setVisitaEncontrada(null);
      setSalida(null);
      return;
    }

    const solicitud = ++busquedaRef.current;
    setBuscandoHistorial(true);

    try {
      const encontrada = await api.buscarUltimaVisita(documento);
      if (solicitud !== busquedaRef.current) return;

      if (!encontrada) {
        setVisitaEncontrada(null);
        setSalida(null);
        return;
      }

      aplicarVisitaEncontrada(encontrada);
    } catch {
      if (solicitud === busquedaRef.current) {
        setVisitaEncontrada(null);
        setSalida(null);
      }
    } finally {
      if (solicitud === busquedaRef.current) setBuscandoHistorial(false);
    }
  };

  const resetear = () => {
    busquedaRef.current += 1;
    setDatos(FORMULARIO_INICIAL);
    setPersonaTexto("");
    setErrores({});
    setSalida(null);
    setVisitaEncontrada(null);
    setBuscandoHistorial(false);
    setFoto("");
    setFotoAbierta(false);
    setMensajeEscaner("");
    bufferEscaneoRef.current = "";
    datosAntesEscaneoRef.current = null;
    personaAntesEscaneoRef.current = null;
    if (escanerRef.current) escanerRef.current.value = "";
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
      rh: datos.rh,
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
      scrollable
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
            Escanea la cédula con el lector USB o haz clic en un campo para
            escribir los datos. El registro toma menos de 30 segundos.
          </p>
        </div>
      </Modal.Header>

      <Modal.Body>
        <input
          ref={escanerRef}
          type="text"
          className="visually-hidden"
          aria-label="Lector de cédula. Campo automático del escáner."
          tabIndex={-1}
          readOnly
          inputMode="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onBlur={reenfocarEscaner}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.preventDefault();
          }}
        />
        <span className="visually-hidden" role="status" aria-live="polite">
          {mensajeEscaner}
        </span>

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
              onChange={(evento) => manejarDocumento(evento.target.value)}
              onBlur={(evento) => buscarHistorial(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  buscarHistorial(evento.currentTarget.value);
                }
              }}
              error={errores.documento}
              ayuda={
                buscandoHistorial
                  ? "Buscando visitas anteriores…"
                  : visitaEncontrada
                    ? "Datos de una visita anterior cargados."
                    : "Entre 6 y 12 caracteres. Buscamos visitas anteriores al salir del campo."
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

            <Form.Group className="gyj-campo">
              <Form.Label htmlFor="rh">RH</Form.Label>
              <Form.Select
                id="rh"
                name="rh"
                value={datos.rh}
                onChange={(evento) =>
                  actualizarCampo("rh", evento.target.value)
                }
                isInvalid={Boolean(errores.rh)}
                aria-invalid={Boolean(errores.rh)}
              >
                <option value="">Selecciona el grupo sanguíneo</option>
                {GRUPOS_SANGUINEOS.map((grupo) => (
                  <option key={grupo} value={grupo}>
                    {grupo}
                  </option>
                ))}
              </Form.Select>
              {errores.rh && (
                <div className="invalid-feedback d-block">{errores.rh}</div>
              )}
            </Form.Group>

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

          {visitaEncontrada && !salida && (
            <div className="aviso-sesion" role="status">
              <FiInfo aria-hidden="true" />
              <span>
                Datos recuperados de la visita del{" "}
                <strong>{formatearFechaLarga(visitaEncontrada.fecha)}</strong> a
                las {formatearHora(visitaEncontrada.horaEntrada)} — se
                registrará una nueva entrada con la fecha y hora actuales.
              </span>
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
          disabled={
            cargandoEmpleados || Boolean(errorEmpleados) || buscandoHistorial
          }
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
