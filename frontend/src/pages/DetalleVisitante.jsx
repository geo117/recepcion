import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiClock,
  FiEdit2,
  FiLogOut,
  FiPhone,
  FiSave,
  FiTrash2,
  FiUser,
  FiUserCheck,
  FiX,
} from "react-icons/fi";
import { api } from "../services/api";
import { useAuth } from "../hooks/authContext";
import {
  alertaError,
  alertaExito,
  alertaTemporal,
  confirmarAccion,
} from "../utils/alertas";
import {
  formatearFechaHora,
  formatearFechaLarga,
  formatearHora,
} from "../utils/fecha";
import { nombreArchivoFoto } from "../utils/fotos";
import {
  EPS,
  sanitizarTexto,
  tieneErrores,
  validarRegistro,
} from "../utils/validaciones";
import GYJBadge from "../components/ui/GYJBadge";
import GYJButton from "../components/ui/GYJButton";
import GYJCard from "../components/ui/GYJCard";
import GYJInput from "../components/ui/GYJInput";
import ModalVerFoto from "../components/visitantes/ModalVerFoto";

function formularioDesde(visita) {
  return {
    nombre: visita.nombre,
    documento: visita.documento,
    empresa: visita.empresa,
    personaId: visita.personaId,
    motivo: visita.motivo,
    telefono: visita.telefono,
    telefonoEmergencia: visita.telefonoEmergencia,
    eps: visita.eps,
    arl: visita.arl,
    foto: visita.foto ?? "",
  };
}

export default function DetalleVisitante() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { esAdmin } = useAuth();

  const [visita, setVisita] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState(null);
  const [personaTexto, setPersonaTexto] = useState("");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [procesandoSalida, setProcesandoSalida] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [verFoto, setVerFoto] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;

    Promise.all([api.obtenerVisita(id), api.listarEmpleados()])
      .then(([registro, listaEmpleados]) => {
        if (!activo) return;
        setVisita(registro);
        setEmpleados(listaEmpleados);
      })
      .catch((fallo) => {
        if (!activo) return;
        setError(
          fallo?.codigo === 404
            ? "No encontramos este registro. Es posible que haya sido eliminado."
            : "No se pudo cargar el registro. Verifica la conexión e intenta nuevamente.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [id, version]);

  const recargar = () => {
    setCargando(true);
    setError("");
    setVersion((actual) => actual + 1);
  };

  const iniciarEdicion = () => {
    setFormulario(formularioDesde(visita));
    setPersonaTexto(visita.personaVisitar);
    setErrores({});
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setFormulario(null);
    setErrores({});
  };

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    if (errores[campo]) {
      setErrores((actuales) => ({ ...actuales, [campo]: "" }));
    }
  };

  const manejarPersona = (valor) => {
    setPersonaTexto(valor);
    const encontrada = empleados.find(
      (empleado) => empleado.nombre.toLowerCase() === valor.trim().toLowerCase(),
    );
    actualizarCampo("personaId", encontrada?.id ?? "");
  };

  const guardar = async (evento) => {
    evento.preventDefault();

    const validaciones = validarRegistro(formulario);
    setErrores(validaciones);
    if (tieneErrores(validaciones)) return;

    setGuardando(true);
    try {
      const actualizada = await api.actualizarVisita(id, {
        nombre: sanitizarTexto(formulario.nombre, 80),
        documento: sanitizarTexto(formulario.documento, 12).toUpperCase(),
        empresa: sanitizarTexto(formulario.empresa, 60),
        personaId: formulario.personaId,
        motivo: formulario.motivo,
        telefono: sanitizarTexto(formulario.telefono, 10),
        telefonoEmergencia: sanitizarTexto(
          formulario.telefonoEmergencia,
          10,
        ),
        eps: sanitizarTexto(formulario.eps, 60),
        arl: sanitizarTexto(formulario.arl, 60),
        foto: formulario.foto ?? "",
      });
      setVisita(actualizada);
      setEditando(false);
      setFormulario(null);
      await alertaExito("Registro actualizado", "Los cambios se guardaron correctamente.");
    } catch (fallo) {
      await alertaError(
        "No se pudieron guardar los cambios",
        fallo?.codigo === 409
          ? fallo.message
          : "Revisa los datos e intenta nuevamente.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const manejarSalida = async () => {
    const confirmado = await confirmarAccion(
      "Registrar salida",
      `¿Confirmas la salida de ${visita.nombre}? Se guardará la hora actual.`,
      { confirmar: "Registrar salida" },
    );
    if (!confirmado) return;

    setProcesandoSalida(true);
    try {
      const actualizada = await api.registrarSalida(visita.id);
      setVisita(actualizada);
      alertaTemporal(
        "Salida registrada",
        `${actualizada.nombre} salió a las ${formatearHora(actualizada.horaSalida)}.`,
      );
    } catch (fallo) {
      await alertaError(
        "No se pudo registrar la salida",
        fallo?.codigo === 409 ? fallo.message : "Intenta nuevamente.",
      );
    } finally {
      setProcesandoSalida(false);
    }
  };

  const eliminar = async () => {
    const confirmado = await confirmarAccion(
      "Eliminar registro",
      `Esta acción elimina permanentemente el registro de ${visita.nombre}. No se puede deshacer.`,
      { confirmar: "Eliminar registro" },
    );
    if (!confirmado) return;

    setEliminando(true);
    try {
      await api.eliminarVisita(visita.id);
      navigate("/recepcion", { replace: true });
      await alertaExito("Registro eliminado", "El historial se actualizó.");
    } catch {
      setEliminando(false);
      await alertaError(
        "No se pudo eliminar el registro",
        "Intenta nuevamente en unos segundos.",
      );
    }
  };

  if (cargando) {
    return (
      <div className="cargando-bloque">
        <span className="spinner-border" aria-hidden="true" />
        <span>Cargando registro…</span>
      </div>
    );
  }

  if (error || !visita) {
    return (
      <div className="estado-pantalla">
        <span className="estado-pantalla__icono" aria-hidden="true">
          <FiAlertCircle />
        </span>
        <h2>No disponible</h2>
        <p>{error || "No encontramos el registro solicitado."}</p>
        <div className="detalle-acciones">
          <GYJButton variant="outline" onClick={recargar}>
            Reintentar
          </GYJButton>
          <Link className="btn gyj-btn gyj-btn--primary" to="/recepcion">
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__titulo">{visita.nombre}</h1>
          <p className="page-head__descripcion">
            {formatearFechaLarga(visita.fecha)} · {visita.motivo}
          </p>
        </div>
        <div className="page-head__acciones">
          <Link
            className="btn gyj-btn gyj-btn--outline"
            to="/recepcion"
          >
            <FiArrowLeft aria-hidden="true" />
            <span>Volver</span>
          </Link>

          {!editando && (
            <>
              {visita.estado === "dentro" && (
                <GYJButton
                  icono={FiLogOut}
                  onClick={manejarSalida}
                  cargando={procesandoSalida}
                >
                  Registrar salida
                </GYJButton>
              )}
              <GYJButton
                variant="outline"
                icono={FiEdit2}
                onClick={iniciarEdicion}
              >
                Editar
              </GYJButton>
              {esAdmin && (
                <GYJButton
                  variant="danger"
                  icono={FiTrash2}
                  onClick={eliminar}
                  cargando={eliminando}
                >
                  Eliminar
                </GYJButton>
              )}
            </>
          )}
        </div>
      </div>

      <div className="detalle-grid">
        {editando && formulario ? (
          <GYJCard
            titulo="Editar registro"
            descripcion="Actualiza los datos del visitante. Los cambios quedan registrados con la fecha y hora actual."
          >
            <Form onSubmit={guardar} noValidate>
              <div className="registro-grid registro-grid--tres">
                <GYJInput
                  label="Nombre completo"
                  name="nombre"
                  value={formulario.nombre}
                  onChange={(evento) =>
                    actualizarCampo("nombre", evento.target.value)
                  }
                  error={errores.nombre}
                  maxLength={80}
                  obligatorio
                />
                <GYJInput
                  label="Documento de identidad"
                  name="documento"
                  value={formulario.documento}
                  onChange={(evento) =>
                    actualizarCampo(
                      "documento",
                      evento.target.value
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .toUpperCase(),
                    )
                  }
                  error={errores.documento}
                  maxLength={12}
                  obligatorio
                />
                <Form.Group className="gyj-campo">
                  <Form.Label htmlFor="eps-edicion">EPS</Form.Label>
                  <Form.Select
                    id="eps-edicion"
                    value={formulario.eps ?? ""}
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
                    <div className="invalid-feedback d-block">
                      {errores.eps}
                    </div>
                  )}
                </Form.Group>
                <GYJInput
                  label="Empresa / procedencia"
                  name="empresa"
                  value={formulario.empresa}
                  onChange={(evento) =>
                    actualizarCampo("empresa", evento.target.value)
                  }
                  error={errores.empresa}
                  maxLength={60}
                />
                <GYJInput
                  label="Teléfono de contacto"
                  name="telefono"
                  type="tel"
                  value={formulario.telefono}
                  onChange={(evento) =>
                    actualizarCampo(
                      "telefono",
                      evento.target.value.replace(/\D/g, ""),
                    )
                  }
                  error={errores.telefono}
                  maxLength={10}
                  inputMode="numeric"
                />
                <GYJInput
                  label="Teléfono de emergencia"
                  name="telefonoEmergencia-edicion"
                  type="tel"
                  icono={FiPhone}
                  value={formulario.telefonoEmergencia ?? ""}
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
                  name="persona-edicion"
                  icono={FiUserCheck}
                  list="personas-edicion"
                  value={personaTexto}
                  onChange={(evento) => manejarPersona(evento.target.value)}
                  error={errores.personaId}
                  obligatorio
                />
                <datalist id="personas-edicion">
                  {empleados.map((empleado) => (
                    <option key={empleado.id} value={empleado.nombre}>
                      {empleado.cargo} · {empleado.area}
                    </option>
                  ))}
                </datalist>
                <GYJInput
                  label="Motivo de visita"
                  name="motivo-edicion"
                  placeholder="Describe el motivo de la visita"
                  value={formulario.motivo ?? ""}
                  onChange={(evento) =>
                    actualizarCampo("motivo", evento.target.value)
                  }
                  error={errores.motivo}
                  maxLength={120}
                  obligatorio
                  required
                />
                <GYJInput
                  label="ARL"
                  name="arl-edicion"
                  placeholder="Ej. ARL Sura"
                  value={formulario.arl ?? ""}
                  onChange={(evento) =>
                    actualizarCampo("arl", evento.target.value)
                  }
                  error={errores.arl}
                  maxLength={60}
                />
              </div>

              <div className="detalle-acciones">
                <GYJButton
                  type="submit"
                  icono={FiSave}
                  cargando={guardando}
                >
                  Guardar cambios
                </GYJButton>
                <GYJButton
                  variant="ghost"
                  icono={FiX}
                  onClick={cancelarEdicion}
                  disabled={guardando}
                >
                  Cancelar
                </GYJButton>
              </div>
            </Form>
          </GYJCard>
        ) : (
          <GYJCard
            titulo="Datos del registro"
            descripcion="Información capturada en recepción."
            acciones={<GYJBadge estado={visita.estado} />}
          >
            <dl className="datos-lista datos-lista--tres">
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">Nombre</dt>
                <dd className="datos-lista__valor mb-0">{visita.nombre}</dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">Documento</dt>
                <dd className="datos-lista__valor mb-0">{visita.documento}</dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">EPS</dt>
                <dd className="datos-lista__valor mb-0">
                  {visita.eps || "—"}
                </dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">Empresa</dt>
                <dd className="datos-lista__valor mb-0">
                  {visita.empresa || "—"}
                </dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">Teléfono</dt>
                <dd className="datos-lista__valor mb-0">
                  {visita.telefono || "—"}
                </dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">
                  Teléfono de emergencia
                </dt>
                <dd className="datos-lista__valor mb-0">
                  {visita.telefonoEmergencia || "—"}
                </dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">Persona a visitar</dt>
                <dd className="datos-lista__valor mb-0">
                  {visita.personaVisitar}
                </dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">Motivo</dt>
                <dd className="datos-lista__valor mb-0">{visita.motivo}</dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">ARL</dt>
                <dd className="datos-lista__valor mb-0">
                  {visita.arl || "—"}
                </dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">Fecha</dt>
                <dd className="datos-lista__valor mb-0">
                  {formatearFechaLarga(visita.fecha)}
                </dd>
              </div>
              <div className="datos-lista__item">
                <dt className="datos-lista__etiqueta">Horario</dt>
                <dd className="datos-lista__valor mb-0">
                  {formatearHora(visita.horaEntrada)}
                  {visita.horaSalida
                    ? ` – ${formatearHora(visita.horaSalida)}`
                    : " · En oficina"}
                </dd>
              </div>
            </dl>
          </GYJCard>
        )}

        <GYJCard titulo="Trazabilidad">
          <div className="meta-lista meta-lista--tres">
            <div className="meta-lista__item">
              <FiCalendar aria-hidden="true" />
              <div>
                <p className="meta-lista__etiqueta">Registrado el</p>
                <p className="meta-lista__valor">
                  {formatearFechaHora(visita.creadoEn)}
                </p>
              </div>
            </div>
            <div className="meta-lista__item">
              <FiClock aria-hidden="true" />
              <div>
                <p className="meta-lista__etiqueta">Última actualización</p>
                <p className="meta-lista__valor">
                  {formatearFechaHora(visita.actualizadoEn)}
                </p>
              </div>
            </div>
            {visita.foto && (
              <div className="meta-lista__item">
                <FiCamera aria-hidden="true" />
                <div>
                  <p className="meta-lista__etiqueta">Foto del visitante</p>
                  <button
                    type="button"
                    className="link-foto"
                    onClick={() => setVerFoto(true)}
                  >
                    Ver foto ({nombreArchivoFoto(visita.nombre)})
                  </button>
                </div>
              </div>
            )}
            <div className="meta-lista__item">
              <FiUser aria-hidden="true" />
              <div>
                <p className="meta-lista__etiqueta">Registrado por</p>
                <p className="meta-lista__valor">{visita.registradoPor}</p>
              </div>
            </div>
            <div className="meta-lista__item">
              <FiCheck aria-hidden="true" />
              <div>
                <p className="meta-lista__etiqueta">Estado actual</p>
                <p className="meta-lista__valor">
                  {visita.estado === "dentro"
                    ? "Visitante dentro de la oficina"
                    : "Salida registrada"}
                </p>
              </div>
            </div>
            <div className="meta-lista__item">
              <FiAlertCircle aria-hidden="true" />
              <div>
                <p className="meta-lista__etiqueta">Identificador</p>
                <p className="meta-lista__valor texto-pequeno">{visita.id}</p>
              </div>
            </div>
          </div>
        </GYJCard>
      </div>

      <ModalVerFoto
        show={verFoto}
        nombre={visita.nombre}
        foto={visita.foto}
        onHide={() => setVerFoto(false)}
      />
    </>
  );
}
