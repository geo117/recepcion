import { forwardRef } from "react";
import { Form } from "react-bootstrap";

const GYJInput = forwardRef(function GYJInput(
  {
    label,
    id,
    name,
    icono: Icono,
    error,
    ayuda,
    obligatorio = false,
    className = "",
    children,
    as,
    ...props
  },
  ref,
) {
  const inputId = id ?? name;

  return (
    <Form.Group className={`gyj-campo ${className}`.trim()}>
      {label && (
        <Form.Label htmlFor={inputId}>
          {label}
          {obligatorio && (
            <span className="marca-obligatorio" aria-hidden="true">
              *
            </span>
          )}
        </Form.Label>
      )}

      <div className="gyj-input-icono">
        {Icono && <Icono aria-hidden="true" />}
        <Form.Control
          ref={ref}
          id={inputId}
          name={name}
          as={as}
          isInvalid={Boolean(error)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        >
          {children}
        </Form.Control>
      </div>

      {error ? (
        <div className="invalid-feedback d-block" id={`${inputId}-error`}>
          {error}
        </div>
      ) : (
        ayuda && <Form.Text>{ayuda}</Form.Text>
      )}
    </Form.Group>
  );
});

export default GYJInput;
