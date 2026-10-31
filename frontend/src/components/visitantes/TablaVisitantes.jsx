import { Fragment } from "react";
import { Pagination, Table } from "react-bootstrap";
import {
  FiEye,
  FiLogOut,
  FiPrinter,
  FiSearch,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { formatearFecha, formatearHora } from "../../utils/fecha";
import GYJBadge from "../ui/GYJBadge";
import GYJButton from "../ui/GYJButton";
import MenuAcciones from "./MenuAcciones";

function paginasVisibles(actual, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, indice) => indice + 1);
  }

  const paginas = new Set([1, total, actual - 1, actual, actual + 1]);
  return [...paginas]
    .filter((pagina) => pagina >= 1 && pagina <= total)
    .sort((a, b) => a - b);
}

export default function TablaVisitantes({
  visitantes = [],
  total = 0,
  pagina = 1,
  porPagina = 20,
  totalPaginas = 1,
  cargando = false,
  error = "",
  hayFiltros = false,
  esAdmin = false,
  registrandoId = "",
  eliminandoId = "",
  onPagina,
  onReintentar,
  onVer,
  onImprimir,
  onSalida,
  onEliminar,
}) {
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  const numeros = paginasVisibles(pagina, totalPaginas);

  return (
    <div className="tabla-envoltura" aria-busy={cargando}>
      {cargando ? (
        <div className="cargando-bloque">
          <span className="spinner-border" aria-hidden="true" />
          <span>Cargando visitantes…</span>
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
          {hayFiltros ? (
            <FiSearch aria-hidden="true" />
          ) : (
            <FiUsers aria-hidden="true" />
          )}
          <p className="tabla-vacia__titulo">
            {hayFiltros
              ? "No encontramos coincidencias"
              : esAdmin
                ? "Todavía no hay visitantes registrados"
                : "Todavía no has registrado visitantes"}
          </p>
          <p className="tabla-vacia__texto">
            {hayFiltros
              ? "Prueba con otro nombre, documento o rango de fechas."
              : "Los registros de entrada que hagas aparecerán aquí automáticamente."}
          </p>
        </div>
      ) : (
        <Table responsive hover className="gyj-table align-middle">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Documento</th>
              <th scope="col">Empresa</th>
              <th scope="col">Persona a visitar</th>
              <th scope="col">Entrada</th>
              <th scope="col">Salida</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-end">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {visitantes.map((visitante) => (
              <tr key={visitante.id}>
                <td>
                  <span className="gyj-table__nombre">{visitante.nombre}</span>
                  <span className="gyj-table__empresa">
                    {formatearFecha(visitante.fecha)}
                  </span>
                </td>
                <td className="gyj-table__documento">{visitante.documento}</td>
                <td>
                  <span className="gyj-table__empresa" title={visitante.empresa}>
                    {visitante.empresa || "—"}
                  </span>
                </td>
                <td>{visitante.personaVisitar}</td>
                <td className="gyj-table__hora">
                  {formatearHora(visitante.horaEntrada)}
                </td>
                <td className="gyj-table__hora">
                  {visitante.horaSalida ? (
                    formatearHora(visitante.horaSalida)
                  ) : (
                    <span className="texto-secundario">—</span>
                  )}
                </td>
                <td>
                  <GYJBadge estado={visitante.estado} />
                </td>
                <td>
                  <div className="gyj-table__acciones">
                    <MenuAcciones
                      etiqueta={`Acciones para ${visitante.nombre}`}
                      acciones={[
                        {
                          etiqueta: "Ver detalle",
                          icono: FiEye,
                          onClick: () => onVer?.(visitante),
                        },
                        {
                          etiqueta: "Imprimir etiqueta",
                          icono: FiPrinter,
                          onClick: () => onImprimir?.(visitante),
                        },
                        visitante.estado === "dentro" && {
                          etiqueta: "Registrar salida",
                          icono: FiLogOut,
                          onClick: () => onSalida?.(visitante),
                          deshabilitado: registrandoId === visitante.id,
                        },
                        esAdmin && { separador: true },
                        esAdmin && {
                          etiqueta: "Eliminar registro",
                          icono: FiTrash2,
                          onClick: () => onEliminar?.(visitante),
                          peligro: true,
                          deshabilitado: eliminandoId === visitante.id,
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {!cargando && !error && visitantes.length > 0 && (
        <div className="paginacion">
          <span className="paginacion__texto">
            Mostrando {desde}–{hasta} de {total} registros
          </span>
          <Pagination aria-label="Paginación de visitantes">
            <Pagination.Prev
              disabled={pagina <= 1}
              onClick={() => onPagina?.(pagina - 1)}
            />
            {numeros.map((numero, indice) => {
              const anterior = numeros[indice - 1];
              const haySalto = anterior && numero - anterior > 1;
              return (
                <Fragment key={numero}>
                  {haySalto && <Pagination.Ellipsis disabled />}
                  <Pagination.Item
                    active={numero === pagina}
                    onClick={() => onPagina?.(numero)}
                  >
                    {numero}
                  </Pagination.Item>
                </Fragment>
              );
            })}
            <Pagination.Next
              disabled={pagina >= totalPaginas}
              onClick={() => onPagina?.(pagina + 1)}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
}
