import { logoPorEmpresa } from "../../utils/logosEmpresa";

/**
 * Logo de una empresa dentro de una placa clara y redondeada.
 *
 * La placa unifica los tres archivos, que tienen proporciones y colores muy
 * distintos, y evita que el logo se vea apretado o estirado: la imagen siempre
 * se ajusta con `object-fit: contain`, sin deformarse.
 */
export default function LogoEmpresa({
  empresa,
  tamano = "md",
  decorativo = false,
  className = "",
}) {
  const logo = logoPorEmpresa(empresa);

  return (
    <span
      className={`logo-empresa logo-empresa--${tamano} ${className}`.trim()}
      title={logo.nombre}
      aria-hidden={decorativo || undefined}
    >
      <img
        className="logo-empresa__img"
        src={logo.src}
        alt={decorativo ? "" : logo.nombre}
      />
    </span>
  );
}
