import { limpiarEspacios, validarNombre } from "./validaciones";

export const EMPRESAS = ["GYJ Ferreterías", "Almasa", "Colmena"];

export const ROLES_USUARIO = [
  { valor: "recepcionista", etiqueta: "Recepcionista" },
  { valor: "admin", etiqueta: "Administrador" },
];

const USUARIO_VALIDO = /^[a-z][a-z0-9._-]{3,19}$/;

export function normalizarUsuario(valor) {
  return String(valor ?? "").trim().toLowerCase();
}

export function etiquetaRol(rol) {
  return rol === "admin" ? "Administrador" : "Recepcionista";
}

export function validarNuevoUsuario(datos, existentes = []) {
  const nombre = limpiarEspacios(datos.nombre);
  const usuario = normalizarUsuario(datos.usuario);
  const password = String(datos.password ?? "");
  const confirmar = String(datos.confirmar ?? "");
  const errores = {
    nombre: validarNombre(nombre),
    usuario: "",
    password: "",
    confirmar: "",
    empresa: "",
    rol: "",
  };

  if (!usuario) {
    errores.usuario = "El nombre de usuario es obligatorio.";
  } else if (!USUARIO_VALIDO.test(usuario)) {
    errores.usuario =
      "Usa de 4 a 20 caracteres: letras minúsculas, números, punto, guion o guion bajo.";
  } else if (
    existentes.some(
      (item) => normalizarUsuario(item.usuario) === usuario,
    )
  ) {
    errores.usuario = "Ese nombre de usuario ya está registrado.";
  }

  if (!password) {
    errores.password = "La contraseña es obligatoria.";
  } else if (password.length < 8) {
    errores.password = "Debe tener al menos 8 caracteres.";
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errores.password = "Debe incluir al menos una letra y un número.";
  }

  if (!confirmar) {
    errores.confirmar = "Confirma la contraseña.";
  } else if (confirmar !== password) {
    errores.confirmar = "Las contraseñas no coinciden.";
  }

  if (!EMPRESAS.includes(datos.empresa)) {
    errores.empresa = "Selecciona la empresa.";
  }

  if (!ROLES_USUARIO.some((rol) => rol.valor === datos.rol)) {
    errores.rol = "Selecciona el perfil de acceso.";
  }

  return errores;
}
