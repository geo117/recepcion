import Swal from "sweetalert2";

const base = {
  customClass: { popup: "gyj-swal" },
  buttonsStyling: true,
  confirmButtonColor: "#f2b705",
  cancelButtonColor: "#e8e6e1",
  confirmButtonText: "Aceptar",
  reverseButtons: true,
};

export function alertaExito(titulo, texto) {
  return Swal.fire({
    ...base,
    icon: "success",
    iconColor: "#d9a404",
    title: titulo,
    text: texto,
  });
}

export function alertaError(titulo, texto) {
  return Swal.fire({
    ...base,
    icon: "error",
    iconColor: "#b42318",
    title: titulo,
    text: texto,
  });
}

export function alertaAviso(titulo, texto) {
  return Swal.fire({
    ...base,
    icon: "info",
    iconColor: "#d9a404",
    title: titulo,
    text: texto,
  });
}

export async function confirmarAccion(titulo, texto, opciones = {}) {
  const resultado = await Swal.fire({
    ...base,
    icon: "question",
    iconColor: "#d9a404",
    title: titulo,
    text: texto,
    showCancelButton: true,
    confirmButtonText: opciones.confirmar ?? "Sí, continuar",
    cancelButtonText: opciones.cancelar ?? "Cancelar",
    focusCancel: true,
  });

  return Boolean(resultado.isConfirmed);
}

export function alertaTemporal(titulo, texto) {
  return Swal.fire({
    ...base,
    icon: "success",
    iconColor: "#d9a404",
    title: titulo,
    text: texto,
    timer: 1600,
    showConfirmButton: false,
    timerProgressBar: true,
  });
}
