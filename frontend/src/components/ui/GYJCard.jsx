export default function GYJCard({
  children,
  titulo,
  descripcion,
  acciones,
  className = "",
  ...props
}) {
  return (
    <section className={`gyj-card ${className}`.trim()} {...props}>
      {(titulo || descripcion || acciones) && (
        <header className="gyj-card__encabezado">
          <div>
            {titulo && <h2 className="gyj-card__titulo">{titulo}</h2>}
            {descripcion && (
              <p className="gyj-card__descripcion">{descripcion}</p>
            )}
          </div>
          {acciones}
        </header>
      )}
      {children}
    </section>
  );
}
