# GYJ Ferreterías — Sistema de Recepción de Visitantes



**Documento de Especificaciones y Guía de Implementación Frontend**



**Versión:** 1.0  

**Stack:** React 18 + Vite, React-Bootstrap, Bootstrap 5, React Icons, React Router DOM v6, SweetAlert2  

**Skills aplicadas:** `ui-ux-pro-max` (NextLevelBuilder), `frontend-design` (Anthropic), `impeccable` (pbakaus), `security-audit` (Cloudflare)



---



## 1. Resumen Ejecutivo



Este documento define las instrucciones completas para el desarrollo del módulo de recepción de visitantes de **GYJ Ferreterías S.A.**, una empresa colombiana del sector ferretero y siderúrgico con presencia nacional. El sistema está diseñado para que la recepcionista registre de forma rápida y segura los datos de las personas que llegan a la oficina, con un login protegido y una interfaz alineada con la identidad visual corporativa: **blanco, amarillo, gris y negro**.



El frontend ya fue creado con las librerías indicadas. Este documento actúa como contrato de diseño, seguridad y funcionalidad para la implementación y futuras iteraciones.



---



## 2. Identidad Visual y Design System



### 2.1 Paleta de Colores Corporativa



Siguiendo la restricción de colores de GYJ y las directrices anti-slop de **Impeccable** (evitar negro/gris puro, evitar gradientes púrpura-azul, evitar tipografías sobreusadas como Inter):



| Token | Valor HEX | Uso |

|-------|-----------|-----|

| `--gyj-yellow` | `#F2B705` | Acento primario, CTAs principales, indicadores activos |

| `--gyj-yellow-soft` | `#FEF3C7` | Fondos de badges, hover states sutiles |

| `--gyj-white` | `#FFFFFF` | Superficies de tarjetas, fondo de formularios |

| `--gyj-gray-50` | `#F5F5F3` | Fondo general de la aplicación (no gris frío puro) |

| `--gyj-gray-100` | `#E8E6E1` | Bordes, divisores |

| `--gyj-gray-400` | `#9C9890` | Texto secundario, placeholders |

| `--gyj-black` | `#1A1A1A` | Texto principal, sidebar, header (negro tintado, no `#000`) |

| `--gyj-black-soft` | `#2D2D2A` | Superficies oscuras secundarias |



**Regla de Impeccable aplicada:** No usar `#000000` ni `#808080`. Todos los negros y grises están tintados hacia el cálido para armonizar con el amarillo corporativo.



### 2.2 Tipografía



**Prohibido:** Arial, Inter, system-ui genérico.



**Recomendación:** 

- **Títulos y marca:** `"Sora"` o `"Plus Jakarta Sans"` (geométrica, moderna, empresarial).

- **Cuerpo y datos:** `"Source Sans 3"` o `"IBM Plex Sans"` (alta legibilidad en formularios y tablas).



Ambas disponibles vía Google Fonts. Importar en `index.html` con `display=swap`.



### 2.3 Espaciado y Radios



- Escala de espaciado: múltiplos de 4px (4, 8, 12, 16, 24, 32, 48).

- Radios de borde: `8px` para inputs y botones, `12px` para tarjetas, `16px` para modales.

- Sombras: sutiles, con tinte cálido (`box-shadow: 0 1px 3px rgba(26,26,26,0.06)`).



---



## 3. Módulos del Frontend



### 3.1 Estructura de Rutas (React Router DOM)



```

/login                    → Login de recepcionista

/                         → Redirección a /recepcion

/recepcion                → Dashboard principal (registro rápido)

/recepcion/visitantes/:id → Detalle / edición de un registro

/recepcion/reportes       → Reportes y exportación (solo admin)

```



**Ruta protegida:** Todas excepto `/login` requieren token válido en `sessionStorage`. Redirigir a `/login` si no hay sesión.



### 3.2 Módulo: Login (`/login`)



**Propósito:** Autenticación de la recepcionista. Debe ser rápido (la recepcionista inicia sesión al comenzar su turno).



**Elementos UI:**

- Fondo: `--gyj-gray-50` con un patrón geométrico sutil en `--gyj-yellow-soft` (no gradientes llamativos).

- Tarjeta central blanca con borde `--gyj-gray-100`, radio `16px`.

- Logo GYJ (placeholder textual: **GYJ** en `--gyj-yellow` sobre `--gyj-black`).

- Campos: **Usuario** (icono `FiUser` de react-icons) y **Contraseña** (icono `FiLock`).

- Botón primario: fondo `--gyj-yellow`, texto `--gyj-black`, `fw-semibold`, hover con `--gyj-yellow-soft`.

- Enlace secundario: "¿Olvidaste tu contraseña?" → abre modal con instrucciones de contacto a TI.



**Comportamiento:**

- Validación con React-Bootstrap `Form.Control` y estado local.

- Error de credenciales → `Swal.fire({ icon: 'error', title: 'Credenciales inválidas', text: 'Verifica tu usuario y contraseña.' })`.

- Éxito → guardar token en `sessionStorage` (no `localStorage` por seguridad), redirigir a `/recepcion`.

- **Seguridad (Cloudflare skill):** El token debe ser un JWT de corta duración. El frontend nunca almacena contraseñas. Deshabilitar autocompletado de contraseñas en producción si la política lo requiere.



### 3.3 Módulo: Dashboard de Recepción (`/recepcion`)



**Propósito:** Pantalla principal para que la recepcionista registre un visitante en < 30 segundos.



**Layout:**

- **Sidebar izquierdo** (fondo `--gyj-black`, ancho 240px): navegación con iconos (react-icons: `FiHome`, `FiBarChart2`, `FiShield`) y etiquetas blancas. Elemento activo con borde izquierdo `--gyj-yellow` de 4px.

- **Header superior** (blanco, borde inferior `--gyj-gray-100`): título "Recepción", nombre de la recepcionista, botón "Cerrar sesión" (icono `FiLogOut`).

- **Contenido principal:** listado completo de visitantes con filtros, exportación y acciones por fila.



**Formulario de Registro Rápido (modal "Agregar visita"):**



| Campo | Tipo | Obligatorio | Validación |

|-------|------|-------------|------------|

| Nombre completo | Text | Sí | Mín. 3 caracteres, solo letras y espacios |

| Documento de identidad | Text | Sí | Alfanumérico, 6–12 caracteres |

| EPS | Select | No | Lista precargada de EPS |

| Empresa / Procedencia | Text | No | Máx. 60 caracteres |

| Persona a visitar | Select (buscable) | Sí | Lista precargada de empleados |

| Motivo de visita | Text | Sí | Texto libre, máx. 120 caracteres |

| ARL | Text | No | Máx. 60 caracteres |

| Teléfono de contacto | Tel | No | Formato colombiano (10 dígitos) |

| Teléfono de emergencia | Tel | No | Formato colombiano (10 dígitos) |



**Acciones:**

- **Registrar entrada** (botón primario amarillo): POST a API, luego `Swal.fire({ icon: 'success', title: 'Visitante registrado', timer: 1500, showConfirmButton: false })` y limpiar formulario.

- **Registrar salida** (visible si el visitante ya está dentro): actualiza `hora_salida`.



**Acciones del listado:** búsqueda, filtros por fecha y estado, exportación CSV, paginación y menú de acciones por fila (ver detalle en modal, registrar salida y eliminar). El botón **Agregar visita** abre el formulario en un modal.



### 3.4 Módulo: Detalle de Visitante (`/recepcion/visitantes/:id`)



Vista de solo lectura con opción de edición. Muestra todos los campos del registro más metadatos (fecha de creación, última modificación, usuario que registró).



### 3.5 Módulo: Reportes (`/recepcion/reportes`)



**Propósito:** Generación de reportes para administración.



**Elementos:**

- Selector de rango de fechas.

- Resumen visual: total de visitantes, promedio diario, motivo más frecuente (tarjetas con números grandes en `--gyj-black`, acentos en `--gyj-yellow`).

- Botones: "Exportar CSV", "Exportar PDF" (usando `jspdf` + `jspdf-autotable` si se agrega la dependencia, o impresión nativa del navegador).



---



## 4. Directrices de Diseño (Impeccable + UI/UX Pro Max)



### 4.1 Reglas Anti-Patrón (obligatorias)



1. **No usar cards anidadas.** El dashboard usa una tarjeta principal; la tabla de últimos visitantes va fuera de ella, directamente sobre el fondo gris claro.

2. **No usar bounce/elastic easing.** Transiciones con `ease-out` o `cubic-bezier(0.25, 0.1, 0.25, 1)`.

3. **No texto gris sobre fondo amarillo.** Los textos sobre el botón amarillo son `--gyj-black`. Los textos secundarios sobre blanco usan `--gyj-gray-400` con contraste verificado (≥ 4.5:1).

4. **No iconos emoji como elementos estructurales.** Solo react-icons (Feather Icons: `Fi*`).

5. **No bordes laterales gruesos decorativos** (side-tab borders). El sidebar usa fondo oscuro completo, no un borde de color.



### 4.2 Accesibilidad (UI/UX Pro Max)



- Todos los inputs con `<Form.Label>` asociado.

- Focus visible: `outline: 2px solid var(--gyj-yellow); outline-offset: 2px` en todos los elementos interactivos.

- Touch targets ≥ 44px en botones de acción de tabla.

- Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande.

- `aria-live="polite"` en la región de la tabla de últimos visitantes para anunciar nuevos registros.



### 4.3 Densidad y Ritmo



- Padding interno de tarjetas: `24px` (no `16px`, que se siente apretado).

- Altura de filas de tabla: `52px` para facilitar clic en móvil/tablet.

- Separación entre label e input: `6px`. Entre grupos de formulario: `20px`.



---



## 5. Seguridad (Cloudflare Security Audit Skill)



Aunque el skill de Cloudflare está orientado a auditorías de código multi-fase, sus principios son aplicables al frontend:



### 5.1 Autenticación y Sesión



- **Token en `sessionStorage`**, nunca `localStorage` (mitiga persistencia tras cierre de pestaña).

- Expiración de token: 8 horas (duración de turno). Renovación silenciosa si es posible.

- **Logout automático** tras 30 minutos de inactividad (implementar con `setTimeout` y eventos `mousemove`/`keydown`).

- No incluir datos sensibles en el payload del JWT visible en el cliente.



### 5.2 Validación de Entradas (Client-side como primera línea)



- Sanitizar todos los campos de texto antes de enviar: eliminar etiquetas HTML, limitar longitud.

- Usar `Form.Control` con `pattern` y `maxLength`.

- Validar documento de identidad contra formato colombiano (CC: 6–10 dígitos; CE: alfanumérico).

- **Nunca** confiar solo en validación client-side; el backend debe revalidar. El frontend solo mejora UX.



### 5.3 Protección contra XSS



- React escapa por defecto en JSX. **No usar `dangerouslySetInnerHTML`** en ningún componente de este proyecto.

- Si se muestran nombres de visitantes en tablas, usar `{visitante.nombre}` directamente en JSX.

- Configurar Content-Security-Policy en el servidor de producción (fuera del alcance del frontend, pero documentar).



### 5.4 Gestión de Errores



- No mostrar stack traces ni mensajes de error del servidor al usuario. Usar mensajes genéricos con `Swal.fire`.

- Errores de red: "No se pudo conectar con el servidor. Intenta nuevamente."

- Errores 401: redirigir a `/login` y limpiar `sessionStorage`.



### 5.5 Dependencias



- Auditar con `npm audit` antes de cada release.

- Fijar versiones exactas en `package.json` (sin `^` en producción) para evitar supply-chain attacks vía actualizaciones automáticas.



---



## 6. Estructura de Componentes Recomendada



```

src/

├── components/

│   ├── layout/

│   │   ├── Sidebar.jsx          # Navegación lateral

│   │   ├── Header.jsx           # Barra superior

│   │   └── ProtectedRoute.jsx   # Wrapper de autenticación

│   ├── ui/

│   │   ├── GYJButton.jsx        # Botón con variantes (primary, ghost, danger)

│   │   ├── GYJCard.jsx          # Tarjeta con padding y sombra corporativa

│   │   ├── GYJBadge.jsx         # Badge de estado

│   │   └── GYJInput.jsx         # Input con label e icono opcional

│   └── visitantes/

│       ├── ListaVisitantes.jsx  # Historial, filtros y exportación

│       ├── ModalAgregarVisita.jsx # Formulario de registro en modal

│       ├── ModalDetalleVisitante.jsx # Detalle del visitante en modal

│       └── TablaVisitantes.jsx  # Tabla completa con filtros

├── pages/

│   ├── Login.jsx

│   ├── Dashboard.jsx

│   ├── DetalleVisitante.jsx

│   └── Reportes.jsx

├── hooks/

│   ├── useAuth.js               # Context de autenticación

│   └── useInactividad.js        # Logout por inactividad

├── services/

│   └── api.js                   # Fetch wrapper con manejo de token y errores

├── styles/

│   ├── tokens.css               # Variables CSS corporativas

│   └── global.css               # Reset y estilos base

└── App.jsx                      # Router principal

```



---



## 7. Guía de Implementación Paso a Paso



### Paso 1: Configurar tokens CSS



Crear `src/styles/tokens.css` con las variables definidas en la sección 2.1. Importar en `main.jsx` antes de Bootstrap para sobrescribir variables de Bootstrap (`--bs-primary`, etc.) si es necesario.



### Paso 2: Configurar React Router



En `App.jsx`, definir `<BrowserRouter>` con `<Routes>`. Envolver las rutas protegidas con `<ProtectedRoute>` que verifica `sessionStorage.getItem('gyj_token')`.



### Paso 3: Implementar Login



Componente controlado con estado `{ usuario, password, loading }`. Al submit, llamar a `POST /api/auth/login`. Manejar éxito y error con SweetAlert2. Guardar token y redirigir.



### Paso 4: Implementar Dashboard



Reutilizar `GYJCard` para el contenedor del formulario. Usar `Form` de React-Bootstrap con `Row`/`Col` para layout de dos columnas en desktop (Nombre + Documento en fila, Empresa + Teléfono en fila). El select de "Persona a visitar" debe cargar empleados desde `GET /api/empleados` al montar el componente.



### Paso 5: Implementar Tabla de Visitantes



Usar `Table` de React-Bootstrap con `hover` y `responsive`. Estado local para `filtros`, `pagina`, `datos`. Llamar a `GET /api/visitas` con query params. Renderizar badges de estado con `GYJBadge`.



### Paso 6: Integrar SweetAlert2



Crear un helper `src/utils/alertas.js` con funciones: `alertaExito(titulo, texto)`, `alertaError(titulo, texto)`, `confirmarAccion(titulo, texto)` que retorna Promise<boolean>. Usar consistentemente en todos los módulos.



### Paso 7: Pruebas de Seguridad Básicas



- Verificar que cerrar sesión limpia `sessionStorage` y redirige.

- Verificar que rutas protegidas sin token redirigen a login.

- Verificar que el formulario no envía datos vacíos ni con formato inválido.

- Ejecutar `npm audit` y resolver vulnerabilidades críticas.



---



## 8. Checklist de Pre-Entrega (UI/UX Pro Max + Impeccable)



- [ ] Colores corporativos aplicados correctamente (blanco, amarillo, gris, negro tintado).

- [ ] Tipografía no genérica (Sora / Source Sans 3 o similar).

- [ ] Sin cards anidadas.

- [ ] Sin gradientes púrpura-azul ni sombras oscuras excesivas.

- [ ] Focus visible en todos los elementos interactivos.

- [ ] Touch targets ≥ 44px en acciones de tabla.

- [ ] Contraste verificado (≥ 4.5:1).

- [ ] Formulario de registro completa en < 30 segundos (flujo optimizado).

- [ ] SweetAlert2 usado para feedback de éxito/error.

- [ ] `sessionStorage` para token, no `localStorage`.

- [ ] Logout por inactividad implementado.

- [ ] Sin `dangerouslySetInnerHTML`.

- [ ] `npm audit` sin vulnerabilidades críticas.

- [ ] Probado en viewport 375px (móvil) y 1440px (desktop).



---



## 9. Notas sobre las Skills Utilizadas



| Skill | Aplicación en este documento |

|-------|------------------------------|

| **ui-ux-pro-max** | Reglas de accesibilidad, touch targets, consistencia de iconos, checklist pre-entrega |

| **frontend-design** (Anthropic) | Base conceptual de diseño, aunque Impeccable extiende sus directrices |

| **impeccable** | Anti-patrones (no Inter, no negro puro, no cards anidadas, no bounce easing), paleta tintada, tipografía no genérica |

| **security-audit** (Cloudflare) | Principios de validación de entradas, manejo de errores, sesión segura, auditoría de dependencias |



---



**Fin del documento.** Este archivo `.md` debe colocarse en la raíz del repositorio como `GYJ-RECEPCION-SPEC.md` y usarse como referencia única para el desarrollo y las revisiones de código del frontend.