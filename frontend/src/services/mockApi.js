import { horaActual, hoyISO, sumarDias } from "../utils/fecha";

const CLAVE = "gyj_visitas_demo_v1";
const CLAVE_USUARIOS = "gyj_usuarios_demo_v1";
const LATENCIA = 320;

export class ErrorApi extends Error {
  constructor(mensaje, codigo = 400) {
    super(mensaje);
    this.name = "ErrorApi";
    this.codigo = codigo;
  }
}

const esperar = (ms = LATENCIA) =>
  new Promise((resolver) => {
    window.setTimeout(resolver, ms);
  });

const USUARIOS_SEMILLA = [
  {
    id: "u-admin",
    usuario: "admin",
    clave: "admin123",
    nombre: "Andrea Gil",
    cargo: "Administradora",
    rol: "admin",
    empresa: "GYJ Ferreterías",
    estado: "activo",
    creadoEn: "2025-01-15T08:00:00-05:00",
  },
  {
    id: "u-recepcion",
    usuario: "recepcion",
    clave: "recepcion123",
    nombre: "Laura Méndez",
    cargo: "Recepcionista",
    rol: "recepcionista",
    empresa: "GYJ Ferreterías",
    estado: "activo",
    creadoEn: "2025-02-03T08:00:00-05:00",
  },
  {
    id: "u-almasa",
    usuario: "recepcion.almasa",
    clave: "almasa123",
    nombre: "Sofía Ramírez",
    cargo: "Recepcionista",
    rol: "recepcionista",
    empresa: "Almasa",
    estado: "activo",
    creadoEn: "2025-03-18T08:00:00-05:00",
  },
  {
    id: "u-colmena",
    usuario: "recepcion.colmena",
    clave: "colmena123",
    nombre: "Camilo Duarte",
    cargo: "Recepcionista",
    rol: "recepcionista",
    empresa: "Colmena",
    estado: "activo",
    creadoEn: "2025-04-22T08:00:00-05:00",
  },
];

export const CREDENCIALES_DEMO = [
  { usuario: "admin", clave: "admin123", etiqueta: "Administradora" },
  { usuario: "recepcion", clave: "recepcion123", etiqueta: "Recepcionista" },
];

const PERSONAS = [
  { id: "e-01", nombre: "Carlos Restrepo", cargo: "Gerente Comercial", area: "Comercial" },
  { id: "e-02", nombre: "Mariana Osorio", cargo: "Jefa de Compras", area: "Abastecimiento" },
  { id: "e-03", nombre: "Julián Cárdenas", cargo: "Coordinador de Talento Humano", area: "Talento Humano" },
  { id: "e-04", nombre: "Paula Rincón", cargo: "Directora Financiera", area: "Finanzas" },
  { id: "e-05", nombre: "Andrés Salazar", cargo: "Jefe de Almacén", area: "Logística" },
  { id: "e-06", nombre: "Diana Castaño", cargo: "Líder de Servicio al Cliente", area: "Servicio al Cliente" },
  { id: "e-07", nombre: "Felipe Agudelo", cargo: "Supervisor de Mantenimiento", area: "Mantenimiento" },
  { id: "e-08", nombre: "Sandra Mejía", cargo: "Asistente de Gerencia", area: "Gerencia" },
];

function idUnico() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function horaHace(minutos) {
  const ahora = new Date();
  const minutosDelDia = ahora.getHours() * 60 + ahora.getMinutes();
  const objetivo = Math.max(5, minutosDelDia - minutos);
  const horas = Math.floor(objetivo / 60);
  const mins = objetivo % 60;
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function marcaDeTiempo(fecha, hora) {
  return new Date(`${fecha}T${hora}:00`).toISOString();
}

function construirVisita(base) {
  const persona = PERSONAS.find((item) => item.id === base.personaId);
  return {
    id: base.id ?? idUnico(),
    nombre: base.nombre,
    documento: base.documento,
    empresa: base.empresa ?? "",
    personaId: base.personaId,
    personaVisitar: persona?.nombre ?? "Sin asignar",
    motivo: base.motivo,
    telefono: base.telefono ?? "",
    telefonoEmergencia: base.telefonoEmergencia ?? "",
    eps: base.eps ?? "",
    arl: base.arl ?? "",
    rh: base.rh ?? "",
    foto: base.foto ?? "",
    fecha: base.fecha,
    horaEntrada: base.horaEntrada,
    horaSalida: base.horaSalida ?? null,
    estado: base.horaSalida ? "salio" : "dentro",
    creadoEn: marcaDeTiempo(base.fecha, base.horaEntrada),
    actualizadoEn: marcaDeTiempo(base.fecha, base.horaSalida ?? base.horaEntrada),
    registradoPor: base.registradoPor ?? "Laura Méndez",
  };
}

function semilla() {
  const hoy = hoyISO();
  const ayer = sumarDias(hoy, -1);
  const anteayer = sumarDias(hoy, -2);
  const haceTres = sumarDias(hoy, -3);
  const haceCinco = sumarDias(hoy, -5);
  const haceOcho = sumarDias(hoy, -8);
  const haceDoce = sumarDias(hoy, -12);
  const haceDieciocho = sumarDias(hoy, -18);

  const deHoy = [
    {
      nombre: "Ricardo Peña",
      documento: "1020458796",
      empresa: "Acerías del Norte",
      personaId: "e-02",
      motivo: "Proveedor",
      telefono: "3104567890",
      telefonoEmergencia: "3104567891",
      eps: "Sura",
      arl: "ARL Sura",
      fecha: hoy,
      horaEntrada: horaHace(245),
      horaSalida: horaHace(210),
    },
    {
      nombre: "Camila Torres",
      documento: "1015224788",
      empresa: "Andina Logística",
      personaId: "e-05",
      motivo: "Reunión",
      telefono: "3207845123",
      telefonoEmergencia: "3207845124",
      eps: "Sanitas",
      arl: "Positiva",
      fecha: hoy,
      horaEntrada: horaHace(185),
      horaSalida: horaHace(140),
    },
    {
      nombre: "Jorge Iván Mejía",
      documento: "79456123",
      empresa: "Ferrelectricos S.A.S.",
      personaId: "e-01",
      motivo: "Proveedor",
      telefono: "3158897412",
      telefonoEmergencia: "3158897413",
      eps: "Nueva EPS",
      arl: "Colmena Seguros",
      fecha: hoy,
      horaEntrada: horaHace(125),
      horaSalida: horaHace(96),
    },
    {
      nombre: "Natalia Cifuentes",
      documento: "1032789451",
      empresa: "Constructora Bolívar",
      personaId: "e-04",
      motivo: "Entrevista",
      telefono: "3016547890",
      telefonoEmergencia: "3016547891",
      eps: "Compensar",
      arl: "Seguros Bolívar",
      fecha: hoy,
      horaEntrada: horaHace(68),
      horaSalida: null,
    },
    {
      nombre: "Óscar Rodríguez",
      documento: "80145672",
      empresa: "Servicios Técnicos OR",
      personaId: "e-07",
      motivo: "Mantenimiento",
      telefono: "3124587963",
      telefonoEmergencia: "3124587964",
      eps: "Famisanar",
      arl: "ARL Sura",
      fecha: hoy,
      horaEntrada: horaHace(22),
      horaSalida: null,
    },
  ];

  const anteriores = [
    [ayer, "08:15", "08:52", "Liliana Vargas", "52894512", "Grupo Éxito", "e-03", "Entrevista", "3105874123"],
    [ayer, "09:40", "10:05", "Mauricio Londoño", "71258945", "Siderúrgica Nacional", "e-02", "Reunión", "3187456982"],
    [ayer, "11:20", "12:10", "Paola Arango", "1025897456", "Independiente", "e-06", "Otro", "3024517896"],
    [ayer, "14:05", "14:48", "Diego Fernando Ruiz", "98521456", "Transportes del Sur", "e-05", "Proveedor", "3178524693"],
    [anteayer, "07:55", "08:40", "Claudia Patricia Ríos", "43658971", "Pinturas Andinas", "e-01", "Proveedor", "3104785962"],
    [anteayer, "10:10", "10:55", "Andrés Felipe Mora", "80147569", "Techos y Estructuras", "e-02", "Reunión", "3201478963"],
    [anteayer, "15:30", "16:12", "Sara Lucía Pineda", "1035478962", "Universidad Nacional", "e-03", "Entrevista", "3017458963"],
    [haceTres, "08:35", "09:10", "Hernán Darío Gómez", "71254896", "Mantenimientos HD", "e-07", "Mantenimiento", "3157845962"],
    [haceCinco, "09:20", "10:02", "Ángela María Castro", "52987456", "Distribuciones C & C", "e-02", "Proveedor", "3118547962"],
    [haceOcho, "11:05", "11:45", "Julián Esteban Rojas", "1024785963", "Constructora del Valle", "e-04", "Reunión", "3185479621"],
    [haceDoce, "08:05", "08:35", "Mónica Lucía Herrera", "43698745", "Ferretería Central", "e-06", "Otro", "3004785962"],
    [haceDieciocho, "14:15", "15:00", "Germán Augusto Pérez", "80214759", "Aceros del Pacífico", "e-01", "Reunión", "3124785963"],
  ].map(([fecha, horaEntrada, horaSalida, nombre, documento, empresa, personaId, motivo, telefono]) =>
    construirVisita({
      nombre,
      documento,
      empresa,
      personaId,
      motivo,
      telefono,
      fecha,
      horaEntrada,
      horaSalida,
    }),
  );

  return [...deHoy.map((item) => construirVisita({ ...item, fecha: hoy })), ...anteriores];
}

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const datos = JSON.parse(crudo);
      if (Array.isArray(datos)) return datos;
    }
  } catch {
    // Si el almacenamiento está corrupto se regenera la demo.
  }
  const datos = semilla();
  guardar(datos);
  return datos;
}

function guardar(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    // El modo demo funciona igual en memoria durante la sesión.
  }
}

function buscarPorId(datos, id) {
  const indice = datos.findIndex((item) => item.id === id);
  if (indice === -1) throw new ErrorApi("No encontramos la visita solicitada.", 404);
  return { indice, visita: datos[indice] };
}

function guardarUsuarios(usuarios) {
  try {
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios));
  } catch {
    // El modo demo funciona igual en memoria durante la sesión.
  }
}

function cargarUsuarios() {
  try {
    const crudo = localStorage.getItem(CLAVE_USUARIOS);
    if (crudo) {
      const usuarios = JSON.parse(crudo);
      if (Array.isArray(usuarios) && usuarios.length > 0) return usuarios;
    }
  } catch {
    // Si el almacenamiento está corrupto se regenera la lista base.
  }

  const usuarios = USUARIOS_SEMILLA.map((item) => ({ ...item }));
  guardarUsuarios(usuarios);
  return usuarios;
}

function usuarioPublico(usuario) {
  const publico = { ...usuario };
  delete publico.clave;
  return publico;
}

function ordenarUsuarios(usuarios) {
  return [...usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function tokenDemo(usuario) {
  const payload = {
    sub: usuario.id,
    rol: usuario.rol,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
    iat: Math.floor(Date.now() / 1000),
  };
  return `demo.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.firma`;
}

export async function iniciarSesion({ usuario, password }) {
  await esperar(480);
  const encontrado = cargarUsuarios().find(
    (item) =>
      item.estado === "activo" &&
      item.usuario.toLowerCase() === String(usuario).trim().toLowerCase(),
  );

  if (!encontrado || encontrado.clave !== password) {
    throw new ErrorApi("Credenciales inválidas. Verifica tu usuario y contraseña.", 401);
  }

  return {
    token: tokenDemo(encontrado),
    usuario: usuarioPublico(encontrado),
  };
}

export async function listarUsuarios() {
  await esperar(260);
  return ordenarUsuarios(cargarUsuarios().map(usuarioPublico));
}

export async function crearUsuario(datos) {
  await esperar(480);
  const usuarios = cargarUsuarios();
  const usuario = String(datos.usuario).trim().toLowerCase();

  if (
    usuarios.some(
      (item) => item.usuario.toLowerCase() === usuario,
    )
  ) {
    throw new ErrorApi("Ese nombre de usuario ya está registrado.", 409);
  }

  const esAdmin = datos.rol === "admin";
  const nuevo = {
    id: `u-${idUnico()}`,
    usuario,
    clave: datos.password,
    nombre: String(datos.nombre).trim(),
    cargo: esAdmin ? "Administrador" : "Recepcionista",
    rol: esAdmin ? "admin" : "recepcionista",
    empresa: datos.empresa,
    estado: "activo",
    creadoEn: new Date().toISOString(),
  };

  guardarUsuarios([nuevo, ...usuarios]);
  return usuarioPublico(nuevo);
}

export async function actualizarUsuario(id, datos) {
  await esperar(460);
  const usuarios = cargarUsuarios();
  const indice = usuarios.findIndex((item) => item.id === id);

  if (indice === -1) {
    throw new ErrorApi("No encontramos el usuario solicitado.", 404);
  }

  const usuario = usuarios[indice];
  const usuarioNormalizado = String(datos.usuario).trim().toLowerCase();

  if (
    usuarios.some(
      (item) =>
        item.id !== id &&
        item.usuario.toLowerCase() === usuarioNormalizado,
    )
  ) {
    throw new ErrorApi("Ese nombre de usuario ya está registrado.", 409);
  }

  if (!["admin", "recepcionista"].includes(datos.rol)) {
    throw new ErrorApi("El perfil de acceso no es válido.", 400);
  }

  const esAdmin = datos.rol === "admin";

  if (
    usuario.rol === "admin" &&
    usuario.estado === "activo" &&
    !esAdmin &&
    !usuarios.some(
      (item) =>
        item.id !== id && item.rol === "admin" && item.estado === "activo",
    )
  ) {
    throw new ErrorApi(
      "Debe existir al menos un administrador activo en el sistema.",
      409,
    );
  }

  const actualizado = {
    ...usuario,
    nombre: String(datos.nombre).trim(),
    usuario: usuarioNormalizado,
    empresa: datos.empresa,
    rol: esAdmin ? "admin" : "recepcionista",
    cargo: esAdmin ? "Administrador" : "Recepcionista",
  };

  if (datos.password) actualizado.clave = datos.password;

  usuarios[indice] = actualizado;
  guardarUsuarios(usuarios);
  return usuarioPublico(actualizado);
}

export async function actualizarEstadoUsuario(id, estado) {
  await esperar(380);
  const usuarios = cargarUsuarios();
  const indice = usuarios.findIndex((item) => item.id === id);

  if (indice === -1) {
    throw new ErrorApi("No encontramos el usuario solicitado.", 404);
  }
  if (!["activo", "inactivo"].includes(estado)) {
    throw new ErrorApi("El estado solicitado no es válido.", 400);
  }

  const usuario = usuarios[indice];

  if (
    usuario.rol === "admin" &&
    usuario.estado === "activo" &&
    estado === "inactivo" &&
    !usuarios.some(
      (item) =>
        item.id !== id && item.rol === "admin" && item.estado === "activo",
    )
  ) {
    throw new ErrorApi(
      "Debe existir al menos un administrador activo en el sistema.",
      409,
    );
  }

  const actualizado = { ...usuario, estado };
  usuarios[indice] = actualizado;
  guardarUsuarios(usuarios);
  return usuarioPublico(actualizado);
}

export async function eliminarUsuario(id) {
  await esperar(420);
  const usuarios = cargarUsuarios();
  const indice = usuarios.findIndex((item) => item.id === id);

  if (indice === -1) {
    throw new ErrorApi("No encontramos el usuario solicitado.", 404);
  }

  const usuario = usuarios[indice];

  if (
    usuario.rol === "admin" &&
    usuario.estado === "activo" &&
    !usuarios.some(
      (item) =>
        item.id !== id && item.rol === "admin" && item.estado === "activo",
    )
  ) {
    throw new ErrorApi(
      "No puedes eliminar al último administrador activo del sistema.",
      409,
    );
  }

  usuarios.splice(indice, 1);
  guardarUsuarios(usuarios);
  return { ok: true };
}

export async function listarEmpleados() {
  await esperar(220);
  return PERSONAS.map((persona) => ({ ...persona }));
}

export async function listarVisitas(filtros = {}) {
  await esperar(280);
  const {
    busqueda = "",
    estado = "",
    desde = "",
    hasta = "",
    fecha = "",
    limite = null,
    pagina = 1,
    porPagina = 20,
    orden = "desc",
  } = filtros;

  const termino = String(busqueda).trim().toLowerCase();
  let datos = cargar();

  if (fecha) datos = datos.filter((item) => item.fecha === fecha);
  if (desde) datos = datos.filter((item) => item.fecha >= desde);
  if (hasta) datos = datos.filter((item) => item.fecha <= hasta);
  if (estado) datos = datos.filter((item) => item.estado === estado);
  if (termino) {
    datos = datos.filter((item) =>
      [
        item.nombre,
        item.documento,
        item.empresa,
        item.personaVisitar,
        item.motivo,
        item.eps,
        item.arl,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termino),
    );
  }

  datos.sort((a, b) => {
    const claveA = `${a.fecha}T${a.horaEntrada}`;
    const claveB = `${b.fecha}T${b.horaEntrada}`;
    return orden === "asc" ? claveA.localeCompare(claveB) : claveB.localeCompare(claveA);
  });

  const total = datos.length;
  const tamanoPagina = Math.max(1, Number(porPagina) || 20);

  if (limite) {
    return {
      datos: datos.slice(0, Number(limite)),
      total,
      pagina: 1,
      porPagina: Number(limite),
      totalPaginas: 1,
    };
  }

  const paginaActual = Math.max(1, Number(pagina) || 1);
  const inicio = (paginaActual - 1) * tamanoPagina;

  return {
    datos: datos.slice(inicio, inicio + tamanoPagina),
    total,
    pagina: paginaActual,
    porPagina: tamanoPagina,
    totalPaginas: Math.max(1, Math.ceil(total / tamanoPagina)),
  };
}

export async function obtenerVisita(id) {
  await esperar(220);
  const { visita } = buscarPorId(cargar(), id);
  return { ...visita };
}

export async function buscarVisitaAbierta(documento) {
  await esperar(260);
  const normalizado = String(documento).trim().toLowerCase();
  if (!normalizado) return null;
  const visita = cargar().find(
    (item) =>
      item.fecha === hoyISO() &&
      item.estado === "dentro" &&
      item.documento.toLowerCase() === normalizado,
  );
  return visita ? { ...visita } : null;
}

export async function buscarUltimaVisita(documento) {
  await esperar(320);
  const normalizado = String(documento).trim().toLowerCase();
  if (!normalizado) return null;

  const visitas = cargar()
    .filter((item) => item.documento.toLowerCase() === normalizado)
    .sort((a, b) =>
      `${b.fecha}T${b.horaEntrada}`.localeCompare(
        `${a.fecha}T${a.horaEntrada}`,
      ),
    );

  return visitas[0] ? { ...visitas[0] } : null;
}

export async function crearVisita(datos) {
  await esperar(520);
  const visitas = cargar();
  const documento = String(datos.documento).trim();

  const duplicada = visitas.find(
    (item) =>
      item.fecha === hoyISO() &&
      item.estado === "dentro" &&
      item.documento.toLowerCase() === documento.toLowerCase(),
  );

  if (duplicada) {
    throw new ErrorApi(
      "Ya existe una visita activa con este documento. Registra primero la salida.",
      409,
    );
  }

  const nueva = construirVisita({
    nombre: datos.nombre,
    documento,
    empresa: datos.empresa,
    personaId: datos.personaId,
    motivo: datos.motivo,
    telefono: datos.telefono,
    telefonoEmergencia: datos.telefonoEmergencia,
    eps: datos.eps,
    arl: datos.arl,
    rh: datos.rh,
    foto: datos.foto,
    fecha: hoyISO(),
    horaEntrada: horaActual(),
    registradoPor: datos.registradoPor,
  });

  guardar([nueva, ...visitas]);
  return { ...nueva };
}

export async function registrarSalida(id) {
  await esperar(420);
  const visitas = cargar();
  const { indice, visita } = buscarPorId(visitas, id);
  if (visita.horaSalida) {
    throw new ErrorApi("Esta visita ya tiene una salida registrada.", 409);
  }

  const actualizada = {
    ...visita,
    horaSalida: horaActual(),
    estado: "salio",
    actualizadoEn: new Date().toISOString(),
  };

  visitas[indice] = actualizada;
  guardar(visitas);
  return { ...actualizada };
}

export async function actualizarVisita(id, cambios) {
  await esperar(460);
  const visitas = cargar();
  const { indice, visita } = buscarPorId(visitas, id);
  const persona = PERSONAS.find((item) => item.id === cambios.personaId);

  const actualizada = {
    ...visita,
    nombre: cambios.nombre ?? visita.nombre,
    documento: cambios.documento ?? visita.documento,
    empresa: cambios.empresa ?? visita.empresa,
    personaId: cambios.personaId ?? visita.personaId,
    personaVisitar: persona?.nombre ?? visita.personaVisitar,
    motivo: cambios.motivo ?? visita.motivo,
    telefono: cambios.telefono ?? visita.telefono,
    telefonoEmergencia:
      cambios.telefonoEmergencia ?? visita.telefonoEmergencia,
    eps: cambios.eps ?? visita.eps,
    arl: cambios.arl ?? visita.arl,
    rh: cambios.rh ?? visita.rh,
    foto: cambios.foto ?? visita.foto,
    actualizadoEn: new Date().toISOString(),
  };

  visitas[indice] = actualizada;
  guardar(visitas);
  return { ...actualizada };
}

export async function eliminarVisita(id) {
  await esperar(380);
  const visitas = cargar();
  const { indice } = buscarPorId(visitas, id);
  visitas.splice(indice, 1);
  guardar(visitas);
  return { ok: true };
}

export async function obtenerResumen({ desde, hasta } = {}) {
  await esperar(360);
  const inicio = desde || sumarDias(hoyISO(), -30);
  const fin = hasta || hoyISO();
  const visitas = cargar().filter((item) => item.fecha >= inicio && item.fecha <= fin);

  const total = visitas.length;
  const dias = Math.max(
    1,
    Math.round(
      (new Date(`${fin}T00:00:00`) - new Date(`${inicio}T00:00:00`)) / 86400000,
    ) + 1,
  );

  const conteoMotivos = new Map();
  const conteoDias = new Map();
  let dentro = 0;

  visitas.forEach((visita) => {
    conteoMotivos.set(visita.motivo, (conteoMotivos.get(visita.motivo) ?? 0) + 1);
    conteoDias.set(visita.fecha, (conteoDias.get(visita.fecha) ?? 0) + 1);
    if (visita.estado === "dentro") dentro += 1;
  });

  const porMotivo = [...conteoMotivos.entries()]
    .map(([motivo, cantidad]) => ({ motivo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const porDia = [...conteoDias.entries()]
    .map(([fecha, cantidad]) => ({ fecha, cantidad }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    desde: inicio,
    hasta: fin,
    total,
    dentro,
    dias,
    promedioDiario: total / dias,
    motivoFrecuente: porMotivo[0]?.motivo ?? "Sin registros",
    porMotivo,
    porDia,
  };
}
