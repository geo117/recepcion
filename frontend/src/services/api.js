import * as demo from "./mockApi";
import { ErrorApi } from "./mockApi";
import { limpiarSesion, obtenerToken } from "./sesion";

const BASE_URL = String(import.meta.env.VITE_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

/**
 * Sin VITE_API_URL la aplicación funciona con el adaptador local de
 * demostración. Al definir la variable se consume el backend real.
 */
export const esModoDemo = !BASE_URL;

export { CREDENCIALES_DEMO, ErrorApi } from "./mockApi";

const MENSAJES = {
  400: "Revisa los datos del formulario e intenta nuevamente.",
  401: "Tu sesión expiró. Inicia sesión nuevamente.",
  403: "No tienes permisos para realizar esta acción.",
  404: "No encontramos la información solicitada.",
  409: "La operación no se pudo completar por un conflicto con los datos.",
  422: "Algunos datos no son válidos. Revísalos e intenta nuevamente.",
  500: "El servidor no está disponible en este momento. Intenta más tarde.",
};

function construirUrl(ruta, params = {}) {
  const url = new URL(`${BASE_URL}${ruta}`, window.location.origin);
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "") {
      url.searchParams.set(clave, valor);
    }
  });
  return url.toString();
}

function traducirError(estado, datos) {
  if (estado === 400 && datos?.errores) {
    return new ErrorApi(MENSAJES[400], 400);
  }
  return new ErrorApi(MENSAJES[estado] ?? MENSAJES[500], estado);
}

async function peticion(ruta, { metodo = "GET", cuerpo, params } = {}) {
  const token = obtenerToken();
  const cabeceras = { Accept: "application/json" };

  if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(construirUrl(ruta, params), {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(
      "No se pudo conectar con el servidor. Intenta nuevamente.",
      0,
    );
  }

  if (respuesta.status === 401) {
    limpiarSesion();
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    throw new ErrorApi(MENSAJES[401], 401);
  }

  const texto = await respuesta.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null;
    }
  }

  if (!respuesta.ok) throw traducirError(respuesta.status, datos);
  return datos;
}

function normalizarLista(resultado) {
  if (Array.isArray(resultado)) {
    return {
      datos: resultado,
      total: resultado.length,
      pagina: 1,
      porPagina: resultado.length,
      totalPaginas: 1,
    };
  }
  return {
    datos: resultado?.datos ?? resultado?.data ?? [],
    total: resultado?.total ?? 0,
    pagina: resultado?.pagina ?? 1,
    porPagina: resultado?.porPagina ?? 20,
    totalPaginas: resultado?.totalPaginas ?? 1,
  };
}

export const api = {
  iniciarSesion(credenciales) {
    return esModoDemo
      ? demo.iniciarSesion(credenciales)
      : peticion("/api/auth/login", {
          metodo: "POST",
          cuerpo: {
            usuario: credenciales.usuario,
            password: credenciales.password,
          },
        });
  },

  listarEmpleados() {
    return esModoDemo
      ? demo.listarEmpleados()
      : peticion("/api/empleados");
  },

  async listarUsuarios() {
    if (esModoDemo) return demo.listarUsuarios();
    const resultado = await peticion("/api/usuarios");
    if (Array.isArray(resultado)) return resultado;
    return resultado?.datos ?? resultado?.data ?? [];
  },

  crearUsuario(datos) {
    return esModoDemo
      ? demo.crearUsuario(datos)
      : peticion("/api/usuarios", { metodo: "POST", cuerpo: datos });
  },

  actualizarUsuario(id, datos) {
    return esModoDemo
      ? demo.actualizarUsuario(id, datos)
      : peticion(`/api/usuarios/${encodeURIComponent(id)}`, {
          metodo: "PUT",
          cuerpo: datos,
        });
  },

  actualizarEstadoUsuario(id, estado) {
    return esModoDemo
      ? demo.actualizarEstadoUsuario(id, estado)
      : peticion(`/api/usuarios/${encodeURIComponent(id)}/estado`, {
          metodo: "PATCH",
          cuerpo: { estado },
        });
  },

  eliminarUsuario(id) {
    return esModoDemo
      ? demo.eliminarUsuario(id)
      : peticion(`/api/usuarios/${encodeURIComponent(id)}`, {
          metodo: "DELETE",
        });
  },

  async listarVisitas(filtros = {}) {
    if (esModoDemo) return demo.listarVisitas(filtros);
    const resultado = await peticion("/api/visitas", {
      params: {
        busqueda: filtros.busqueda,
        estado: filtros.estado,
        fecha: filtros.fecha,
        desde: filtros.desde,
        hasta: filtros.hasta,
        limit: filtros.limite,
        pagina: filtros.pagina,
        porPagina: filtros.porPagina,
        orden: filtros.orden,
      },
    });
    return normalizarLista(resultado);
  },

  obtenerVisita(id) {
    return esModoDemo
      ? demo.obtenerVisita(id)
      : peticion(`/api/visitas/${encodeURIComponent(id)}`);
  },

  buscarVisitaAbierta(documento) {
    return esModoDemo
      ? demo.buscarVisitaAbierta(documento)
      : peticion("/api/visitas/abierta", { params: { documento } });
  },

  buscarUltimaVisita(documento) {
    return esModoDemo
      ? demo.buscarUltimaVisita(documento)
      : peticion("/api/visitas/ultima", { params: { documento } });
  },

  crearVisita(datos) {
    return esModoDemo
      ? demo.crearVisita(datos)
      : peticion("/api/visitas", { metodo: "POST", cuerpo: datos });
  },

  registrarSalida(id) {
    return esModoDemo
      ? demo.registrarSalida(id)
      : peticion(`/api/visitas/${encodeURIComponent(id)}/salida`, {
          metodo: "PATCH",
        });
  },

  actualizarVisita(id, datos) {
    return esModoDemo
      ? demo.actualizarVisita(id, datos)
      : peticion(`/api/visitas/${encodeURIComponent(id)}`, {
          metodo: "PUT",
          cuerpo: datos,
        });
  },

  eliminarVisita(id) {
    return esModoDemo
      ? demo.eliminarVisita(id)
      : peticion(`/api/visitas/${encodeURIComponent(id)}`, {
          metodo: "DELETE",
        });
  },

  obtenerResumen(rango) {
    return esModoDemo
      ? demo.obtenerResumen(rango)
      : peticion("/api/reportes/resumen", {
          params: { desde: rango.desde, hasta: rango.hasta },
        });
  },
};
