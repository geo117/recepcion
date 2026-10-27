export const TOKEN_KEY = "gyj_token";
export const USER_KEY = "gyj_user";

export function decodificarToken(token) {
  try {
    const payload = String(token).split(".")[1];
    if (!payload) return null;
    const normalizado = payload.replace(/-/g, "+").replace(/_/g, "/");
    const relleno = "=".repeat((4 - (normalizado.length % 4)) % 4);
    const binario = atob(normalizado + relleno);
    const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function tokenVigente(token) {
  if (!token) return false;
  const payload = decodificarToken(token);
  if (!payload) return true;
  if (!payload.exp) return true;
  return payload.exp * 1000 > Date.now();
}

export function guardarSesion(token, usuario) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function leerSesion() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const usuarioGuardado = sessionStorage.getItem(USER_KEY);

  if (!token || !usuarioGuardado) return null;

  if (!tokenVigente(token)) {
    limpiarSesion();
    return null;
  }

  try {
    return { token, usuario: JSON.parse(usuarioGuardado) };
  } catch {
    limpiarSesion();
    return null;
  }
}

export function limpiarSesion() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function obtenerToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
