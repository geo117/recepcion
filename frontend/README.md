# GYJ Ferreterías — Recepción de visitantes

Aplicación interna para registrar la entrada y salida de visitantes de la
oficina, consultar el histórico y generar reportes. Implementada con React,
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

### Modo demostración

Sin backend configurado, la app funciona con un adaptador local que guarda los
datos en `localStorage`. Credenciales de ejemplo:

| Usuario | Contraseña | Rol |
| --- | --- | --- |
| `admin` | `admin123` | Administradora |
| `recepcion` | `recepcion123` | Recepcionista |

Solo el rol **admin** puede eliminar registros, acceder a Reportes y gestionar
usuarios desde **Administración**. Los usuarios creados en modo demo se guardan
en el navegador y pueden iniciar sesión de inmediato.

### Conectar el backend

Crea un archivo `.env.local` en la raíz de `frontend/`:

```env
VITE_API_URL=https://tu-api.gyjferreterias.com.co
```

Con esa variable definida, `src/services/api.js` consume los endpoints reales y
deja de usar el adaptador de demostración.

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
| `/recepcion` | Registro rápido del día |
| `/recepcion/visitantes` | Histórico, filtros y exportación |
| `/recepcion/visitantes/:id` | Detalle y edición del registro |
| `/recepcion/reportes` | Reportes y exportación (solo admin) |
| `/administracion` | Usuarios activos y creación de accesos (solo admin) |
| `/ajustes` | Cuenta y seguridad de la sesión |

## Estructura

```text
src/
├── components/
│   ├── layout/       Sidebar, Header, AppShell, ProtectedRoute
│   ├── ui/           GYJButton, GYJCard, GYJBadge, GYJInput
│   └── visitantes/   RegistroRapido, TablaUltimos, TablaVisitantes
├── hooks/            AuthProvider, useAuth, useInactividad
├── pages/            Login, Dashboard, Visitantes, Detalle, Reportes, Administración, Ajustes
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
GET    /api/visitas
GET    /api/visitas/:id
GET    /api/visitas/abierta?documento=
POST   /api/visitas
PATCH  /api/visitas/:id/salida
PUT    /api/visitas/:id
DELETE /api/visitas/:id
GET    /api/reportes/resumen?desde=&hasta=
```
