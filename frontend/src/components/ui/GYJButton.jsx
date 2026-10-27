import { Button, Spinner } from "react-bootstrap";

export default function GYJButton({
  children,
  variant = "primary",
  icono: Icono,
  cargando = false,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <Button
      type={type}
      disabled={disabled || cargando}
      className={`gyj-btn gyj-btn--${variant} ${className}`.trim()}
      {...props}
    >
      {cargando ? (
        <Spinner animation="border" role="status" aria-hidden="true" />
      ) : (
        Icono && <Icono aria-hidden="true" />
      )}
      {children ? <span>{children}</span> : null}
    </Button>
  );
}
