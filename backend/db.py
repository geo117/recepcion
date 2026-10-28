"""Acceso a SQL Server con pyodbc.

Reglas de seguridad aplicadas:
  * Todas las consultas usan parámetros (?) — nunca se concatena entrada
    del usuario en el SQL, lo que evita inyección SQL.
  * La conexión se abre una vez por petición y se cierra al final.
  * Los errores de SQL Server se registran en el servidor y al cliente solo
    se le devuelve un mensaje genérico.
"""

from contextlib import contextmanager

import pyodbc
from flask import g

from config import Config


def _valor_odbc(valor: str) -> str:
    """Escapa un valor de cadena de conexión ODBC si contiene separadores."""
    if any(caracter in valor for caracter in ";{}"):
        return "{" + valor.replace("}", "}}") + "}"
    return valor


def cadena_conexion() -> str:
    """Construye la cadena ODBC a partir de .env (sin secretos en código)."""
    partes = [
        f"DRIVER={{{Config.DB_DRIVER}}}",
        f"SERVER={_valor_odbc(Config.DB_SERVIDOR)}",
        f"DATABASE={_valor_odbc(Config.DB_BASE)}",
        "APP=GYJ Recepcion API",
    ]

    if Config.DB_USUARIO:
        partes.append(f"UID={_valor_odbc(Config.DB_USUARIO)}")
        partes.append(f"PWD={_valor_odbc(Config.DB_PASSWORD)}")
    else:
        partes.append("Trusted_Connection=yes")

    partes.extend(
        [
            f"Encrypt={Config.DB_ENCRYPT}",
            f"TrustServerCertificate={Config.DB_TRUST_CERT}",
            f"Connection Timeout={Config.DB_TIEMPO_ESPERA}",
        ]
    )
    return ";".join(partes) + ";"


def obtener_conexion() -> pyodbc.Connection:
    """Devuelve la conexión de la petición actual."""
    conexion = g.get("conexion")
    if conexion is None:
        conexion = pyodbc.connect(
            cadena_conexion(),
            autocommit=False,
            timeout=Config.DB_TIEMPO_ESPERA,
        )
        g.conexion = conexion
    return conexion


def cerrar_conexion(_error=None) -> None:
    """Cierra la conexión al terminar la petición (registrado en app.py)."""
    conexion = g.pop("conexion", None)
    if conexion is not None:
        try:
            conexion.close()
        except pyodbc.Error:
            pass


@contextmanager
def cursor():
    """Cursor de solo lectura; se cierra siempre."""
    actual = obtener_conexion().cursor()
    try:
        yield actual
    finally:
        actual.close()


@contextmanager
def transaccion():
    """Cursor transaccional con commit/rollback automático."""
    conexion = obtener_conexion()
    actual = conexion.cursor()
    try:
        yield actual
        conexion.commit()
    except Exception:
        conexion.rollback()
        raise
    finally:
        actual.close()


def fila_a_dict(actual: pyodbc.Cursor, fila: pyodbc.Row) -> dict:
    """Convierte una fila en diccionario usando los nombres de columna."""
    columnas = [columna[0] for columna in actual.description]
    return dict(zip(columnas, fila))


def consultar_uno(sql: str, parametros: tuple = ()) -> dict | None:
    with cursor() as actual:
        actual.execute(sql, parametros)
        fila = actual.fetchone()
        return fila_a_dict(actual, fila) if fila else None


def consultar_todos(sql: str, parametros: tuple = ()) -> list[dict]:
    with cursor() as actual:
        actual.execute(sql, parametros)
        return [fila_a_dict(actual, fila) for fila in actual.fetchall()]
