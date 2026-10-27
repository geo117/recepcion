import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import {
  FiInfo,
  FiLogOut,
  FiClock,
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
import {
  MOTIVOS,
  sanitizarTexto,
  validarDocumento,
  validarRegistro,
  tieneErrores,
} from "../../utils/validaciones";
import GYJButton from "../ui/GYJButton";
import GYJCard from "../ui/GYJCard";
import GYJInput from "../ui/GYJInput";

const FORMULARIO_INICIAL = {
  nombre: "",
  documento: "",
  empresa: "",
  personaId: "",
  motivo: "",
  telefono: "",
};

export default function RegistroRapido({ onRegistrado }) {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(FORMULARIO_INICIAL);
  const [personaTexto, setPersonaTexto] = useState("");
  const [errores, setErrores] = useState({});
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
      registradoPor: usuario?.nombre ?? "Recepcionista",
    };

    setEnviando(true);
    try {
      const creada = await api.crearVisita(carga);
      resetear();
      onRegistrado?.();
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
    <GYJCard
      className="panel-registro"
      titulo="Registro rápido"
      descripcion="Completa los datos del visitante. El registro toma menos de 30 segundos."
      acciones={<span className="gyj-badge gyj-badge--info">Hoy</span>}
    >
      <Form onSubmit={manejarEnvio} noValidate>
        <div className="registro-grid">
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
                evento.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
              )
            }
            onBlur={buscarSalidaPendiente}
            error={errores.documento}
            ayuda={buscandoSalida ? "Buscando visita activa…" : "Entre 6 y 12 caracteres."}
            maxLength={12}
            autoComplete="off"
            obligatorio
            required
          />

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
              actualizarCampo("telefono", evento.target.value.replace(/\D/g, ""))
            }
            error={errores.telefono}
            maxLength={10}
            inputMode="numeric"
            autoComplete="tel"
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
            <Form.Label htmlFor="motivo">
              Motivo de visita
              <span className="marca-obligatorio" aria-hidden="true">
                *
              </span>
            </Form.Label>
            <Form.Select
              id="motivo"
              name="motivo"
              value={datos.motivo}
              onChange={(evento) =>
                actualizarCampo("motivo", evento.target.value)
              }
              isInvalid={Boolean(errores.motivo)}
              aria-invalid={Boolean(errores.motivo)}
              required
            >
              <option value="">Selecciona una opción</option>
              {MOTIVOS.map((motivo) => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </Form.Select>
            {errores.motivo && (
              <div className="invalid-feedback d-block">{errores.motivo}</div>
            )}
          </Form.Group>
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
              <strong>{salida.nombre}</strong> tiene una visita activa hoy desde
              las {formatearHora(salida.horaEntrada)}. Puedes registrar su salida.
            </span>
          </div>
        )}

        <div className="registro-acciones">
          <div className="registro-acciones__principal">
            <GYJButton
              type="submit"
              icono={FiUserPlus}
              cargando={enviando}
              disabled={cargandoEmpleados || Boolean(errorEmpleados)}
            >
              Registrar entrada
            </GYJButton>

            {salida && (
              <GYJButton
                variant="outline"
                icono={FiLogOut}
                onClick={manejarSalida}
                cargando={procesandoSalida}
              >
                Registrar salida
              </GYJButton>
            )}
          </div>

          <p className="registro-nota">
            <FiClock aria-hidden="true" />
            La hora de entrada se guarda automáticamente.
          </p>
        </div>
      </Form>
    </GYJCard>
  );
}
