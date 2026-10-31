# Backend — GYJ Recepción de Visitantes

API REST en **Python (Flask)** conectada a **SQL Server** (`recepcion_bd`), que
implementa el contrato que consume el frontend React.

## 1. Requisitos

- Python 3.11 o superior
- Microsoft ODBC Driver 18 for SQL Server
- SQL Server con la base `recepcion_bd` creada (`backend/base_datos.txt`)

## 2. Instalación

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3. Configuración

El archivo `.env` ya viene con los valores locales. Ajusta si es necesario:

| Variable | Descripción |
|---|---|
| `SECRET_KEY` | Clave de firma JWT (mínimo 32 caracteres, secreta) |
| `DB_SERVIDOR` / `DB_BASE` | Instancia y base de datos |
| `DB_USUARIO` / `DB_PASSWORD` | Vacíos = autenticación de Windows |
| `CORS_ORIGINS` | Orígenes permitidos del frontend (Vite usa 5173 o el siguiente puerto libre) |
| `JWT_EXPIRACION_HORAS` | Vigencia del token |

Genera una clave nueva para producción:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

## 4. Crear el primer administrador

No hay usuarios precargados. El comando pide nombre, usuario y contraseña:

```powershell
flask --app app crear-admin
```

También admite variables de entorno para automatizar:

```powershell
$env:ADMIN_NOMBRE="Andrea Gil"; $env:ADMIN_USUARIO="admin"
$env:ADMIN_PASSWORD="Admin1234"; flask --app app crear-admin
```

La contraseña se guarda con **PBKDF2-SHA256 (600 000 iteraciones)**. Si la base
trae contraseñas antiguas en texto plano, se convierten a hash automáticamente
en el primer inicio de sesión exitoso.

Si un usuario ya existe pero su contraseña no es válida (por ejemplo, un hash
truncado), restablécela sin borrar la cuenta:

```powershell
flask --app app restablecer-password
```

También acepta `RESET_USUARIO` y `RESET_PASSWORD` como variables de entorno.

## 5. Ejecutar

```powershell
pip install -r requirements.txt
python app.py
```

Servicio en `http://127.0.0.1:5000`. Verificación: `GET /api/salud`.

El servidor que se levanta depende de `FLASK_ENV`:

| `FLASK_ENV` | Servidor | Uso |
| --- | --- | --- |
| `development` | Flask (`app.run`) | Desarrollo local, con recarga opcional |
| `production` | Waitress | Servidor de recepción |

El **depurador interactivo está desactivado siempre**. No hay ninguna variable
de entorno que lo active: expone ejecución de código desde el navegador e
imprime trazas internas en la consola. Si se necesita recarga al editar código,
usar `RECARGA_AUTOMATICA=true` junto con `FLASK_ENV=development`.

En el servidor de recepción conviene registrar la salida en un archivo en lugar
de dejar la consola abierta:

```powershell
python app.py *>> C:\logs\recepcion-api.log
```

## 6. Conectar el frontend

En `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

Reinicia `npm run dev`. Sin esa variable el frontend sigue en modo demo. Para
volver al modo demo, elimina el archivo `frontend/.env`.

## 7. Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/login` | Público |
| GET | `/api/empleados` | Autenticado |
| GET/POST | `/api/usuarios` | Administrador |
| PUT | `/api/usuarios/{id}` | Administrador |
| PATCH | `/api/usuarios/{id}/estado` | Administrador |
| DELETE | `/api/usuarios/{id}` | Administrador |
| GET/POST | `/api/visitas` | Autenticado |
| GET | `/api/visitas/{id}` | Autenticado |
| GET | `/api/visitas/abierta?documento=` | Autenticado |
| GET | `/api/visitas/ultima?documento=` | Autenticado |
| PATCH | `/api/visitas/{id}/salida` | Autenticado |
| PUT | `/api/visitas/{id}` | Autenticado |
| DELETE | `/api/visitas/{id}` | Administrador |
| GET | `/api/reportes/resumen` | Autenticado |

Al registrar una visita, `company_reg` se toma de la empresa del usuario
autenticado, nunca del cuerpo de la petición: `2 = GYJ Ferreterías`,
`3 = Almasa`, `4 = Colmena`. El frontend recibe `companyReg` y `companyNombre`.

## 8. Seguridad aplicada

- **SQL parametrizado** en todas las consultas (sin concatenar entrada).
- **Contraseñas con hash**; nunca se devuelven ni se registran en logs.
- **JWT HS256** con expiración y algoritmo fijado al verificar.
- **Autorización en servidor**: administración solo para `admin`; el usuario se
  revalida contra la base en cada petición (una cuenta desactivada pierde el
  acceso de inmediato).
- **Alcance de los datos**: una recepcionista solo ve, abre y modifica las
  visitas cuyo `usuario_recepcion` coincide con su usuario. El historial
  completo y los reportes quedan reservados al rol `admin`. El filtro se aplica
  en el `WHERE` del SQL, así que no se puede ampliar desde la URL.
- **Validación del lado servidor** de nombres, usuarios, documentos, teléfonos,
  catálogos, fechas y fotos (tipo y tamaño máximo 2 MB).
- **Límite de intentos de login** por IP y por usuario (5 en 5 minutos).
- **CORS restringido** a los orígenes configurados.
- **Protecciones de cuenta**: no se puede desactivar/eliminar la propia cuenta ni
  dejar el sistema sin administradores activos.
- **Registro de auditoría básico**: `registrado_por` se toma del token, no del
  cuerpo enviado por el navegador.
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Cache-Control: no-store` y CSP restrictiva.
- Límite de tamaño de solicitud (`MAX_CONTENT_LENGTH_MB`).
- Errores internos y de SQL Server se registran en el servidor y se devuelven
  como mensajes genéricos.

> El catálogo de colaboradores vive en `datos.py` porque la base solo tiene las
> tablas `usuarios` y `visitantes`. Cuando exista la tabla de empleados, se
> reemplaza por una consulta SQL sin cambiar el contrato del frontend.

## 9. Producción

- `FLASK_ENV=production` (arranca Waitress y desactiva el servidor de
  desarrollo), `HOST` según el proxy y `DB_TRUST_CERT=no` con certificado
  válido.
- Servir detrás de HTTPS (IIS, Nginx o Waitress) y no exponer el puerto directo.
- Usar un usuario SQL de mínimo privilegio (solo `SELECT/INSERT/UPDATE/DELETE`
  sobre `recepcion_bd`) en lugar de `sa`.
- Sustituir el limitador de login en memoria por Redis si hay más de un proceso.
- Si el servicio queda detrás de IIS/Nginx, configurar `ProxyFix` para que el
  limitador use la IP real del cliente y no la del proxy.
- Rotar `SECRET_KEY` ante cualquier sospecha (invalida las sesiones activas).
