import logoAlmasa from "../assets/LOGO-almasa-1.png";
import logoColmena from "../assets/LOGO-COLMENA-oscuro.png";
import logoGyj from "../assets/logo-gyj.jpeg";

/**
 * Logos de las empresas indexados por el valor de `usuario.empresa`.
 *
 * Colmena usa una variante oscura preparada a partir de su archivo original:
 * el original es blanco sobre transparente y desaparecería sobre los fondos
 * claros donde se muestra (sidebar y etiqueta). Esa variante también recorta
 * el lema "Acero en evolución", que a tamaño de encabezado solo añadía ruido.
 */
const LOGOS = {
  "GYJ Ferreterías": {
    src: logoGyj,
    nombre: "GYJ Ferreterías",
  },
  Almasa: {
    src: logoAlmasa,
    nombre: "Almasa Soluciones Constructivas",
  },
  Colmena: {
    src: logoColmena,
    nombre: "Colmena Acero en Evolución",
  },
};

export const EMPRESA_POR_DEFECTO = "GYJ Ferreterías";

export function logoPorEmpresa(empresa) {
  return LOGOS[empresa] ?? LOGOS[EMPRESA_POR_DEFECTO];
}
