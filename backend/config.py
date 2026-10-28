"""Configuración del backend leída desde variables de entorno (.env).

Ningún secreto se escribe en el código: la clave JWT y las credenciales de
SQL Server viven en backend/.env, que está fuera del control de versiones.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

# override=False: las variables reales del proceso (producción, pruebas)
# siempre tienen prioridad sobre el archivo .env.
load_dotenv(BASE_DIR / ".env", override=False)


def _texto(nombre: str, defecto: str = "") -> str:
    return str(os.getenv(nombre, defecto)).strip()


def _entero(nombre: str, defecto: int) -> int:
    try:
        return int(_texto(nombre, str(defecto)))
    except ValueError:
        return defecto


def _booleano(nombre: str, defecto: bool = False) -> bool:
    valor = _texto(nombre, "true" if defecto else "false").lower()
    return valor in {"1", "true", "yes", "si", "sí", "on"}


class Config:
    """Parámetros de ejecución del servicio."""

    ENTORNO = _texto("FLASK_ENV", "development")
    DEBUG = _booleano("FLASK_DEBUG", False)

    HOST = _texto("HOST", "127.0.0.1")
    PUERTO = _entero("PUERTO", 5000)

    # Seguridad de la sesión
    SECRET_KEY = _texto("SECRET_KEY")
    JWT_EXPIRACION_HORAS = _entero("JWT_EXPIRACION_HORAS", 8)
    LOGIN_INTENTOS_MAXIMOS = _entero("LOGIN_INTENTOS_MAXIMOS", 5)
    LOGIN_VENTANA_SEGUNDOS = _entero("LOGIN_VENTANA_SEGUNDOS", 300)

    # Conexión a SQL Server
    DB_DRIVER = _texto("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    DB_SERVIDOR = _texto("DB_SERVIDOR", r"localhost\SQLEXPRESS")
    DB_BASE = _texto("DB_BASE", "recepcion_bd")
    DB_USUARIO = _texto("DB_USUARIO")
    DB_PASSWORD = _texto("DB_PASSWORD")
    DB_ENCRYPT = _texto("DB_ENCRYPT", "yes")
    DB_TRUST_CERT = _texto("DB_TRUST_CERT", "yes")
    DB_TIEMPO_ESPERA = _entero("DB_TIEMPO_ESPERA", 5)

    # CORS: solo los orígenes del frontend autorizados
    CORS_ORIGINS = [
        origen.strip()
        for origen in _texto(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origen.strip()
    ]

    # Límites de tamaño (bytes)
    MAX_CONTENT_LENGTH = _entero("MAX_CONTENT_LENGTH_MB", 6) * 1024 * 1024
    FOTO_MAX_BYTES = _entero("FOTO_MAX_MB", 2) * 1024 * 1024

    # Reportes
    RANGO_REPORTE_MAX_DIAS = _entero("RANGO_REPORTE_MAX_DIAS", 366)

    @classmethod
    def validar(cls) -> None:
        """Falla rápido si falta una configuración crítica."""
        if len(cls.SECRET_KEY) < 32:
            raise RuntimeError(
                "SECRET_KEY ausente o demasiado corta (mínimo 32 caracteres). "
                "Genera una con: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if not cls.DB_SERVIDOR or not cls.DB_BASE:
            raise RuntimeError("Configura DB_SERVIDOR y DB_BASE en backend/.env")
