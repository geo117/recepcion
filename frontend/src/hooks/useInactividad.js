import { useEffect, useRef } from "react";

const EVENTOS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

/**
 * Cierra la sesión tras un periodo de inactividad.
 * Se reinicia con cualquier interacción del usuario.
 */
export function useInactividad({ onExpirar, minutos = 30, activo = true }) {
  const callbackRef = useRef(onExpirar);

  useEffect(() => {
    callbackRef.current = onExpirar;
  }, [onExpirar]);

  useEffect(() => {
    if (!activo) return undefined;

    let temporizador;

    const reiniciar = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(
        () => callbackRef.current?.(),
        minutos * 60 * 1000,
      );
    };

    EVENTOS.forEach((evento) => {
      window.addEventListener(evento, reiniciar, { passive: true });
    });
    reiniciar();

    return () => {
      window.clearTimeout(temporizador);
      EVENTOS.forEach((evento) => {
        window.removeEventListener(evento, reiniciar);
      });
    };
  }, [activo, minutos]);
}
