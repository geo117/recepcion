"""Autenticación, autorización y protección contra fuerza bruta.

Decisiones de seguridad:
  * Las contraseñas se almacenan con PBKDF2-SHA256 (600 000 iteraciones) de
    Werkzeug. También se aceptan hashes bcrypt existentes.
  * Los tokens son JWT HS256 firmados con SECRET_KEY; el algoritmo se fija al
    verificar para evitar el ataque "alg: none".
  * En cada petición se consulta el usuario en la base: un usuario desactivado
    pierde el acceso de inmediato, aunque su token siga vigente.
  * El login tiene límite de intentos por IP y por usuario.
"""

import hmac
import logging
import threading
import time
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, jsonify, request
from jwt import ExpiredSignatureError, InvalidTokenError
from werkzeug.security import check_password_hash, generate_password_hash

from config import Config
from db import consultar_uno
from serializadores import usuario_publico

registro = logging.getLogger(__name__)

METODO_HASH = "pbkdf2:sha256:600000"
PREFIJOS_HASH = ("pbkdf2:", "scrypt:")

# Hash de relleno: iguala el tiempo de respuesta cuando el usuario no existe
# y evita inferir qué cuentas están registradas por diferencia de latencia.
HASH_RELLENO = generate_password_hash("relleno-de-tiempo-123", method=METODO_HASH)


def hash_password(password: str) -> str:
    return generate_password_hash(password, method=METODO_HASH)


def verificar_password(password: str, almacenado: str) -> bool:
    """Compara la contraseña con el valor guardado en dbo.usuarios.password."""
    if not isinstance(almacenado, str) or not almacenado:
        return False

    if almacenado.startswith(PREFIJOS_HASH):
        try:
            return check_password_hash(almacenado, password)
        except (ValueError, TypeError):
            return False

    # Compatibilidad con hashes bcrypt creados antes de este backend.
    if almacenado.startswith("$2"):
        try:
            import bcrypt
        except ImportError:
            registro.warning(
                "Se encontró un hash bcrypt pero el paquete 'bcrypt' no está instalado."
            )
            return False
        try:
            return bcrypt.checkpw(password.encode("utf-8"), almacenado.encode("utf-8"))
        except ValueError:
            return False

    # Legado: contraseña en texto plano (se migra a hash al iniciar sesión).
    return hmac.compare_digest(password.encode("utf-8"), almacenado.encode("utf-8"))


def necesita_rehash(almacenado: str) -> bool:
    """True solo para contraseñas legacy en texto plano."""
    if not isinstance(almacenado, str):
        return False
    return not (
        almacenado.startswith(PREFIJOS_HASH) or almacenado.startswith("$2")
    )


def crear_token(usuario: dict) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario["id"]),
        "rol": usuario["rol"],
        "nombre": usuario["nombre"],
        "iat": ahora,
        "exp": ahora + timedelta(hours=Config.JWT_EXPIRACION_HORAS),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


def _usuario_desde_token() -> dict | None:
    encabezado = request.headers.get("Authorization", "")
    if not encabezado.startswith("Bearer "):
        return None

    token = encabezado[7:].strip()
    if not token or len(token) > 4096:
        return None

    try:
        payload = jwt.decode(
            token,
            Config.SECRET_KEY,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
        id_usuario = int(payload["sub"])
    except (ExpiredSignatureError, InvalidTokenError, TypeError, ValueError):
        return None

    fila = consultar_uno(
        """
        SELECT id, nombre, usuario, empresa, rol, estado, creado_en, actualizado_en
        FROM dbo.usuarios
        WHERE id = ?
        """,
        (id_usuario,),
    )

    if fila is None or fila.get("estado") != "activo":
        return None

    return usuario_publico(fila)


def _rechazar(mensaje: str = "Tu sesión expiró. Inicia sesión nuevamente."):
    return jsonify({"mensaje": mensaje}), 401


def requiere_auth(funcion):
    @wraps(funcion)
    def envoltura(*args, **kwargs):
        usuario = _usuario_desde_token()
        if usuario is None:
            return _rechazar()
        g.usuario_actual = usuario
        return funcion(*args, **kwargs)

    return envoltura


def requiere_admin(funcion):
    @wraps(funcion)
    def envoltura(*args, **kwargs):
        usuario = _usuario_desde_token()
        if usuario is None:
            return _rechazar()
        if usuario.get("rol") != "admin":
            return jsonify({"mensaje": "No tienes permisos para esta acción."}), 403
        g.usuario_actual = usuario
        return funcion(*args, **kwargs)

    return envoltura


class LimitadorIntentos:
    """Límite de intentos de login en memoria (suficiente para un solo nodo).

    En un despliegue con varios procesos o servidores se debe reemplazar por
    Redis o el limitador del API Gateway.
    """

    MAXIMO_CLAVES = 5000

    def __init__(self, maximo: int, ventana_segundos: int):
        self.maximo = max(1, maximo)
        self.ventana = max(1, ventana_segundos)
        self._registros: dict[str, list[float]] = {}
        self._candado = threading.Lock()

    def _vigentes(self, clave: str, ahora: float) -> list[float]:
        marcas = [marca for marca in self._registros.get(clave, []) if ahora - marca < self.ventana]
        if marcas:
            self._registros[clave] = marcas
        else:
            self._registros.pop(clave, None)
        return marcas

    def permitido(self, clave: str) -> bool:
        with self._candado:
            return len(self._vigentes(clave, time.monotonic())) < self.maximo

    def registrar_fallo(self, clave: str) -> None:
        with self._candado:
            if len(self._registros) >= self.MAXIMO_CLAVES:
                self._registros.clear()
            self._registros.setdefault(clave, []).append(time.monotonic())

    def limpiar(self, clave: str) -> None:
        with self._candado:
            self._registros.pop(clave, None)


limitador_login = LimitadorIntentos(
    Config.LOGIN_INTENTOS_MAXIMOS,
    Config.LOGIN_VENTANA_SEGUNDOS,
)
