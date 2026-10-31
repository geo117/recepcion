"""Rutas de autenticación."""
from flask import Blueprint, jsonify, request

from db import transaccion
from seguridad import (
    HASH_RELLENO,
    crear_token,
    hash_password,
    limitador_login,
    necesita_rehash,
    verificar_password,
)
from serializadores import usuario_publico

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MENSAJE_CREDENCIALES = "Credenciales inválidas. Verifica tu usuario y contraseña."

# Un cuerpo con usuario y contraseña ocupa unos cientos de bytes. El límite
# global (MAX_CONTENT_LENGTH) existe para las fotos de visitantes, pero el
# login es un endpoint público: conviene acotarlo para que nadie gaste CPU y
# memoria haciendo que el servidor parsee megabytes de JSON por intento.
CUERPO_MAXIMO_BYTES = 4096


@bp.post("/login")
def iniciar_sesion():
    if request.content_length and request.content_length > CUERPO_MAXIMO_BYTES:
        return jsonify({"mensaje": "La solicitud supera el tamaño permitido."}), 413

    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({"mensaje": MENSAJE_CREDENCIALES}), 401

    usuario = str(datos.get("usuario") or "").strip().lower()
    password = datos.get("password") if isinstance(datos.get("password"), str) else ""

    if not usuario or not password or len(usuario) > 64 or len(password) > 128:
        return jsonify({"mensaje": MENSAJE_CREDENCIALES}), 401

    ip = request.remote_addr or "desconocida"
    clave_ip = f"ip:{ip}"
    clave_usuario = f"usuario:{usuario}"

    if not limitador_login.permitido(clave_ip) or not limitador_login.permitido(clave_usuario):
        return (
            jsonify(
                {
                    "mensaje": (
                        "Demasiados intentos fallidos. "
                        "Espera unos minutos antes de volver a intentar."
                    )
                }
            ),
            429,
        )

    with transaccion() as actual:
        actual.execute(
            """
            SELECT id, nombre, usuario, password, empresa, rol, estado,
                   creado_en, actualizado_en
            FROM dbo.usuarios
            WHERE usuario = ?
            """,
            (usuario,),
        )
        fila = actual.fetchone()

        if fila is None:
            # Comparación de relleno para no revelar por tiempo si el usuario existe.
            verificar_password(password, HASH_RELLENO)
            limitador_login.registrar_fallo(clave_ip)
            limitador_login.registrar_fallo(clave_usuario)
            return jsonify({"mensaje": MENSAJE_CREDENCIALES}), 401

        columnas = [columna[0] for columna in actual.description]
        registro = dict(zip(columnas, fila))

        if registro.get("estado") != "activo" or not verificar_password(
            password, registro.get("password")
        ):
            limitador_login.registrar_fallo(clave_ip)
            limitador_login.registrar_fallo(clave_usuario)
            return jsonify({"mensaje": MENSAJE_CREDENCIALES}), 401

        # Migración transparente de contraseñas legacy a PBKDF2.
        if necesita_rehash(registro.get("password")):
            actual.execute(
                """
                UPDATE dbo.usuarios
                SET password = ?, actualizado_en = SYSDATETIME()
                WHERE id = ?
                """,
                (hash_password(password), registro["id"]),
            )

    limitador_login.limpiar(clave_ip)
    limitador_login.limpiar(clave_usuario)

    return jsonify(
        {
            "token": crear_token(registro),
            "usuario": usuario_publico(registro),
        }
    )
