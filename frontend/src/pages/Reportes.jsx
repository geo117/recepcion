import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { FiDownload, FiPrinter } from "react-icons/fi";
import { api } from "../services/api";
import { useAuth } from "../hooks/authContext";
import { alertaError, alertaExito } from "../utils/alertas";
import { descargarCSV } from "../utils/csv";
import {
  formatearFecha,
  formatearFechaLarga,
  hoyISO,
  primerDiaDelMes,
} from "../utils/fecha";
import AccesoRestringido from "../components/layout/AccesoRestringido";
import GYJButton from "../components/ui/GYJButton";
import GYJCard from "../components/ui/GYJCard";

const COLUMNAS_CSV = [
  "Nombre",
  "Documento",
  "RH",
  "Empresa",
  "Persona a visitar",
  "Motivo",
  "Fecha",
  "Entrada",
  "Salida",
  "Estado",
];

function ReportesAdmin() {
  const [desde, setDesde] = useState(primerDiaDelMes);
  const [hasta, setHasta] = useState(hoyISO);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let activo = true;

    api
      .obtenerResumen({ desde, hasta })
      .then((resultado) => {
        if (activo) setResumen(resultado);
      })
      .catch(() => {
        if (activo) {
          setError(
            "No se pudo generar el resumen. Verifica la conexión e intenta nuevamente.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [desde, hasta, version]);

  const ajustarDesde = (valor) => {
    setCargando(true);
    setError("");
    setDesde(valor);
    if (valor && hasta && valor > hasta) setHasta(valor);
  };

  const ajustarHasta = (valor) => {
    setCargando(true);
    setError("");
    setHasta(valor);
    if (valor && desde && valor < desde) setDesde(valor);
  };

  const volverAlMesActual = () => {
    setCargando(true);
    setError("");
    setDesde(primerDiaDelMes());
    setHasta(hoyISO());
  };

  const reintentar = () => {
    setCargando(true);
    setError("");
    setVersion((actual) => actual + 1);
  };

  const exportarCSV = async () => {
    setExportando(true);
    try {
      const resultado = await api.listarVisitas({
        desde,
        hasta,
        pagina: 1,
        porPagina: 1000,
      });
      if (resultado.datos.length === 0) {
        await alertaError(
          "Sin datos para exportar",
          "No hay visitantes registrados en el rango seleccionado.",
        );
        return;
      }

      descargarCSV(
        `reporte-visitantes-${desde}-a-${hasta}.csv`,
        COLUMNAS_CSV,
        resultado.datos.map((visita) => [
          visita.nombre,
          visita.documento,
          visita.rh,
          visita.empresa,
          visita.personaVisitar,
          visita.motivo,
          visita.fecha,
          visita.horaEntrada,
          visita.horaSalida ?? "",
          visita.estado === "dentro" ? "Dentro" : "Salió",
        ]),
      );
      await alertaExito(
        "Reporte exportado",
        "El archivo CSV se descargó en tu equipo.",
      );
    } catch {
      await alertaError(
        "No se pudo exportar",
        "Verifica la conexión e intenta nuevamente.",
      );
    } finally {
      setExportando(false);
    }
  };

  const maximoMotivo = Math.max(
    1,
    ...(resumen?.porMotivo ?? []).map((item) => item.cantidad),
  );
  const diasConActividad = (resumen?.porDia ?? []).slice(-12);
  const maximoDia = Math.max(
    1,
    ...diasConActividad.map((item) => item.cantidad),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__titulo">Reportes</h1>
          <p className="page-head__descripcion">
            Resumen de visitantes entre {formatearFechaLarga(desde)} y{" "}
            {formatearFechaLarga(hasta)}.
          </p>
        </div>
        <div className="page-head__acciones no-imprimir">
          <GYJButton
            variant="outline"
            icono={FiDownload}
            onClick={exportarCSV}
            cargando={exportando}
          >
            Exportar CSV
          </GYJButton>
          <GYJButton
            variant="outline"
            icono={FiPrinter}
            onClick={() => window.print()}
          >
            Imprimir / PDF
          </GYJButton>
        </div>
      </div>

      <div className="reportes-filtros no-imprimir">
        <div className="gyj-campo">
          <label className="filtros__etiqueta" htmlFor="reporte-desde">
            Desde
          </label>
          <Form.Control
            id="reporte-desde"
            type="date"
            value={desde}
            max={hoyISO()}
            onChange={(evento) => ajustarDesde(evento.target.value)}
          />
        </div>
        <div className="gyj-campo">
          <label className="filtros__etiqueta" htmlFor="reporte-hasta">
            Hasta
          </label>
          <Form.Control
            id="reporte-hasta"
            type="date"
            value={hasta}
            max={hoyISO()}
            onChange={(evento) => ajustarHasta(evento.target.value)}
          />
        </div>
        <div className="reportes-filtros__acciones">
          <GYJButton
            variant="ghost"
            onClick={volverAlMesActual}
          >
            Mes actual
          </GYJButton>
        </div>
      </div>

      {cargando ? (
        <div className="cargando-bloque">
          <span className="spinner-border" aria-hidden="true" />
          <span>Generando resumen…</span>
        </div>
      ) : error ? (
        <div className="estado-pantalla">
          <p>{error}</p>
          <GYJButton variant="outline" onClick={reintentar}>
            Reintentar
          </GYJButton>
        </div>
      ) : (
        <div aria-busy={cargando}>
          <section className="metricas" aria-label="Resumen del periodo">
            <div className="metrica">
              <p className="metrica__etiqueta">Visitantes registrados</p>
              <p className="metrica__valor">{resumen?.total ?? 0}</p>
              <p className="metrica__detalle">
                {resumen?.dentro ?? 0} continúan dentro de la oficina
              </p>
            </div>
            <div className="metrica">
              <p className="metrica__etiqueta">Promedio diario</p>
              <p className="metrica__valor">
                {(resumen?.promedioDiario ?? 0).toFixed(1)}
              </p>
              <p className="metrica__detalle">
                Calculado sobre {resumen?.dias ?? 0}{" "}
                {resumen?.dias === 1 ? "día" : "días"} del rango
              </p>
            </div>
            <div className="metrica">
              <p className="metrica__etiqueta">Motivo más frecuente</p>
              <p className="metrica__valor metrica__valor--texto">
                {resumen?.motivoFrecuente ?? "Sin registros"}
              </p>
              <p className="metrica__detalle">
                {resumen?.porMotivo?.[0]
                  ? `${resumen.porMotivo[0].cantidad} visitas en el periodo`
                  : "Aún no hay datos suficientes"}
              </p>
            </div>
          </section>

          <div className="reportes-grid">
            <GYJCard
              titulo="Visitas por motivo"
              descripcion="Distribución de las entradas del periodo."
            >
              {resumen?.porMotivo?.length ? (
                <div className="barras">
                  {resumen.porMotivo.map((item) => (
                    <div className="barras__fila" key={item.motivo}>
                      <div>
                        <div className="barras__etiqueta">
                          <span>{item.motivo}</span>
                          <span className="barras__valor">
                            {item.cantidad}
                          </span>
                        </div>
                        <div className="barras__pista">
                          <div
                            className="barras__relleno"
                            style={{
                              width: `${(item.cantidad / maximoMotivo) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reportes-vacio">
                  <p>No hay visitas registradas en este rango de fechas.</p>
                </div>
              )}
            </GYJCard>

            <GYJCard
              titulo="Actividad por día"
              descripcion="Últimos días con movimiento dentro del rango."
            >
              {diasConActividad.length ? (
                <div className="barras">
                  {diasConActividad.map((item) => (
                    <div className="barras__fila" key={item.fecha}>
                      <div>
                        <div className="barras__etiqueta">
                          <span>{formatearFecha(item.fecha)}</span>
                          <span className="barras__valor">{item.cantidad}</span>
                        </div>
                        <div className="barras__pista">
                          <div
                            className="barras__relleno"
                            style={{
                              width: `${(item.cantidad / maximoDia) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reportes-vacio">
                  <p>No hay actividad registrada en este rango de fechas.</p>
                </div>
              )}
            </GYJCard>
          </div>
        </div>
      )}
    </>
  );
}

export default function Reportes() {
  const { esAdmin } = useAuth();
  if (!esAdmin) return <AccesoRestringido modulo="reportes" />;
  return <ReportesAdmin />;
}
