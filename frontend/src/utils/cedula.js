import { GRUPOS_SANGUINEOS } from "./validaciones";

/**
 * Delimitadores que usan los lectores USB al transcribir el PDF417 de la
 * cédula. Se aceptan varios porque cada marca de escáner se puede configurar
 * con un separador distinto.
 */
const DELIMITADORES = /[@^|~;\t\r\n]+/;
const CARACTERES_CONTROL = [0, 29, 30, 31].map((codigo) =>
  String.fromCharCode(codigo),
);

/** Convierte separadores de control (NUL, GS, RS, US) en un delimitador común. */
function normalizarDelimitadores(texto) {
  return CARACTERES_CONTROL.reduce(
    (valor, caracter) => valor.split(caracter).join("@"),
    texto,
  );
}

const RH_EN_TOKEN =
  /^(?:RH|GS|GRUPO\s+SANGUINEO)?\s*[:-]?\s*(AB|A|B|O|0)\s*([+-])\s*$/i;
const RH_EN_TEXTO = /(AB|A|B|O|0)\s*([+-])(?![A-Za-z0-9])/i;
const RH_EN_PALABRAS = /\b(AB|A|B|O|0)\s*(POSITIVO|NEGATIVO)\b/i;

const TOKEN_NOMBRE = /^[\p{L}][\p{L}\s'.-]*$/u;

/** Palabras que pueden aparecer en el código pero no hacen parte del nombre. */
const TOKENS_NO_NOMBRE = new Set([
  "APELLIDO",
  "APELLIDOS",
  "NOMBRE",
  "NOMBRES",
  "SEXO",
  "GENERO",
  "GÉNERO",
  "FECHA",
  "NACIMIENTO",
  "EXPEDICION",
  "EXPEDICIÓN",
  "M",
  "F",
  "MASCULINO",
  "FEMENINO",
  "HOMBRE",
  "MUJER",
  "SOLTERO",
  "SOLTERA",
  "CASADO",
  "CASADA",
  "VIUDO",
  "VIUDA",
  "SEPARADO",
  "SEPARADA",
  "DIVORCIADO",
  "DIVORCIADA",
  "UNION LIBRE",
  "UNIÓN LIBRE",
  "RH",
  "GS",
  "GRUPO SANGUINEO",
  "GRUPO SANGUÍNEO",
]);

function normalizarRh(valor) {
  const limpio = String(valor ?? "")
    .toUpperCase()
    .replace(/^0(?=[+-])/, "O");

  return GRUPOS_SANGUINEOS.includes(limpio) ? limpio : "";
}

function rhDesdeCoincidencia(coincidencia) {
  if (!coincidencia) return "";
  const grupo = coincidencia[1].toUpperCase();
  const signo = coincidencia[2] === "-" ? "-" : "+";
  return normalizarRh(`${grupo}${signo}`);
}

/**
 * Busca el grupo sanguíneo dentro de cualquier campo del código.
 * Devuelve "" cuando no lo encuentra o cuando el valor no es válido.
 */
export function extraerRh(codigo) {
  const texto = normalizarDelimitadores(String(codigo ?? ""));
  if (!texto) return "";

  const tokens = texto.split(DELIMITADORES);

  // Primero se revisan los campos completos: es la forma más confiable.
  for (const token of tokens) {
    const limpio = token.replace(/\s+/g, " ").trim();
    if (!limpio) continue;

    const exacto = limpio.match(RH_EN_TOKEN);
    const rh = rhDesdeCoincidencia(exacto);
    if (rh) return rh;
  }

  const enPalabras = texto.match(RH_EN_PALABRAS);
  if (enPalabras) {
    const grupo = enPalabras[1].toUpperCase();
    const signo = /^POSITIVO$/i.test(enPalabras[2]) ? "+" : "-";
    const rh = normalizarRh(`${grupo}${signo}`);
    if (rh) return rh;
  }

  return rhDesdeCoincidencia(texto.match(RH_EN_TEXTO));
}

function esTokenDeNombre(token) {
  const limpio = token.replace(/\s+/g, " ").trim();

  if (limpio.length < 2 || limpio.length > 60) return false;
  if (/\d/.test(limpio)) return false;
  if (!TOKEN_NOMBRE.test(limpio)) return false;

  const enMayusculas = limpio.toUpperCase();
  if (TOKENS_NO_NOMBRE.has(enMayusculas)) return false;
  if (RH_EN_TOKEN.test(limpio)) return false;

  return true;
}

function limpiarNombre(valor) {
  return String(valor ?? "")
    .replace(/[^\p{L}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function extraerDocumento(tokens) {
  // El número suele venir dentro del primer campo, junto al prefijo PUBDSK.
  for (let indice = 0; indice < tokens.length; indice += 1) {
    const token = tokens[indice];
    if (!/pubdsk/i.test(token)) continue;

    const numero = token.replace(/^.*?pubdsk[^\d]*/i, "").match(/\d{6,12}/);
    if (numero) return { documento: numero[0], indice };
  }

  // Se recorre en orden: el documento casi siempre es el primer dato numérico
  // del código, incluso si viene con una etiqueta como "CC 12345678".
  for (let indice = 0; indice < tokens.length; indice += 1) {
    const token = tokens[indice];
    const soloNumeros = token.replace(/[\s.]/g, "");

    if (/^[\d\s.]+$/.test(token) && /^\d{6,12}$/.test(soloNumeros)) {
      return { documento: soloNumeros, indice };
    }

    const numero = token.match(/(?:^|\D)(\d{6,12})(?:\D|$)/);
    if (numero) return { documento: numero[1], indice };
  }

  return { documento: "", indice: -1 };
}

function extraerNombre(tokens, indiceDocumento) {
  const inicio = indiceDocumento >= 0 ? indiceDocumento + 1 : 0;
  const partes = [];

  for (let indice = inicio; indice < tokens.length; indice += 1) {
    const token = tokens[indice];

    if (esTokenDeNombre(token)) {
      partes.push(token);
      // Apellidos + nombres (incluso cuando vienen separados en 4 campos).
      if (partes.length === 4) break;
      continue;
    }

    if (partes.length > 0) break;
  }

  return limpiarNombre(partes.join(" "));
}

/**
 * Convierte la lectura cruda del PDF417 de la cédula colombiana en los datos
 * que usa el formulario de recepción.
 *
 * Soporta códigos separados por `@`, `^`, `|`, `~`, `;`, tabulación, saltos de
 * línea o caracteres de control, y tolera que el documento venga dentro del
 * token `PUBDSK_1 ...`.
 *
 * @param {string} codigo Texto completo emitido por el escáner.
 * @returns {{ documento: string, nombre: string, rh: string }}
 */
export function parsearCodigoCedula(codigo) {
  const texto = normalizarDelimitadores(String(codigo ?? "")).trim();
  if (!texto) return { documento: "", nombre: "", rh: "" };

  const tokens = texto
    .split(DELIMITADORES)
    .map((token) => token.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const rh = extraerRh(texto);
  const { documento, indice } = extraerDocumento(tokens);
  const nombre = extraerNombre(tokens, indice);

  return { documento, nombre, rh };
}
