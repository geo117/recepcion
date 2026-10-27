import { Table } from "react-bootstrap";
import { FiLogOut, FiUsers } from "react-icons/fi";
import { formatearHora } from "../../utils/fecha";
import GYJBadge from "../ui/GYJBadge";
import GYJButton from "../ui/GYJButton";

export default function TablaUltimos({
  visitantes = [],
  cargando = false,
  error = "",
  onReintentar,
  onRegistrarSalida,
  registrandoId = "",
}) {
  return (
    <section className="seccion-tabla" aria-labelledby="titulo-ultimos">
      <div className="seccion-tabla__head">
        <h2 className="seccion-tabla__titulo" id="titulo-ultimos">
          Últimos visitantes de hoy
        </h2>
        <span className="seccion-tabla__meta">
          {visitantes.length > 0
            ? `${visitantes.length} movimiento${visitantes.length === 1 ? "" : "s"} reciente${visitantes.length === 1 ? "" : "s"}`
            : "Sin movimientos aún"}
        </span>
      </div>

      <div
        className="tabla-envoltura"
        aria-live="polite"
        aria-busy={cargando}
      >
        {cargando ? (
          <div className="cargando-bloque">
            <span className="spinner-border" aria-hidden="true" />
            <span>Cargando movimientos…</span>
          </div>
        ) : error ? (
          <div className="tabla-vacia">
            <FiUsers aria-hidden="true" />
            <p className="tabla-vacia__titulo">No se pudieron cargar los datos</p>
            <p className="tabla-vacia__texto">{error}</p>
            {onReintentar && (
              <GYJButton variant="outline" onClick={onReintentar}>
                Reintentar
              </GYJButton>
            )}
          </div>
        ) : visitantes.length === 0 ? (
          <div className="tabla-vacia">
            <FiUsers aria-hidden="true" />
            <p className="tabla-vacia__titulo">Aún no hay visitantes hoy</p>
            <p className="tabla-vacia__texto">
              Los registros del día aparecerán aquí en cuanto registres la
              primera entrada.
            </p>
          </div>
        ) : (
          <Table responsive hover className="gyj-table align-middle">
            <thead>
              <tr>
                <th scope="col">Visitante</th>
                <th scope="col">Entrada</th>
                <th scope="col">Persona a visitar</th>
                <th scope="col">Estado</th>
                <th scope="col" className="text-end">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {visitantes.map((visitante) => (
                <tr key={visitante.id}>
                  <td>
                    <span className="gyj-table__nombre">{visitante.nombre}</span>
                    {visitante.empresa && (
                      <span className="gyj-table__empresa">
                        {visitante.empresa}
                      </span>
                    )}
                  </td>
                  <td className="gyj-table__hora">
                    {formatearHora(visitante.horaEntrada)}
                  </td>
                  <td>{visitante.personaVisitar}</td>
                  <td>
                    <GYJBadge estado={visitante.estado} />
                  </td>
                  <td>
                    <div className="gyj-table__acciones">
                      {visitante.estado === "dentro" ? (
                        <GYJButton
                          variant="outline"
                          className="gyj-btn--icono"
                          icono={FiLogOut}
                          onClick={() => onRegistrarSalida?.(visitante)}
                          cargando={registrandoId === visitante.id}
                          aria-label={`Registrar salida de ${visitante.nombre}`}
                          title="Registrar salida"
                        />
                      ) : (
                        <span className="texto-pequeno texto-secundario">
                          {formatearHora(visitante.horaSalida)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </section>
  );
}
