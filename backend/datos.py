"""Catálogos usados por las validaciones y por el frontend.

EMPLEADOS replica el catálogo de colaboradores que hoy consume
`GET /api/empleados`. Cuando Recursos Humanos entregue la tabla definitiva,
basta con reemplazar esta constante por una consulta SQL.
"""

import unicodedata

EMPLEADOS = [
    {"id": "e-01", "nombre": "Carlos Restrepo", "cargo": "Gerente Comercial", "area": "Comercial"},
    {"id": "e-02", "nombre": "Mariana Osorio", "cargo": "Jefa de Compras", "area": "Abastecimiento"},
    {"id": "e-03", "nombre": "Julián Cárdenas", "cargo": "Coordinador de Talento Humano", "area": "Talento Humano"},
    {"id": "e-04", "nombre": "Paula Rincón", "cargo": "Directora Financiera", "area": "Finanzas"},
    {"id": "e-05", "nombre": "Andrés Salazar", "cargo": "Jefe de Almacén", "area": "Logística"},
    {"id": "e-06", "nombre": "Diana Castaño", "cargo": "Líder de Servicio al Cliente", "area": "Servicio al Cliente"},
    {"id": "e-07", "nombre": "Felipe Agudelo", "cargo": "Supervisor de Mantenimiento", "area": "Mantenimiento"},
    {"id": "e-08", "nombre": "Sandra Mejía", "cargo": "Asistente de Gerencia", "area": "Gerencia"},
]

MAPA_EMPLEADOS = {empleado["id"]: empleado for empleado in EMPLEADOS}

EMPRESAS = ("GYJ Ferreterías", "Almasa", "Colmena")

# Código numérico de la empresa que registra la visita (company_reg).
EMPRESAS_POR_CODIGO = {2: "GYJ Ferreterías", 3: "Almasa", 4: "Colmena"}


def codigo_empresa(nombre) -> int | None:
    """Devuelve 2/3/4 según el nombre de la empresa, ignorando tildes y mayúsculas."""
    texto = unicodedata.normalize("NFKD", str(nombre or ""))
    texto = "".join(caracter for caracter in texto if not unicodedata.combining(caracter))
    texto = " ".join(texto.lower().split())
    return {
        "gyj ferreterias": 2,
        "almasa": 3,
        "colmena": 4,
    }.get(texto)

ROLES = ("recepcionista", "admin")
ESTADOS_USUARIO = ("activo", "inactivo")
ESTADOS_VISITA = ("dentro", "salio")

GRUPOS_SANGUINEOS = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")

EPS = (
    "Sura",
    "Sanitas",
    "Nueva EPS",
    "Compensar",
    "Famisanar",
    "Salud Total",
    "Coosalud",
    "Mutual Ser",
    "S.O.S.",
    "Asmet Salud",
    "Savia Salud",
    "Otra",
)
