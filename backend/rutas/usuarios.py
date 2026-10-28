"""Gestión de usuarios (solo administradores)."""

from flask import Blueprint, g, jsonify, request

from db import consultar_todos, consultar_uno, transaccion
from seguridad import hash_password, requiere_admin
from serializadores import usuario_publico
from validaciones import (ErrorValidacion, validar_estado_usuario,
                          validar_usuario)

bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")

CAMPOS_PUBLICOS = """
    id, nombre, usuario, empresa, rol, estado, creado_en, actualizado_en
"""


def _obtener(id_usuario: int) -> dict | None:
    return consultar_uno(
        f"SELECT {CAMPOS_PUBLICOS} FROM dbo.usuarios WHERE id = ?",
        (id_usuario,),
    )


def _conflicto(mensaje: str):
    return jsonify({"mensaje": mensaje}), 409


def _quedan_otros_admins(actual, id_excluido: int) -> bool:
    """Debe existir al menos otro administrador activo distinto del indicado."""
    actual.execute(
        """
        SELECT COUNT(*) AS total
        FROM dbo.usuarios WITH (UPDLOCK, HOLDLOCK)
        WHERE rol = ? AND estado = ? AND id <> ?
        """,
        ("admin", "activo", id_excluido),
    )
    return int(actual.fetchone()[0]) > 0


@bp.get("/", strict_slashes=False)
@requiere_admin
def listar():
    filas = consultar_todos(
        f"SELECT {CAMPOS_PUBLICOS} FROM dbo.usuarios ORDER BY nombre ASC"
    )
    return jsonify([usuario_publico(fila) for fila in filas])


@bp.post("/", strict_slashes=False)
@requiere_admin
def crear():
    limpio = validar_usuario(request.get_json(silent=True))

    with transaccion() as actual:
        # Bloquea el rango para evitar dos usuarios iguales en concurrencia.
        actual.execute(
            "SELECT id FROM dbo.usuarios WITH (UPDLOCK, HOLDLOCK) WHERE usuario = ?",
            (limpio["usuario"],),
        )
        if actual.fetchone() is not None:
            return _conflicto("Ese nombre de usuario ya está registrado.")

        actual.execute(
            """
            INSERT INTO dbo.usuarios
                (nombre, usuario, password, empresa, rol, estado, creado_en)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?, ?, ?, SYSDATETIME())
            """,
            (
                limpio["nombre"],
                limpio["usuario"],
                hash_password(limpio["password"]),
                limpio["empresa"],
                limpio["rol"],
                "activo",
            ),
        )
        id_nuevo = int(actual.fetchone()[0])

    return jsonify(usuario_publico(_obtener(id_nuevo))), 201


@bp.put("/<int:id_usuario>")
@requiere_admin
def actualizar(id_usuario: int):
    fila = _obtener(id_usuario)
    if fila is None:
        return jsonify({"mensaje": "No encontramos el usuario solicitado."}), 404

    cuerpo = request.get_json(silent=True)
    if not isinstance(cuerpo, dict):
        raise ErrorValidacion({"general": "El cuerpo de la solicitud no es válido."})

    combinado = {
        "nombre": cuerpo.get("nombre", fila["nombre"]),
        "usuario": cuerpo.get("usuario", fila["usuario"]),
        "empresa": cuerpo.get("empresa", fila["empresa"]),
        "rol": cuerpo.get("rol", fila["rol"]),
        "password": cuerpo.get("password", ""),
    }
    limpio = validar_usuario(combinado, es_edicion=True)

    es_propio = id_usuario == g.usuario_actual["id"]
    if es_propio and limpio["rol"] != fila["rol"]:
        return _conflicto("No puedes cambiar tu propio perfil de acceso.")

    with transaccion() as actual:
        actual.execute(
            """
            SELECT id FROM dbo.usuarios WITH (UPDLOCK, HOLDLOCK)
            WHERE usuario = ? AND id <> ?
            """,
            (limpio["usuario"], id_usuario),
        )
        if actual.fetchone() is not None:
            return _conflicto("Ese nombre de usuario ya está registrado.")

        if (
            fila["rol"] == "admin"
            and fila["estado"] == "activo"
            and limpio["rol"] != "admin"
            and not _quedan_otros_admins(actual, id_usuario)
        ):
            return _conflicto("Debe existir al menos un administrador activo en el sistema.")

        parametros = [
            limpio["nombre"],
            limpio["usuario"],
            limpio["empresa"],
            limpio["rol"],
        ]
        sql = """
            UPDATE dbo.usuarios
            SET nombre = ?, usuario = ?, empresa = ?, rol = ?, actualizado_en = SYSDATETIME()
        """

        if limpio.get("password"):
            sql += ", password = ?"
            parametros.append(hash_password(limpio["password"]))

        sql += " WHERE id = ?"
        parametros.append(id_usuario)

        actual.execute(sql, tuple(parametros))

    return jsonify(usuario_publico(_obtener(id_usuario)))


@bp.patch("/<int:id_usuario>/estado")
@requiere_admin
def actualizar_estado(id_usuario: int):
    estado = validar_estado_usuario((request.get_json(silent=True) or {}).get("estado"))

    fila = _obtener(id_usuario)
    if fila is None:
        return jsonify({"mensaje": "No encontramos el usuario solicitado."}), 404

    if id_usuario == g.usuario_actual["id"] and estado == "inactivo":
        return _conflicto("No puedes desactivar tu propia cuenta.")

    with transaccion() as actual:
        if (
            fila["rol"] == "admin"
            and fila["estado"] == "activo"
            and estado == "inactivo"
            and not _quedan_otros_admins(actual, id_usuario)
        ):
            return _conflicto("Debe existir al menos un administrador activo en el sistema.")

        actual.execute(
            """
            UPDATE dbo.usuarios
            SET estado = ?, actualizado_en = SYSDATETIME()
            WHERE id = ?
            """,
            (estado, id_usuario),
        )

    return jsonify(usuario_publico(_obtener(id_usuario)))


@bp.delete("/<int:id_usuario>")
@requiere_admin
def eliminar(id_usuario: int):
    fila = _obtener(id_usuario)
    if fila is None:
        return jsonify({"mensaje": "No encontramos el usuario solicitado."}), 404

    if id_usuario == g.usuario_actual["id"]:
        return _conflicto("No puedes eliminar tu propia cuenta.")

    with transaccion() as actual:
        if (
            fila["rol"] == "admin"
            and fila["estado"] == "activo"
            and not _quedan_otros_admins(actual, id_usuario)
        ):
            return _conflicto("No puedes eliminar al último administrador activo del sistema.")

        actual.execute("DELETE FROM dbo.usuarios WHERE id = ?", (id_usuario,))

    return jsonify({"ok": True})
