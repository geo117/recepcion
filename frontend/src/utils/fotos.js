const CARACTERES_INVALIDOS = /[\\/:*?"<>|]/g;

export function nombreArchivoFoto(nombre) {
  const limpio = String(nombre ?? "")
    .replace(CARACTERES_INVALIDOS, "")
    .trim();

  return `${limpio || "visitante"}.png`;
}
