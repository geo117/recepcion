import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { FiDownload, FiSearch, FiX } from "react-icons/fi";
import { api } from "../services/api";
import { useAuth } from "../hooks/authContext";
import {
  alertaAviso,
  alertaError,
  alertaExito,
  alertaTemporal,
  confirmarAccion,
} from "../utils/alertas";
import { descargarCSV } from "../utils/csv";
import { hoyISO } from "../utils/fecha";
import { ESTADOS } from "../utils/validaciones";
import GYJButton from "../components/ui/GYJButton";
import TablaVisitantes from "../components/visitantes/TablaVisitantes";

const FILTROS_INICIALES = {
  busqueda: "",
  estado: "",
  desde: "",
  hasta: "",
};

const COLUMNAS_CSV = [
  "Nombre",
  "Documento",
  "Empresa",
  "Persona a visitar",
  "Motivo",
  "Teléfono",
  "Fecha",
  "Entrada",
  "Salida",
  "Estado",
  "Registrado por",
];

export default function Visitantes() {
  const { esAdmin } = useAuth();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(1);
  const [version, setVersion] = useState(0);
  const [resultado, setResultado] = useState({
    datos: [],
    total: 0,
    pagina: 1,
    porPagina: 20,
    totalPaginas: 1,
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [registrandoId, setRegistrandoId] = useState("");
  const [eliminandoId, setEliminandoId] = useState("");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let activo = true;
    const temporizador = window.setTimeout(async () => {
      setCargando(true);
      setError("");
      try {
        const respuesta = await api.listarVisitas({
          ...filtros,
          pagina,
          porPagina: 20,
        });
        if (!activo) return;
        setResultado(respuesta);
        if (respuesta.totalPaginas > 0 && pagina > respuesta.totalPaginas) {
          setPagina(respuesta.totalPaginas);
        }
      } catch {
        if (!activo) return;
        setError(
          "No se pudo conectar con el servidor. Verifica la conexión e intenta nuevamente.",
        );
      } finally {
        if (activo) setCargando(false);
      }
    }, filtros.busqueda ? 320 : 0);

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [filtros, pagina, version]);

  const hayFiltros = Object.values(filtros).some(Boolean);

  const recargar = () => setVersion((actual) => actual + 1);

  const cambiarFiltro = (campo, valor) => {
    setFiltros((actuales) => {
      const siguientes = { ...actuales, [campo]: valor };
      if (campo === "desde" && valor && siguientes.hasta && valor > siguientes.hasta) {
        siguientes.hasta = valor;
      }
      if (campo === "hasta" && valor && siguientes.desde && valor < siguientes.desde) {
        siguientes.desde = valor;
      }
      return siguientes;
    });
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_INICIALES);
    setPagina(1);
  };

  const manejarSalida = async (visitante) => {
    const confirmado = await confirmarAccion(
      "Registrar salida",
      `¿Confirmas la salida de ${visitante.nombre}? Se guardará la hora actual.`,
      { confirmar: "Registrar salida" },
    );
    if (!confirmado) return;

    setRegistrandoId(visitante.id);
    try {
      await api.registrarSalida(visitante.id);
      recargar();
      alertaTemporal(
        "Salida registrada",
        `${visitante.nombre} quedó marcado como fuera de la oficina.`,
      );
    } catch (fallo) {
      await alertaError(
        "No se pudo registrar la salida",
        fallo?.codigo === 409 ? fallo.message : "Intenta nuevamente.",
      );
    } finally {
      setRegistrandoId("");
    }
  };

  const manejarEliminar = async (visitante) => {
    const confirmado = await confirmarAccion(
      "Eliminar registro",
      `Esta acción elimina permanentemente el registro de ${visitante.nombre}. No se puede deshacer.`,
      { confirmar: "Eliminar registro" },
    );
    if (!confirmado) return;

    setEliminandoId(visitante.id);
    try {
      await api.eliminarVisita(visitante.id);
      await alertaExito("Registro eliminado", "El historial se actualizó.");
      if (resultado.datos.length === 1 && pagina > 1) {
        setPagina(pagina - 1);
      }
      recargar();
    } catch {
      await alertaError(
        "No se pudo eliminar el registro",
        "Intenta nuevamente en unos segundos.",
      );
    } finally {
      setEliminandoId("");
    }
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const respuesta = await api.listarVisitas({
        ...filtros,
        pagina: 1,
        porPagina: 1000,
      });
      if (respuesta.datos.length === 0) {
        await alertaAviso(
          "Sin registros para exportar",
          "Ajusta los filtros e intenta nuevamente.",
        );
        return;
      }

      const filas = respuesta.datos.map((visitante) => [
        visitante.nombre,
        visitante.documento,
        visitante.empresa,
        visitante.personaVisitar,
        visitante.motivo,
        visitante.telefono,
        visitante.fecha,
        visitante.horaEntrada,
        visitante.horaSalida ?? "",
        visitante.estado === "dentro" ? "Dentro" : "Salió",
        visitante.registradoPor,
      ]);

      descargarCSV(`visitantes-gyj-${hoyISO()}.csv`, COLUMNAS_CSV, filas);
    } catch {
      await alertaError(
        "No se pudo exportar",
        "Verifica la conexión e intenta nuevamente.",
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__titulo">Visitantes</h1>
          <p className="page-head__descripcion">
            Consulta el historial, registra salidas y administra los registros
            de la oficina.
          </p>
        </div>
        <div className="page-head__acciones">
          <GYJButton
            variant="outline"
            icono={FiDownload}
            onClick={exportar}
            cargando={exportando}
          >
            Exportar CSV
          </GYJButton>
        </div>
      </div>

      <div className="filtros" role="search" aria-label="Filtros de visitantes">
        <div className="filtros__busqueda">
          <label className="filtros__etiqueta" htmlFor="busqueda">
            Buscar
          </label>
          <div className="gyj-input-icono">
            <FiSearch aria-hidden="true" />
            <Form.Control
              id="busqueda"
              type="search"
              placeholder="Nombre, documento o empresa"
              value={filtros.busqueda}
              onChange={(evento) =>
                cambiarFiltro("busqueda", evento.target.value)
              }
            />
          </div>
        </div>

        <div>
          <label className="filtros__etiqueta" htmlFor="desde">
            Desde
          </label>
          <Form.Control
            id="desde"
            type="date"
            value={filtros.desde}
            max={hoyISO()}
            onChange={(evento) => cambiarFiltro("desde", evento.target.value)}
          />
        </div>

        <div>
          <label className="filtros__etiqueta" htmlFor="hasta">
            Hasta
          </label>
          <Form.Control
            id="hasta"
            type="date"
            value={filtros.hasta}
            max={hoyISO()}
            onChange={(evento) => cambiarFiltro("hasta", evento.target.value)}
          />
        </div>

        <div>
          <label className="filtros__etiqueta" htmlFor="estado">
            Estado
          </label>
          <Form.Select
            id="estado"
            value={filtros.estado}
            onChange={(evento) => cambiarFiltro("estado", evento.target.value)}
          >
            <option value="">Todos</option>
            {ESTADOS.map((estado) => (
              <option key={estado.valor} value={estado.valor}>
                {estado.etiqueta}
              </option>
            ))}
          </Form.Select>
        </div>

        {hayFiltros && (
          <div className="filtros__limpiar">
            <GYJButton
              variant="ghost"
              className="gyj-btn--sm"
              icono={FiX}
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </GYJButton>
          </div>
        )}
      </div>

      <TablaVisitantes
        visitantes={resultado.datos}
        total={resultado.total}
        pagina={pagina}
        porPagina={resultado.porPagina}
        totalPaginas={resultado.totalPaginas}
        cargando={cargando}
        error={error}
        hayFiltros={hayFiltros}
        esAdmin={esAdmin}
        registrandoId={registrandoId}
        eliminandoId={eliminandoId}
        onPagina={setPagina}
        onReintentar={recargar}
        onSalida={manejarSalida}
        onEliminar={manejarEliminar}
      />
    </>
  );
}
