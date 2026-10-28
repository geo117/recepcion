import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMoreVertical } from "react-icons/fi";

const ANCHO_MENU = 208;
const MARGEN = 8;
const SEPARACION = 4;

export default function MenuAcciones({
  etiqueta = "Acciones",
  acciones = [],
  deshabilitado = false,
  nota = "",
}) {
  const botonRef = useRef(null);
  const menuRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });

  const abrir = () => {
    const boton = botonRef.current;
    if (!boton) return;
    const rect = boton.getBoundingClientRect();
    setPosicion({
      top: rect.bottom + SEPARACION,
      left: Math.max(MARGEN, rect.right - ANCHO_MENU),
    });
    setAbierto(true);
  };

  const alternar = () => {
    if (abierto) {
      setAbierto(false);
      return;
    }
    abrir();
  };

  useEffect(() => {
    if (!abierto) return;

    const manejarPuntero = (evento) => {
      if (botonRef.current?.contains(evento.target)) return;
      if (menuRef.current?.contains(evento.target)) return;
      setAbierto(false);
    };

    const manejarTecla = (evento) => {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      botonRef.current?.focus();
    };

    const manejarVista = () => setAbierto(false);

    document.addEventListener("pointerdown", manejarPuntero);
    document.addEventListener("keydown", manejarTecla);
    window.addEventListener("resize", manejarVista);
    window.addEventListener("scroll", manejarVista, true);

    return () => {
      document.removeEventListener("pointerdown", manejarPuntero);
      document.removeEventListener("keydown", manejarTecla);
      window.removeEventListener("resize", manejarVista);
      window.removeEventListener("scroll", manejarVista, true);
    };
  }, [abierto]);

  useLayoutEffect(() => {
    if (!abierto) return;
    const boton = botonRef.current;
    const menu = menuRef.current;
    if (!boton || !menu) return;

    const rect = boton.getBoundingClientRect();
    const alto = menu.offsetHeight;
    if (posicion.top + alto > window.innerHeight - MARGEN) {
      setPosicion((actual) => ({
        ...actual,
        top: Math.max(MARGEN, rect.top - alto - SEPARACION),
      }));
    }

    const primero = menu.querySelector(".gyj-menu__item:not(:disabled)");
    if (primero) primero.focus();
    else menu.focus();
  }, [abierto, posicion.top]);

  const visibles = acciones.filter(Boolean);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className="gyj-menu__boton"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={alternar}
        disabled={deshabilitado}
      >
        <FiMoreVertical aria-hidden="true" />
      </button>

      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            className="gyj-menu"
            role="menu"
            aria-label={etiqueta}
            tabIndex={-1}
            style={{ top: posicion.top, left: posicion.left }}
          >
            {nota && (
              <div className="gyj-menu__nota" role="presentation">
                {nota}
              </div>
            )}

            {visibles.map((accion, indice) => {
              if (accion.separador) {
                return (
                  <div
                    key={`separador-${indice}`}
                    className="gyj-menu__separador"
                    role="separator"
                  />
                );
              }

              const Icono = accion.icono;
              return (
                <button
                  key={accion.etiqueta}
                  type="button"
                  role="menuitem"
                  className={`gyj-menu__item ${
                    accion.peligro ? "gyj-menu__item--peligro" : ""
                  }`.trim()}
                  disabled={accion.deshabilitado}
                  onClick={() => {
                    setAbierto(false);
                    accion.onClick?.();
                  }}
                >
                  {Icono && <Icono aria-hidden="true" />}
                  <span>{accion.etiqueta}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
