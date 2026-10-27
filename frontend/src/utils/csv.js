function escaparCelda(valor) {
  const texto = String(valor ?? "");
  if (/[";\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/**
 * Descarga un CSV codificado en UTF-8 con BOM y separador punto y coma,
 * de modo que Excel en español abra las columnas correctamente.
 */
export function descargarCSV(nombreArchivo, cabeceras, filas) {
  const lineas = [
    cabeceras.map(escaparCelda).join(";"),
    ...filas.map((fila) => fila.map(escaparCelda).join(";")),
  ];
  const contenido = `\uFEFF${lineas.join("\r\n")}`;
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
