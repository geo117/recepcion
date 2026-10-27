import { useEffect, useState } from "react";
import { Form, Modal, Table } from "react-bootstrap";
import {
  FiAtSign,
  FiLock,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { api } from "../services/api";
import { useAuth } from "../hooks/authContext";
import { alertaError, alertaExito } from "../utils/alertas";
import { formatearFechaHora } from "../utils/fecha";
import { iniciales } from "../utils/validaciones";
import {
  EMPRESAS,
  ROLES_USUARIO,
  etiquetaRol,
  normalizarUsuario,
  validarNuevoUsuario,
} from "../utils/usuarios";
import AccesoRestringido from "../components/layout/AccesoRestringido";
import GYJButton from "../components/ui/GYJButton";
import GYJInput from "../components/ui/GYJInput";

const FORMULARIO_INICIAL = {
  nombre: "",
  usuario: "",
  password: "",
  confirmar: "",
  empresa: "",
  rol: "recepcionista",
};

function PanelAdministracion() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState({});
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    let activo = true;

    api
      .listarUsuarios()
      .then((lista) => {
        if (activo) setUsuarios(lista);
      })
      .catch(() => {
        if (activo) {
          setError(
            "No se pudo cargar la lista de usuarios. Verifica la conexión e intenta nuevamente.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [version]);

  const recargar = () => {
    setCargando(true);
    setError("");
    setVersion((actual) => actual + 1);
  };

  const abrirModal = () => {
    setFormulario(FORMULARIO_INICIAL);
    setErrores({});
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (creando) return;
    setModalAbierto(false);
    setFormulario(FORMULARIO_INICIAL);
    setErrores({});
  };

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    if (errores[campo]) {
      setErrores((actuales) => ({ ...actuales, [campo]: "" }));
    }
  };

  const crearUsuario = async (evento) => {
    evento.preventDefault();

    const validaciones = validarNuevoUsuario(formulario, usuarios);
    setErrores(validaciones);
    if (Object.values(validaciones).some(Boolean)) return;

    setCreando(true);
    try {
      const nuevo = await api.crearUsuario({
        nombre: formulario.nombre.trim(),
        usuario: normalizarUsuario(formulario.usuario),
        password: formulario.password,
        empresa: formulario.empresa,
        rol: formulario.rol,
      });

      setUsuarios((actuales) =>
        [...actuales, nuevo].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
        ),
      );
      setModalAbierto(false);
      setFormulario(FORMULARIO_INICIAL);
      setErrores({});
      await alertaExito(
        "Usuario creado",
        `${nuevo.nombre} ya puede ingresar con el usuario «${nuevo.usuario}».`,
      );
    } catch (fallo) {
      if (fallo?.codigo === 409) {
        setErrores((actuales) => ({
          ...actuales,
          usuario: "Ese nombre de usuario ya está registrado.",
        }));
      } else {
        await alertaError(
          "No se pudo crear el usuario",
          fallo?.message?.includes("conectar")
            ? "No se pudo conectar con el servidor. Intenta nuevamente."
            : "Revisa los datos e intenta nuevamente.",
        );
      }
    } finally {
      setCreando(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__titulo">Administración</h1>
          <p className="page-head__descripcion">
            Consulta los usuarios activos y crea accesos para el personal de las
            empresas del grupo.
          </p>
        </div>
        <div className="page-head__acciones">
          <span className="gyj-badge gyj-badge--activo" aria-live="polite">
            {cargando
              ? "Cargando…"
              : `${usuarios.length} ${usuarios.length === 1 ? "activo" : "activos"}`}
          </span>
          <GYJButton icono={FiUserPlus} onClick={abrirModal}>
            Nuevo usuario
          </GYJButton>
        </div>
      </div>

      <section className="seccion-tabla" aria-labelledby="titulo-usuarios">
        <div className="seccion-tabla__head">
          <h2 className="seccion-tabla__titulo" id="titulo-usuarios">
            Usuarios activos
          </h2>
          <span className="seccion-tabla__meta">
            Personal con acceso al sistema
          </span>
        </div>

        <div className="tabla-envoltura" aria-busy={cargando}>
          {cargando ? (
            <div className="cargando-bloque">
              <span className="spinner-border" aria-hidden="true" />
              <span>Cargando usuarios…</span>
            </div>
          ) : error ? (
            <div className="tabla-vacia">
              <FiUsers aria-hidden="true" />
              <p className="tabla-vacia__titulo">
                No se pudieron cargar los usuarios
              </p>
              <p className="tabla-vacia__texto">{error}</p>
              <GYJButton variant="outline" onClick={recargar}>
                Reintentar
              </GYJButton>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="tabla-vacia">
              <FiUsers aria-hidden="true" />
              <p className="tabla-vacia__titulo">Aún no hay usuarios activos</p>
              <p className="tabla-vacia__texto">
                Crea el primer acceso para el personal de recepción.
              </p>
            </div>
          ) : (
            <Table responsive hover className="gyj-table align-middle">
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Empresa</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Creado</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      <div className="usuario-celda">
                        <span className="usuario-celda__avatar" aria-hidden="true">
                          {iniciales(usuario.nombre)}
                        </span>
                        <div className="usuario-celda__datos">
                          <span className="usuario-celda__nombre">
                            {usuario.nombre}
                          </span>
                          <span className="usuario-celda__usuario">
                            @{usuario.usuario}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{usuario.empresa || "—"}</td>
                    <td>{etiquetaRol(usuario.rol)}</td>
                    <td>
                      <span className="gyj-badge gyj-badge--activo">
                        Activo
                      </span>
                    </td>
                    <td className="gyj-table__hora">
                      {usuario.creadoEn
                        ? formatearFechaHora(usuario.creadoEn)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </section>

      <Modal
        show={modalAbierto}
        onHide={cerrarModal}
        centered
        size="lg"
        dialogClassName="gyj-modal"
        backdrop={creando ? "static" : true}
        keyboard={!creando}
        aria-labelledby="titulo-nuevo-usuario"
      >
        <Modal.Header closeButton>
          <div>
            <Modal.Title id="titulo-nuevo-usuario">Nuevo usuario</Modal.Title>
            <p className="texto-secundario texto-pequeno mb-0">
              Crea el acceso de un colaborador a la recepción de visitantes.
            </p>
          </div>
        </Modal.Header>

        <Modal.Body>
          <Form id="form-nuevo-usuario" onSubmit={crearUsuario} noValidate>
            <div className="registro-grid">
              <GYJInput
                label="Nombre completo"
                name="nuevo-nombre"
                placeholder="Nombre y apellido"
                className="registro-grid__ancho"
                value={formulario.nombre}
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
                label="Usuario"
                name="nuevo-usuario"
                icono={FiAtSign}
                placeholder="nombre.apellido"
                value={formulario.usuario}
                onChange={(evento) =>
                  actualizarCampo("usuario", evento.target.value.toLowerCase())
                }
                error={errores.usuario}
                ayuda="Minúsculas, sin espacios. Se usará para iniciar sesión."
                maxLength={20}
                autoComplete="off"
                obligatorio
                required
              />

              <Form.Group className="gyj-campo">
                <Form.Label htmlFor="nuevo-empresa">
                  Empresa
                  <span className="marca-obligatorio" aria-hidden="true">
                    *
                  </span>
                </Form.Label>
                <Form.Select
                  id="nuevo-empresa"
                  value={formulario.empresa}
                  onChange={(evento) =>
                    actualizarCampo("empresa", evento.target.value)
                  }
                  isInvalid={Boolean(errores.empresa)}
                  aria-invalid={Boolean(errores.empresa)}
                  required
                >
                  <option value="">Selecciona la empresa</option>
                  {EMPRESAS.map((empresa) => (
                    <option key={empresa} value={empresa}>
                      {empresa}
                    </option>
                  ))}
                </Form.Select>
                {errores.empresa && (
                  <div className="invalid-feedback d-block">
                    {errores.empresa}
                  </div>
                )}
              </Form.Group>

              <GYJInput
                label="Contraseña"
                name="nuevo-password"
                type="password"
                icono={FiLock}
                placeholder="Contraseña temporal"
                value={formulario.password}
                onChange={(evento) =>
                  actualizarCampo("password", evento.target.value)
                }
                error={errores.password}
                ayuda="Mínimo 8 caracteres, con una letra y un número."
                autoComplete="new-password"
                obligatorio
                required
              />

              <GYJInput
                label="Confirmar contraseña"
                name="nuevo-confirmar"
                type="password"
                icono={FiLock}
                placeholder="Repite la contraseña"
                value={formulario.confirmar}
                onChange={(evento) =>
                  actualizarCampo("confirmar", evento.target.value)
                }
                error={errores.confirmar}
                autoComplete="new-password"
                obligatorio
                required
              />

              <Form.Group className="gyj-campo registro-grid__ancho">
                <Form.Label htmlFor="nuevo-rol">
                  Perfil de acceso
                  <span className="marca-obligatorio" aria-hidden="true">
                    *
                  </span>
                </Form.Label>
                <Form.Select
                  id="nuevo-rol"
                  value={formulario.rol}
                  onChange={(evento) =>
                    actualizarCampo("rol", evento.target.value)
                  }
                  isInvalid={Boolean(errores.rol)}
                  aria-invalid={Boolean(errores.rol)}
                  required
                >
                  {ROLES_USUARIO.map((rol) => (
                    <option key={rol.valor} value={rol.valor}>
                      {rol.etiqueta}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text>
                  El perfil administrador también puede gestionar usuarios y
                  reportes.
                </Form.Text>
                {errores.rol && (
                  <div className="invalid-feedback d-block">{errores.rol}</div>
                )}
              </Form.Group>
            </div>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <GYJButton variant="ghost" onClick={cerrarModal} disabled={creando}>
            Cancelar
          </GYJButton>
          <GYJButton
            type="submit"
            form="form-nuevo-usuario"
            icono={FiUserPlus}
            cargando={creando}
          >
            Crear usuario
          </GYJButton>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default function Administracion() {
  const { esAdmin } = useAuth();
  if (!esAdmin) return <AccesoRestringido modulo="administración de usuarios" />;
  return <PanelAdministracion />;
}
