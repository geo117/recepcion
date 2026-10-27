const ZONA = "es-CO";

const formateadorFecha = new Intl.DateTimeFormat(ZONA, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formateadorFechaLarga = new Intl.DateTimeFormat(ZONA, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formateadorFechaHora = new Intl.DateTimeFormat(ZONA, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function aISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function hoyISO() {
  return aISO(new Date());
}

export function sumarDias(fechaISO, dias) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return aISO(fecha);
}

export function primerDiaDelMes() {
  const fecha = new Date();
  fecha.setDate(1);
  return aISO(fecha);
}

export function formatearFecha(fechaISO) {
  if (!fechaISO) return "—";
  const fecha = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return "—";
  return formateadorFecha.format(fecha).replace(".", "");
}

export function formatearFechaLarga(fechaISO) {
  if (!fechaISO) return "—";
  const fecha = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return "—";
  const texto = formateadorFechaLarga.format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatearFechaHora(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return formateadorFechaHora.format(fecha).replace(".", "");
}

export function formatearHora(hora) {
  if (!hora) return "—";
  const [horas, minutos] = String(hora).split(":");
  if (horas === undefined) return "—";
  const fecha = new Date(2000, 0, 1, Number(horas), Number(minutos || 0));
  return new Intl.DateTimeFormat(ZONA, {
    hour: "numeric",
    minute: "2-digit",
  }).format(fecha);
}

export function horaActual() {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, "0")}:${String(
    ahora.getMinutes(),
  ).padStart(2, "0")}`;
}

export function hoyTexto() {
  return formatearFechaLarga(hoyISO());
}
