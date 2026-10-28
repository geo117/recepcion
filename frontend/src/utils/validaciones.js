const NOMBRE_VALIDO = /^[\p{L}][\p{L}\s'.-]*$/u;
const DOCUMENTO_VALIDO = /^[A-Za-z0-9]{6,12}$/;
const TELEFONO_VALIDO = /^\d{10}$/;

export function limpiarEspacios(valor) {
  return String(valor ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Sanitiza texto libre antes de enviarlo a la API.
 * React ya escapa al renderizar; esto reduce ruido y longitud.
 */
export function sanitizarTexto(valor, maximo = 120) {
  const limpio = limpiarEspacios(valor).replace(/[<>]/g, "");
  return [...limpio]
    .filter((caracter) => {
      const codigo = caracter.charCodeAt(0);
      return codigo >= 32 && codigo !== 127;
    })
    .join("")
    .slice(0, maximo);
}

export function iniciales(nombre) {
  const partes = limpiarEspacios(nombre).split(" ").filter(Boolean);
  if (partes.length === 0) return "GY";
  return `${partes[0][0] ?? ""}${partes[1]?.[0] ?? ""}`.toUpperCase();
}

export function validarNombre(valor) {
  const nombre = limpiarEspacios(valor);
  if (nombre.length < 3) return "Escribe el nombre completo (mínimo 3 caracteres).";
  if (nombre.length > 80) return "El nombre no puede superar 80 caracteres.";
  if (!NOMBRE_VALIDO.test(nombre)) return "Usa solo letras, espacios y guiones.";
  if (nombre.split(" ").length < 2) return "Incluye al menos nombre y apellido.";
  return "";
}

export function validarDocumento(valor) {
  const documento = String(valor ?? "").trim();
  if (!documento) return "El documento de identidad es obligatorio.";
  if (!DOCUMENTO_VALIDO.test(documento)) {
    return "Debe tener entre 6 y 12 caracteres alfanuméricos.";
  }
  return "";
}

export function validarEmpresa(valor) {
  if (String(valor ?? "").trim().length > 60) {
    return "La empresa no puede superar 60 caracteres.";
  }
  return "";
}

export function validarTelefono(valor) {
  const telefono = String(valor ?? "").trim();
  if (!telefono) return "";
  if (!TELEFONO_VALIDO.test(telefono)) {
    return "Escribe un número colombiano de 10 dígitos.";
  }
  return "";
}

export function validarTelefonoEmergencia(valor) {
  return validarTelefono(valor);
}

export function validarEps(valor) {
  if (String(valor ?? "").trim().length > 60) {
    return "La EPS no puede superar 60 caracteres.";
  }
  return "";
}

export function validarArl(valor) {
  if (String(valor ?? "").trim().length > 60) {
    return "La ARL no puede superar 60 caracteres.";
  }
  return "";
}

export function validarRh(valor) {
  const rh = String(valor ?? "").trim();
  if (rh && !GRUPOS_SANGUINEOS.includes(rh)) {
    return "Selecciona un grupo sanguíneo válido.";
  }
  return "";
}

export function validarPersona(valor) {
  return valor ? "" : "Selecciona la persona a visitar.";
}

export function validarMotivo(valor) {
  const motivo = limpiarEspacios(valor);
  if (!motivo) return "Escribe el motivo de la visita.";
  if (motivo.length > 120) return "El motivo no puede superar 120 caracteres.";
  return "";
}

export function validarRegistro(campos) {
  return {
    nombre: validarNombre(campos.nombre),
    documento: validarDocumento(campos.documento),
    empresa: validarEmpresa(campos.empresa),
    telefono: validarTelefono(campos.telefono),
    telefonoEmergencia: validarTelefonoEmergencia(campos.telefonoEmergencia),
    eps: validarEps(campos.eps),
    arl: validarArl(campos.arl),
    rh: validarRh(campos.rh),
    personaId: validarPersona(campos.personaId),
    motivo: validarMotivo(campos.motivo),
  };
}

export function tieneErrores(errores) {
  return Object.values(errores).some(Boolean);
}

export const EPS = [
  "Sura",
  "Sanitas",
  "Nueva EPS",
  "Compensar",
  "Famisanar",
  "Salud Total",
  "Coosalud",
  "Mutual Ser",
  "S.O.S.",
  "Asmet Salud",
  "Savia Salud",
  "Otra",
];

export const GRUPOS_SANGUINEOS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export const ESTADOS = [
  { valor: "dentro", etiqueta: "Dentro" },
  { valor: "salio", etiqueta: "Salió" },
];
