import { useState } from "react";
import { Form, Modal } from "react-bootstrap";
import { FiAtSign, FiLock, FiSave } from "react-icons/fi";
import { api } from "../../services/api";
import {
  EMPRESAS,
  ROLES_USUARIO,
  normalizarUsuario,
  validarEdicionUsuario,
} from "../../utils/usuarios";
import { alertaError, alertaExito } from "../../utils/alertas";
import GYJButton from "../ui/GYJButton";
import GYJInput from "../ui/GYJInput";

export default function ModalEditarUsuario({
  usuario,
  usuarios = [],
  onHide,
  onActualizado,
}) {
  const [formulario, setFormulario] = useState({
    nombre: usuario.nombre ?? "",
    usuario: usuario.usuario ?? "",
    empresa: usuario.empresa ?? "",
    rol: usuario.rol ?? "recepcionista",
    password: "",
    confirmar: "",
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => {
    if (guardando) return;
    onHide?.();
  };

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    if (errores[campo]) {
      setErrores((actuales) => ({ ...actuales, [campo]: "" }));
    }
  };

  const guardar = async (evento) => {
    evento.preventDefault();

    const validaciones = validarEdicionUsuario(
      formulario,
      usuarios,
      usuario.id,
    );
    setErrores(validaciones);
    if (Object.values(validaciones).some(Boolean)) return;

    setGuardando(true);
    try {
      const cambios = {
        nombre: formulario.nombre.trim(),
        usuario: normalizarUsuario(formulario.usuario),
        empresa: formulario.empresa,
        rol: formulario.rol,
      };

      if (formulario.password) cambios.password = formulario.password;

      const actualizado = await api.actualizarUsuario(usuario.id, cambios);
      onActualizado?.(actualizado);
      onHide?.();
      await alertaExito(
        "Usuario actualizado",
        "Los cambios se guardaron correctamente.",
      );
    } catch (fallo) {
      await alertaError(
        "No se pudo actualizar el usuario",
        fallo?.codigo === 409
          ? fallo.message
          : fallo?.message?.includes("conectar")
            ? "No se pudo conectar con el servidor. Intenta nuevamente."
            : "Revisa los datos e intenta nuevamente.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      show
      onHide={cerrar}
      centered
      size="lg"
      scrollable
      dialogClassName="gyj-modal"
      backdrop={guardando ? "static" : true}
      keyboard={!guardando}
      aria-labelledby="titulo-editar-usuario"
    >
      <Modal.Header closeButton>
        <div>
          <Modal.Title id="titulo-editar-usuario">Editar usuario</Modal.Title>
          <p className="texto-secundario texto-pequeno mb-0">
            Actualiza los datos de acceso de {usuario.nombre}.
          </p>
        </div>
      </Modal.Header>

      <Modal.Body>
        <Form id="form-editar-usuario" onSubmit={guardar} noValidate>
          <div className="registro-grid registro-grid--tres">
            <GYJInput
              label="Nombre completo"
              name="editar-nombre"
              placeholder="Nombre y apellido"
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
              name="editar-usuario"
              icono={FiAtSign}
              placeholder="nombre.apellido"
              value={formulario.usuario}
              onChange={(evento) =>
                actualizarCampo("usuario", evento.target.value.toLowerCase())
              }
              error={errores.usuario}
              ayuda="Minúsculas, sin espacios."
              maxLength={20}
              autoComplete="off"
              obligatorio
              required
            />

            <Form.Group className="gyj-campo">
              <Form.Label htmlFor="editar-empresa">
                Empresa
                <span className="marca-obligatorio" aria-hidden="true">
                  *
                </span>
              </Form.Label>
              <Form.Select
                id="editar-empresa"
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

            <Form.Group className="gyj-campo">
              <Form.Label htmlFor="editar-rol">
                Perfil de acceso
                <span className="marca-obligatorio" aria-hidden="true">
                  *
                </span>
              </Form.Label>
              <Form.Select
                id="editar-rol"
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
              {errores.rol && (
                <div className="invalid-feedback d-block">{errores.rol}</div>
              )}
            </Form.Group>

            <GYJInput
              label="Nueva contraseña"
              name="editar-password"
              type="password"
              icono={FiLock}
              placeholder="Dejar vacía para conservar"
              value={formulario.password}
              onChange={(evento) =>
                actualizarCampo("password", evento.target.value)
              }
              error={errores.password}
              ayuda="Opcional. Déjala vacía para conservar la actual."
              autoComplete="new-password"
            />

            <GYJInput
              label="Confirmar contraseña"
              name="editar-confirmar"
              type="password"
              icono={FiLock}
              placeholder="Repite la nueva contraseña"
              value={formulario.confirmar}
              onChange={(evento) =>
                actualizarCampo("confirmar", evento.target.value)
              }
              error={errores.confirmar}
              autoComplete="new-password"
            />
          </div>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <GYJButton variant="ghost" onClick={cerrar} disabled={guardando}>
          Cancelar
        </GYJButton>
        <GYJButton
          type="submit"
          form="form-editar-usuario"
          icono={FiSave}
          cargando={guardando}
        >
          Guardar cambios
        </GYJButton>
      </Modal.Footer>
    </Modal>
  );
}
