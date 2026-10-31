# Acceza360 — Recepción de visitantes

Aplicación interna de **Acceza360** para registrar la entrada y salida de
visitantes de la oficina, consultar el histórico y generar reportes. Implementada con React,
Vite, React-Bootstrap y SweetAlert2, siguiendo la identidad visual corporativa
(blanco, amarillo, gris cálido y negro tintado).

## Stack

- React 19 + Vite
- React-Bootstrap 5 / Bootstrap 5
- React Router DOM
- React Icons (Feather)
- SweetAlert2
- Tipografías Sora y Source Sans 3

## Puesta en marcha

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

Al registrar una visita, el documento de identidad funciona como llave: al
salir del campo se busca la última visita de esa persona y, si existe, se
precargan sus datos (incluido el RH) para registrar una nueva entrada con la
fecha y hora actuales.

### Conectar el backend

El backend real es el modo por defecto. Deja `VITE_API_URL` vacío en
`frontend/.env` y la aplicación llamará a `/api/...` en el mismo origen donde
esté publicada:

```env
VITE_API_URL=
API_PROXY_TARGET=http://localhost:5000
```

- **Desarrollo** (`npm run dev`): Vite reenvía `/api/*` a `API_PROXY_TARGET`
  (por defecto `http://localhost:5000`), así que no hay CORS ni URLs absolutas.
- **Intranet / producción**: el sitio se publica junto al API y el servidor web
  (IIS con URL Rewrite + ARR, o Nginx) redirige `/api/*` a Flask en
  `http://127.0.0.1:5000/api/*`. Al ser el mismo origen, el navegador no ejecuta
  CORS.

Si el API vive en otro host o puerto, define la URL completa y agrégala a
`CORS_ORIGINS` del backend:

```env
VITE_API_URL=http://10.114.205.21:5000
```

Recuerda que `VITE_API_URL` se incrusta en el build: tras cambiarla hay que
volver a ejecutar `npm run build`.

### Despliegue en IIS (intranet)

1. `npm run build` y copiar el contenido de `dist/` a la carpeta física del
   sitio (por ejemplo `C:\inetpub\acceza360`).
2. `dist/web.config` se genera automáticamente desde `public/web.config` e
   incluye las dos reglas necesarias:
   - `API Flask`: `/api/*` → `http://127.0.0.1:5000/api/*`.
   - `SPA React`: cualquier ruta del cliente → `/index.html`.
3. En el servidor deben estar instalados **URL Rewrite** y **ARR**, con
   `Enable proxy` activo en *Application Request Routing Cache → Server Proxy
   Settings*. Sin eso, `/api/*` responde 404.
4. Grupo de aplicaciones del sitio: **No Managed Code**.
5. Backend: `HOST=127.0.0.1`, `PUERTO=5000` en `backend/.env`, ejecutándose como
   servicio (`waitress-serve --host 127.0.0.1 --port 5000 app:app`).
6. Verificación: `http://10.114.205.21:8062/api/salud` debe devolver
   `{"estado":"ok"}` y `http://10.114.205.21:8062/login` debe cargar la SPA.

Si el sitio se publica en un subdirectorio, ajusta el destino de la regla
`SPA React` a `/subdirectorio/index.html`; la regla del API no cambia.

### Modo demostración

Solo se activa de forma explícita con `VITE_MODO_DEMO=true` (o
`VITE_API_URL=demo`). Guarda los datos en `localStorage` mediante
`src/services/mockApi.js`. Credenciales de ejemplo:

| Usuario | Contraseña | Rol |
| --- | --- | --- |
| `admin` | `admin123` | Administradora |
| `recepcion` | `recepcion123` | Recepcionista |

Solo el rol **admin** puede eliminar registros, acceder a Reportes y gestionar
usuarios desde **Administración**. Allí puede crear cuentas, editarlas,
cambiarles la contraseña, activarlas, desactivarlas o eliminarlas. Los usuarios
creados en modo demo se guardan en el navegador y pueden iniciar sesión de
inmediato; un usuario desactivado no puede ingresar hasta que vuelva a
activarse.

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción en dist/
npm run preview  # Previsualizar el build
npm run lint     # ESLint
```

## Rutas

| Ruta | Descripción |
| --- | --- |
| `/login` | Autenticación de recepción |
| `/recepcion` | Registro y consulta de visitantes |
| `/recepcion/visitantes/:id` | Detalle y edición del registro |
| `/recepcion/reportes` | Reportes y exportación (solo admin) |
| `/administracion` | Usuarios, estados y creación de accesos (solo admin) |

## Estructura

```text
src/
├── components/
│   ├── layout/       Sidebar, Header, AppShell, ProtectedRoute, AccesoRestringido
│   ├── ui/           GYJButton, GYJCard, GYJBadge, GYJInput
│   └── visitantes/   ListaVisitantes, TablaVisitantes, MenuAcciones y modales de visitas
├── hooks/            AuthProvider, useAuth, useInactividad
├── pages/            Login, Dashboard, DetalleVisitante, Reportes, Administración
├── services/         api, adaptador demo, sesión
├── styles/           tokens.css, global.css
└── utils/            alertas, csv, fechas, usuarios y validaciones
```

## Seguridad

- Token JWT en `sessionStorage` (no `localStorage`), validado por expiración.
- Cierre de sesión automático tras 30 minutos de inactividad.
- Validación y sanitización de entradas en el cliente; el backend debe
  revalidar siempre.
- Sin `dangerouslySetInnerHTML`.
- Errores genéricos para el usuario y redirección automática ante `401`.

## Endpoints esperados

```text
POST   /api/auth/login
GET    /api/empleados
GET    /api/usuarios
POST   /api/usuarios
PUT    /api/usuarios/:id
PATCH  /api/usuarios/:id/estado
DELETE /api/usuarios/:id
GET    /api/visitas
GET    /api/visitas/:id
GET    /api/visitas/abierta?documento=
GET    /api/visitas/ultima?documento=
POST   /api/visitas
PATCH  /api/visitas/:id/salida
PUT    /api/visitas/:id
DELETE /api/visitas/:id
GET    /api/reportes/resumen?desde=&hasta=
```
