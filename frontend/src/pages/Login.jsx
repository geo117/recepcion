import { useState } from "react";
import { Form } from "react-bootstrap";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiInfo,
  FiLock,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../hooks/authContext";
import { CREDENCIALES_DEMO } from "../services/api";
import { alertaError } from "../utils/alertas";
import GYJButton from "../components/ui/GYJButton";
import GYJInput from "../components/ui/GYJInput";

export default function Login() {
  const { autenticado, iniciarSesion, esModoDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({});

  const destino = String(location.state?.desde ?? "").startsWith("/")
    ? location.state.desde
    : "/recepcion";

  if (autenticado) return <Navigate to={destino} replace />;

  const manejarCambio = (campo, valor) => {
    if (campo === "usuario") setUsuario(valor);
    if (campo === "password") setPassword(valor);
    if (errores[campo]) {
      setErrores((actuales) => ({ ...actuales, [campo]: "" }));
    }
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();

    const usuarioLimpio = usuario.trim();
    const nuevosErrores = {
      usuario: usuarioLimpio ? "" : "Ingresa tu usuario.",
      password: password ? "" : "Ingresa tu contraseña.",
    };
    setErrores(nuevosErrores);
    if (nuevosErrores.usuario || nuevosErrores.password) return;

    // La contraseña abandona el estado de React y el DOM en cuanto se envía:
    // no hay razón para conservarla en memoria mientras el navegador ya la
    // transmitió. Si el acceso falla, hay que volver a escribirla (a propósito).
    const passwordEnviada = password;
    setPassword("");
    setVerPassword(false);

    setCargando(true);
    try {
      await iniciarSesion({
        usuario: usuarioLimpio,
        password: passwordEnviada,
      });
      navigate(destino, { replace: true });
    } catch (error) {
      setCargando(false);
      await alertaError(
        "Credenciales inválidas",
        error?.message?.includes("conectar")
          ? "No se pudo conectar con el servidor. Intenta nuevamente."
          : "Verifica tu usuario y contraseña.",
      );
    }
  };

  const usarCredencial = ({ usuario: usuarioDemo, clave }) => {
    setUsuario(usuarioDemo);
    setPassword(clave);
    setErrores({});
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-marca">
          <div className="login-marca__texto">
            <p className="login-marca__nombre">Acceza360</p>
            <p className="login-marca__sub">Recepción de visitantes</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card__franja" aria-hidden="true" />
          <div className="login-card__cuerpo">
            <p className="login-card__eyebrow">Acceso interno</p>
            <h1 className="login-card__titulo">Registro de visitantes</h1>
            <p className="login-card__descripcion">
              Ingresa con tu cuenta corporativa para comenzar el turno en
              recepción.
            </p>

            <Form className="login-card__form" onSubmit={manejarEnvio} noValidate>
              <GYJInput
                label="Usuario"
                name="usuario"
                icono={FiUser}
                placeholder="tu.usuario"
                value={usuario}
                onChange={(evento) =>
                  manejarCambio("usuario", evento.target.value)
                }
                error={errores.usuario}
                autoComplete="username"
                autoFocus
                required
              />

              <Form.Group className="gyj-campo">
                <Form.Label htmlFor="password">Contraseña</Form.Label>
                <div className="gyj-input-icono gyj-input-icono--accion">
                  <FiLock aria-hidden="true" />
                  <Form.Control
                    id="password"
                    name="password"
                    type={verPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(evento) =>
                      manejarCambio("password", evento.target.value)
                    }
                    isInvalid={Boolean(errores.password)}
                    aria-invalid={Boolean(errores.password)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="gyj-input-accion"
                    onClick={() => setVerPassword((visible) => !visible)}
                    aria-label={
                      verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {verPassword ? (
                      <FiEyeOff aria-hidden="true" />
                    ) : (
                      <FiEye aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errores.password && (
                  <div className="invalid-feedback d-block">
                    {errores.password}
                  </div>
                )}
              </Form.Group>

              <GYJButton
                type="submit"
                cargando={cargando}
                className="w-100"
              >
                {cargando ? "Validando acceso" : "Iniciar sesión"}
              </GYJButton>

              {esModoDemo && (
                <div className="login-demo">
                  <FiInfo aria-hidden="true" />
                  <div>
                    <strong>Modo demostración.</strong> Usa las credenciales de
                    ejemplo:
                    <div className="login-demo__lista">
                      {CREDENCIALES_DEMO.map((credencial) => (
                        <button
                          key={credencial.usuario}
                          type="button"
                          className="login-demo__credencial"
                          onClick={() => usarCredencial(credencial)}
                        >
                          <code>
                            {credencial.usuario} / {credencial.clave}
                          </code>
                          <span>{credencial.etiqueta}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Form>
          </div>

          <div className="login-card__pie">
            <span>Acceza360</span>
            <span>GYJ Ferreterías S.A. · Solo personal autorizado</span>
          </div>
        </div>

        <p className="login-pie">
          Acceza360 · Sistema de recepción de visitantes · Uso interno
          <br />
          Si necesitas ayuda, contacta a Tecnología de la Información.
        </p>
      </div>
    </div>
  );
}
