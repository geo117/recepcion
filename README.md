# Acceza360 · Sistema de Recepción de Visitantes

Aplicación interna de **GYJ Ferreterías S.A.** para controlar el ingreso y la
salida de visitantes a la oficina. Reemplaza el registro manual en papel por un
flujo digital de menos de 30 segundos: se escanea o escribe la cédula, se
completan los datos, se toma la foto, se registra la entrada y se imprime una
etiqueta térmica para el visitante.

El sistema cubre las tres empresas del grupo:

| Código `company_reg` | Empresa |
| --- | --- |
| `2` | GYJ Ferreterías |
| `3` | Almasa |
| `4` | Colmena |

> Uso interno. El acceso está restringido a personal autorizado de recepción y
> administración.

---

## 1. ¿Para qué fue diseñado?

La recepción de GYJ necesitaba resolver tres problemas concretos:

1. **Velocidad en horas pico.** La recepcionista debe registrar a una persona
   sin hacerla esperar. Por eso el formulario es un modal de una sola pantalla,
   el documento funciona como llave para recuperar visitas anteriores y el
   lector USB de cédula llena nombre, documento y RH automáticamente.
2. **Trazabilidad y seguridad.** Saber quién está dentro de la oficina en todo
   momento, a qué área va, quién lo autoriza, cuándo salió y con qué foto.
   Cada registro guarda fecha, hora de entrada, hora de salida, estado y el
   usuario que lo registró.
3. **Control multiempresa.** Las recepcionistas de Almasa y Colmena no deben ver
   el historial de GYJ, y viceversa. El backend filtra por la empresa del usuario
   autenticado; solo el administrador ve todo el consolidado y los reportes.

Objetivos de diseño que guiaron la implementación:

- Registro completo en **menos de 30 segundos**.
- Identidad visual corporativa (blanco, amarillo, gris cálido y negro tintado).
- Funcionamiento en **intranet**, sin dependencias de internet.
- Impresión de la etiqueta del visitante en la **impresora térmica de rollo**
  de recepción (100 × 30 mm).
- Operación con roles: recepcionista y administrador.

---

## 2. Funcionalidades principales

### Operación diaria

- **Login corporativo** con usuario y contraseña; sesión JWT de 8 horas.
- **Registro de entrada** con nombre, documento, EPS, empresa/procedencia,
  persona a visitar, área/motivo, ARL, RH, teléfonos y foto.
- **Lectura de cédula** con lector USB tipo teclado (PDF417): detecta el
  escaneo por velocidad de tecleo, extrae documento, nombre y grupo sanguíneo y
  evita que el código contamine los campos del formulario.
- **Recuperación de datos**: al salir del campo documento se busca la última
  visita de esa persona y se precargan sus datos (incluido RH) para una nueva
  entrada con fecha y hora actuales.
- **Foto del visitante** desde la cámara del equipo o subiendo una imagen.
  Se redimensiona a 480 px de lado máximo y se guarda en Base64.
- **Persona a visitar sin lista desplegable en el alta**: se escribe el nombre
  del colaborador y el sistema lo resuelve contra el catálogo, ignorando
  mayúsculas, tildes y espacios repetidos. La vista de detalle conserva la lista
  de sugerencias para editar registros existentes.
- **Registro de salida** con la hora actual, desde la tabla, el detalle o el
  formulario de alta si la persona aún está dentro.
- **Bloqueo de duplicados**: no se puede registrar dos veces a la misma persona
  como "dentro" en el mismo día; el API responde `409` y el frontend lo explica.
- **Impresión de etiqueta térmica** de 100 × 30 mm desde la vista previa.

### Consulta e historial

- Tabla paginada de visitantes con búsqueda por nombre, documento, empresa,
  persona a visitar, motivo, EPS o ARL.
- Filtros por estado (`dentro` / `salio`) y rango de fechas.
- Exportación a **CSV** de hasta 1000 registros con los filtros activos.
- Detalle del visitante con edición de datos, cambio de foto, registro de salida
  y eliminación (solo administrador).
- Etiqueta imprimible desde el menú de acciones de cada fila.

### Administración y reportes

- **Administración de usuarios** (solo admin): crear cuentas, editar nombre,
  usuario, empresa, rol y contraseña, activar/desactivar y eliminar.
  El sistema impide desactivar o eliminar la propia cuenta y dejar la plataforma
  sin administradores activos.
- **Reportes** (solo admin): total de visitantes, personas que siguen dentro,
  promedio diario, motivo más frecuente, distribución por motivo y actividad por
  día. Exportación CSV e impresión/PDF nativo del navegador.
- **Modo demostración** opcional con datos de ejemplo en `localStorage`, pensado
  para capacitación y pruebas sin backend.

---

## 3. Arquitectura

```text
┌──────────────────────────────┐
│ Navegador (SPA React + Vite) │
│  sessionStorage: JWT + user  │
└──────────────┬───────────────┘
               │ fetch /api/...  (Authorization: Bearer <JWT>)
               ▼
┌──────────────────────────────┐
│ Flask 3 + Waitress           │
│ 127.0.0.1:5000  (intranet)   │
│ CORS · JWT · validaciones    │
└──────────────┬───────────────┘
               │ pyodbc · consultas parametrizadas
               ▼
┌──────────────────────────────┐
│ SQL Server · recepcion_bd    │
│ dbo.usuarios                 │
│ dbo.visitantes               │
└──────────────────────────────┘
```

Decisiones clave:

- **Mismo origen en producción.** El build de React y el API se publican juntos:
  IIS (con URL Rewrite + ARR) reenvía `/api/*` a Flask. Así no hay CORS ni URLs
  absolutas en el navegador.
- **Proxy en desarrollo.** Vite reenvía `/api/*` a `API_PROXY_TARGET`
  (`http://localhost:5000` por defecto).
- **Sesión en `sessionStorage`**, no en `localStorage`, para que el token no
  sobreviva al cierre de la pestaña.
- **Autorización en el servidor.** El frontend oculta opciones, pero el API
  revalida el token, el rol y la empresa en cada petición.
- **Contraseñas con hash** PBKDF2-SHA256 (600 000 iteraciones); nunca se
  devuelven al cliente.
- **Auditoría mínima**: `company_reg` y `registrado_por` se toman del usuario
  autenticado, no del cuerpo de la petición.

---

## 4. Flujo de una visita

```text
Recepción
   │
   ├─ 1. Inicia sesión (/login)
   │      └─ JWT + usuario en sessionStorage
   │
   ├─ 2. «Agregar visita» (/recepcion)
   │      ├─ Escanea la cédula  ──►  documento + nombre + RH
   │      └─ Escribe el documento ──►  busca la última visita y precarga datos
   │
   ├─ 3. Completa persona a visitar, área, empresa, teléfonos y foto
   │
   ├─ 4. «Registrar entrada»
   │      ├─ El servidor valida, asigna fecha/hora y empresa
   │      ├─ Rechaza (409) si ya hay una visita activa con ese documento hoy
   │      └─ Devuelve la visita creada
   │
   ├─ 5. Imprime la etiqueta (100 × 30 mm) desde el menú de la fila
   │
   └─ 6. «Registrar salida» cuando la persona abandona la oficina
          └─ Guarda hora_salida y estado = salio
```

Casos particulares:

- **La persona ya está dentro hoy**: el formulario muestra un aviso y ofrece el
  botón para registrar su salida.
- **Datos recuperados de una visita anterior**: se muestra un aviso indicando la
  fecha anterior; al guardar se crea un registro nuevo con la fecha actual, no se
  modifica el histórico.
- **Cédula no reconocida o código ajeno**: el escáner no altera los datos que la
  recepcionista ya haya escrito.

---

## 5. Módulos y rutas

| Ruta | Módulo | Acceso | Descripción |
| --- | --- | --- | --- |
| `/login` | Login | Público | Autenticación de recepción |
| `/recepcion` | Recepción | Autenticado | Listado, filtros, exportación y alta de visitas |
| `/recepcion/visitantes/:id` | Detalle | Autenticado | Consulta, edición, salida y eliminación |
| `/recepcion/reportes` | Reportes | Solo admin | Métricas, CSV e impresión/PDF |
| `/administracion` | Administración | Solo admin | Gestión de usuarios y accesos |

Todas las rutas salvo `/login` están protegidas: sin sesión válida se redirige al
login conservando el destino solicitado.

La navegación lateral muestra únicamente los módulos permitidos para el rol y
en pantallas angostas se convierte en un menú desplegable.

---

## 6. Impresión de la etiqueta térmica

La etiqueta se diseñó para el rollo de la impresora **Vretti** de recepción,
formato comercial de 4 pulgadas:

| Parámetro | Valor |
| --- | --- |
| Ancho | 100 mm |
| Alto | 30 mm |
| Separación entre etiquetas (gap) | 3 mm |
| Margen interno del diseño | 2 mm vertical / 3 mm horizontal |
| Foto | 18 × 24 mm |

Contenido: marca y logo, nombre del visitante, documento, área que visita,
procedencia, fecha y hora, RH, teléfono de emergencia y foto.

### Cómo se implementa

1. **Vista previa a tamaño real** en el modal «Vista previa de la etiqueta», con
   las mismas medidas físicas que el sticker.
2. Una **copia aislada** de la etiqueta se monta en un portal oculto
   (`.etiqueta-impresion`) para que la impresora reciba solo el sticker.
3. Mientras ese modal está abierto se inyecta `@page { size: 100mm 30mm;
   margin: 0 }` y se agrega la clase `gyj-etiqueta-print` al `body`. Al cerrar se
   eliminan, de modo que la impresión de reportes en A4 conserva su formato.
4. En `@media print` se oculta todo el shell (sidebar, modal, toasts) y se deja
   únicamente la copia de impresión.

Código relacionado:

- `frontend/src/components/visitantes/ModalImprimirEtiqueta.jsx`
- `frontend/src/styles/global.css` (sección «Impresión de la etiqueta térmica»)

### Configuración al imprimir

En el diálogo del navegador (Chrome/Edge):

1. Impresora: la térmica de recepción.
2. Papel: **100 × 30 mm** (o el perfil del rollo con gap de 3 mm definido en el
   driver de la impresora).
3. Márgenes: **ninguno**.
4. Escala: **100 %** (no «ajustar a la página»).
5. Desactivar encabezados y pies de página.

---

## 7. Stack tecnológico

### Frontend

| Tecnología | Versión | Uso |
| --- | --- | --- |
| React | 19 | Interfaz |
| Vite | 8 | Build y servidor de desarrollo |
| React Router DOM | 7 | Rutas y protección de sesión |
| React-Bootstrap | 2 | Componentes sobre Bootstrap 5 |
| Bootstrap | 5.3 | Grid, modales, tablas y formularios |
| React Icons | 5 (Feather) | Iconografía |
| SweetAlert2 | 11 | Confirmaciones y avisos |
| Sora / Source Sans 3 | Google Fonts | Tipografía corporativa |

### Backend

| Tecnología | Versión | Uso |
| --- | --- | --- |
| Python | 3.11+ | Runtime |
| Flask | 3.1 | API REST |
| Waitress | 3.0 | Servidor WSGI de producción |
| pyodbc | 5.3 | Conexión a SQL Server |
| PyJWT | 2.10 | Tokens HS256 |
| Flask-CORS | 6.0 | Orígenes permitidos |
| python-dotenv | 1.2 | Configuración desde `.env` |
| SQL Server | — | Base `recepcion_bd` |
| ODBC Driver 18 | — | Controlador de conexión |

---

## 8. Estructura del repositorio

```text
recepcion/
├── README.md                      ← este documento
├── GYJ-RECEPCION-SPEC.md          ← especificación de diseño original
├── instrucciones.txt              ← copia de la especificación
├── recepcionBAK.bacpac            ← respaldo opcional de la base
│
├── backend/                       API REST en Flask
│   ├── app.py                     Punto de entrada, errores y comandos CLI
│   ├── config.py                  Configuración desde .env
│   ├── db.py                      Conexión y helpers SQL parametrizados
│   ├── seguridad.py               JWT, hashes, roles y límite de login
│   ├── validaciones.py            Validaciones del servidor
│   ├── serializadores.py          Filas SQL → JSON camelCase
│   ├── datos.py                   Catálogos (empleados, empresas, EPS, RH)
│   ├── base_datos.txt             Script de creación de la base
│   ├── requirements.txt
│   ├── README.md                  Guía detallada del backend
│   └── rutas/
│       ├── auth.py                Login
│       ├── empleados.py           Catálogo de personas a visitar
│       ├── usuarios.py            CRUD de usuarios (admin)
│       ├── visitas.py             Registro, consulta, salida y edición
│       └── reportes.py            Resumen estadístico (admin)
│
└── frontend/                      SPA en React
    ├── index.html
    ├── package.json
    ├── vite.config.js             Proxy /api en desarrollo
    ├── README.md                  Guía detallada del frontend
    ├── public/web.config          Reglas de IIS para SPA + API
    └── src/
        ├── App.jsx                Rutas
        ├── main.jsx               Bootstrap, tokens y estilos
        ├── components/
        │   ├── layout/            Sidebar, Header, AppShell, ProtectedRoute
        │   ├── ui/                GYJButton, GYJInput, GYJCard, GYJBadge, Logo
        │   ├── usuarios/          ModalEditarUsuario
        │   └── visitantes/        Tabla, filtros, modales de visita y etiqueta
        ├── hooks/                 AuthProvider/useAuth y useInactividad
        ├── pages/                 Login, Dashboard, Detalle, Reportes, Admin
        ├── services/              api, sesion y adaptador de modo demo
        ├── styles/                tokens.css y global.css
        └── utils/                 Fechas, cédula, fotos, CSV, alertas, reglas
```

---

## 9. Puesta en marcha

### Requisitos previos

- Windows con **SQL Server** (Express sirve) y base `recepcion_bd`.
- **Microsoft ODBC Driver 18 for SQL Server**.
- **Python 3.11+**.
- **Node.js 20.19+** (o 22.12+) y npm.

### 9.1 Crear la base de datos

Con SSMS, Azure Data Studio o `sqlcmd`:

```powershell
sqlcmd -S localhost\SQLEXPRESS -E -i backend\base_datos.txt
```

El script crea `recepcion_bd` y las tablas `dbo.usuarios` y `dbo.visitantes`.
Opcionalmente se puede restaurar `recepcionBAK.bacpac` en lugar de ejecutar el
script.

> Las tablas no declaran PRIMARY KEY, FOREIGN KEY, UNIQUE ni CHECK: las reglas
> viven en la aplicación, tal como documenta `base_datos.txt`.

### 9.2 Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `backend/.env`:

- Genera una `SECRET_KEY` nueva:
  `python -c "import secrets; print(secrets.token_hex(32))"`.
- Ajusta `DB_SERVIDOR`, `DB_BASE` y credenciales si aplica.
- Deja `FLASK_ENV=development` mientras trabajas; `production` para el servidor.

Crea el primer administrador (no hay usuarios precargados):

```powershell
flask --app app crear-admin
```

Ejecuta el API:

```powershell
python app.py
```

Comprobación: `GET http://127.0.0.1:5000/api/salud` debe responder
`{"estado": "ok"}`.

### 9.3 Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

La aplicación queda en `http://localhost:5173` y Vite reenvía `/api` al backend.

Si el API está en otro equipo, define la URL completa:

```env
VITE_API_URL=http://10.114.205.21:5000
```

Recuerda agregar ese origen a `CORS_ORIGINS` del backend. `VITE_API_URL` se
incrusta en el build: tras cambiarla hay que reconstruir.

### 9.4 Modo demostración (sin backend)

Solo se activa de forma explícita:

```env
VITE_MODO_DEMO=true
```

o `VITE_API_URL=demo`. Los datos se guardan en `localStorage` del navegador.

| Usuario | Contraseña | Rol | Empresa |
| --- | --- | --- | --- |
| `admin` | `admin123` | Administradora | GYJ Ferreterías |
| `recepcion` | `recepcion123` | Recepcionista | GYJ Ferreterías |

El adaptador demo (`src/services/mockApi.js`) incluye además cuentas de Almasa y
Colmena para probar el alcance por empresa. **Nunca usar el modo demo en
producción.**

---

## 10. Configuración

### Backend (`backend/.env`)

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `FLASK_ENV` | `production` | `development` usa Flask; `production` usa Waitress |
| `RECARGA_AUTOMATICA` | `false` | Recarga al editar (solo development) |
| `HOST` / `PUERTO` | `127.0.0.1` / `5000` | Escucha del API |
| `SECRET_KEY` | — | Firma JWT; mínimo 32 caracteres |
| `JWT_EXPIRACION_HORAS` | `8` | Vigencia del token |
| `DB_DRIVER` | `ODBC Driver 18 for SQL Server` | Controlador ODBC |
| `DB_SERVIDOR` / `DB_BASE` | `localhost\SQLEXPRESS` / `recepcion_bd` | Conexión |
| `DB_USUARIO` / `DB_PASSWORD` | vacíos | Vacíos = autenticación de Windows |
| `DB_ENCRYPT` / `DB_TRUST_CERT` | `yes` / `yes` | Cifrado y certificado |
| `CORS_ORIGINS` | orígenes locales de Vite | Orígenes permitidos |
| `MAX_CONTENT_LENGTH_MB` | `6` | Tamaño máximo de la petición |
| `FOTO_MAX_MB` | `2` | Tamaño máximo de la foto |
| `RANGO_REPORTE_MAX_DIAS` | `366` | Rango máximo de reportes |
| `LOGIN_INTENTOS_MAXIMOS` | `5` | Intentos por IP y por usuario |
| `LOGIN_VENTANA_SEGUNDOS` | `300` | Ventana del límite de intentos |

### Frontend (`frontend/.env`)

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | Vacío = `/api` en el mismo origen. URL completa si el API está aparte |
| `API_PROXY_TARGET` | Destino del proxy de Vite en desarrollo |
| `VITE_MODO_DEMO` | `true` activa el adaptador con datos de ejemplo |

---

## 11. API REST

Base: `/api`. Todas las rutas salvo el login exigen
`Authorization: Bearer <token>`.

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/salud` | Público | Estado del API y de la base |
| `POST` | `/api/auth/login` | Público | Devuelve `token` y `usuario` |
| `GET` | `/api/empleados` | Autenticado | Catálogo de personas a visitar |
| `GET` / `POST` | `/api/usuarios` | Admin | Listar / crear usuarios |
| `PUT` | `/api/usuarios/{id}` | Admin | Editar usuario y contraseña |
| `PATCH` | `/api/usuarios/{id}/estado` | Admin | Activar / desactivar |
| `DELETE` | `/api/usuarios/{id}` | Admin | Eliminar usuario |
| `GET` / `POST` | `/api/visitas` | Autenticado | Listar con filtros / registrar entrada |
| `GET` | `/api/visitas/{id}` | Autenticado | Detalle |
| `GET` | `/api/visitas/abierta?documento=` | Autenticado | Visita activa de hoy |
| `GET` | `/api/visitas/ultima?documento=` | Autenticado | Última visita registrada |
| `PATCH` | `/api/visitas/{id}/salida` | Autenticado | Registrar salida |
| `PUT` | `/api/visitas/{id}` | Autenticado | Editar registro |
| `DELETE` | `/api/visitas/{id}` | Admin | Eliminar registro |
| `GET` | `/api/reportes/resumen?desde=&hasta=` | Admin | Métricas del periodo |

Ejemplo de visita devuelta por el API:

```json
{
  "id": 42,
  "nombre": "Juan Carlos Pérez",
  "documento": "1020304050",
  "empresa": "Sodexo S.A.S.",
  "companyReg": 2,
  "companyNombre": "GYJ Ferreterías",
  "personaId": "e-05",
  "personaVisitar": "Andrés Salazar",
  "motivo": "Mantenimiento",
  "telefono": "3001234567",
  "telefonoEmergencia": "3007654321",
  "eps": "Sura",
  "arl": "ARL Sura",
  "rh": "O+",
  "foto": "data:image/png;base64,...",
  "fecha": "2026-11-12",
  "horaEntrada": "08:15",
  "horaSalida": null,
  "estado": "dentro",
  "registradoPor": "Laura Méndez"
}
```

Errores: el API responde siempre JSON con `mensaje` y, en validaciones, un objeto
`errores` por campo. No expone trazas ni SQL.

---

## 12. Modelo de datos

### `dbo.usuarios`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `INT IDENTITY` | Identificador |
| `nombre` | `NVARCHAR(80)` | Nombre completo |
| `usuario` | `NVARCHAR(20)` | Único a nivel de aplicación |
| `password` | `NVARCHAR(255)` | Hash PBKDF2 |
| `empresa` | `NVARCHAR(60)` | GYJ Ferreterías / Almasa / Colmena |
| `rol` | `NVARCHAR(20)` | `admin` o `recepcionista` |
| `estado` | `NVARCHAR(10)` | `activo` o `inactivo` |
| `creado_en` / `actualizado_en` | `DATETIME2` | Auditoría |

### `dbo.visitantes`

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | `BIGINT IDENTITY` | Identificador |
| `nombre`, `documento`, `empresa` | `NVARCHAR` | Datos del visitante |
| `company_reg` | `INT` | 2/3/4; define el alcance de consulta |
| `persona_id`, `persona_visitar` | `NVARCHAR` | Colaborador visitado |
| `motivo` | `NVARCHAR(120)` | Área o motivo de la visita |
| `telefono`, `telefono_emergencia` | `NVARCHAR(10)` | 10 dígitos |
| `eps`, `arl`, `rh` | `NVARCHAR` | Datos de salud |
| `foto` | `NVARCHAR(MAX)` | Imagen Base64 |
| `fecha`, `hora_entrada`, `hora_salida` | `DATE` / `TIME(0)` | Marcas de tiempo |
| `estado` | `NVARCHAR(10)` | `dentro` o `salio` |
| `registrado_por` | `NVARCHAR(80)` | Usuario del token |
| `creado_en`, `actualizado_en` | `DATETIME2` | Auditoría |

El catálogo de colaboradores (`persona_id` / `persona_visitar`) vive hoy en
`backend/datos.py` con ocho empleados de ejemplo. Cuando Recursos Humanos
entregue la tabla definitiva, se reemplaza esa constante por una consulta SQL sin
cambiar el contrato del frontend.

---

## 13. Seguridad aplicada

- **SQL parametrizado** en todas las consultas; nunca se concatena entrada.
- **Contraseñas con hash** PBKDF2-SHA256 (600 000 iteraciones). Se aceptan hashes
  bcrypt previos y las contraseñas legacy en texto plano se migran al iniciar
  sesión.
- **JWT HS256** con expiración obligatoria; el algoritmo se fija al verificar.
- **Usuario revalidado en cada petición**: una cuenta desactivada pierde acceso
  de inmediato.
- **Autorización por rol** en el servidor (administración y reportes solo para
  `admin`).
- **Alcance por empresa**: recepcionistas solo ven y modifican visitas de su
  `company_reg`; un id de otra empresa responde `404`.
- **Límite de intentos de login** por IP y por usuario (5 en 5 minutos).
- **Validación doble**: el frontend valida por UX y el backend repite todas las
  reglas antes de escribir.
- **Fotos controladas**: JPEG/PNG/WebP en Base64, máximo 2 MB.
- **Cabeceras de seguridad**: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Cache-Control: no-store`, CSP restrictiva y HSTS sobre
  HTTPS.
- **Errores genéricos** para el cliente; las trazas y errores de SQL Server
  quedan en el log del servidor.
- **Sin `dangerouslySetInnerHTML`** en el frontend.
- **Cierre por inactividad** a los 30 minutos en el navegador.
- **Protecciones de cuenta**: no se puede desactivar/eliminar la propia cuenta ni
  dejar el sistema sin administradores activos.

---

## 14. Despliegue en intranet (IIS)

1. Construir el frontend:

   ```powershell
   cd frontend
   npm run build
   ```

2. Copiar el contenido de `dist/` a la carpeta del sitio (por ejemplo
   `C:\inetpub\acceza360`). El archivo `web.config` se genera desde
   `public/web.config` e incluye:
   - `/api/*` → `http://127.0.0.1:5000/api/*`.
   - Rutas del SPA → `/index.html`.

3. Requisitos de IIS: **URL Rewrite** y **ARR** con `Enable proxy` activo, y el
   grupo de aplicaciones en **No Managed Code**.

4. Ejecutar el backend como servicio o proceso permanente con
   `FLASK_ENV=production` (`HOST=127.0.0.1`, `PUERTO=5000`).

5. Verificar:

   - `http://<servidor>/api/salud` → `{"estado":"ok"}`.
   - `http://<servidor>/login` → carga la SPA.

Recomendaciones de producción:

- Servir el sitio por **HTTPS** y no exponer el puerto de Flask.
- Usar un usuario SQL de mínimo privilegio en lugar de `sa`.
- Fijar `DB_TRUST_CERT=no` con un certificado válido.
- Sustituir el limitador de login en memoria por Redis si hay varios procesos.
- Rotar `SECRET_KEY` ante cualquier sospecha (invalida las sesiones activas).

---

## 15. Comandos útiles

### Backend

```powershell
python app.py                          # API (Waitress o Flask según FLASK_ENV)
flask --app app crear-admin            # Primer administrador
flask --app app restablecer-password   # Cambiar contraseña por consola
```

### Frontend

```powershell
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción en dist/
npm run preview  # Previsualizar el build
npm run lint     # ESLint
```

---

## 16. Verificación funcional sugerida

No hay suite de pruebas automatizada en el repositorio; la validación es manual
apoyada en `npm run lint` y `npm run build`.

Checklist mínimo antes de entregar:

- [ ] `GET /api/salud` responde `ok`.
- [ ] Login correcto e incorrecto; bloqueo tras cinco fallos.
- [ ] Alta de visita con cédula escaneada y con documento escrito a mano.
- [ ] Precarga de la última visita al salir del campo documento.
- [ ] Intento de doble entrada el mismo día → mensaje claro, sin registro.
- [ ] Foto desde cámara y desde archivo; se guarda y se muestra.
- [ ] Registro de salida actualiza hora y estado.
- [ ] Etiqueta: vista previa y PDF de 100 × 30 mm con una sola página.
- [ ] Una recepcionista de otra empresa no ve registros ajenos.
- [ ] Un usuario no admin no accede a Reportes ni Administración.
- [ ] Exportación CSV respeta los filtros activos.
- [ ] Cierre de sesión por inactividad y por `401`.
- [ ] Responsive en 375 px y 1440 px.

---

## 17. Limitaciones y mantenimiento

- **Catálogo de empleados estático** en `backend/datos.py`; pendiente la tabla de
  Recursos Humanos.
- **Una visita activa por documento y día**; si una persona entra dos veces el
  mismo día debe registrar la salida antes de volver a entrar.
- **El limitador de login es en memoria**: con varios procesos o servidores hay
  que migrarlo a Redis.
- **La etiqueta depende del driver de la impresora**: el tamaño de papel y el gap
  se configuran en el sistema operativo, no en el navegador.
- **La cámara requiere `localhost` o HTTPS**; en HTTP remoto el navegador puede
  bloquear `getUserMedia` (siempre queda la opción de subir una foto).
- **Sin restricciones en la base**: no hay PK/FK/UNIQUE/CHECK por decisión del
  proyecto; la integridad la garantiza la aplicación.
- `instrucciones.txt` duplica `GYJ-RECEPCION-SPEC.md`; conviene conservar uno
  solo como referencia.

---

## 18. Documentación relacionada

- [backend/README.md](backend/README.md) — instalación, variables, endpoints y
  seguridad del API.
- [frontend/README.md](frontend/README.md) — puesta en marcha, rutas, modo demo y
  despliegue en IIS.
- [GYJ-RECEPCION-SPEC.md](GYJ-RECEPCION-SPEC.md) — especificación original de
  diseño, identidad visual y criterios de experiencia.
- [backend/base_datos.txt](backend/base_datos.txt) — script de creación de la
  base.
- [backend/.env.example](backend/.env.example) y
  [frontend/.env.example](frontend/.env.example) — plantillas de configuración.

---

**Acceza360 · GYJ Ferreterías S.A.** · Sistema interno de recepción de
visitantes · v1.0
