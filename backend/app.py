"""Punto de entrada del backend de recepción de visitantes.

Ejecución:
    python app.py
    flask --app app run --port 5000

Documentación de instalación en backend/README.md.
"""

import getpass
import logging
import os

import click
import pyodbc
from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from db import cerrar_conexion, consultar_uno, transaccion
from rutas.auth import bp as bp_auth
from rutas.empleados import bp as bp_empleados
from rutas.reportes import bp as bp_reportes
from rutas.usuarios import bp as bp_usuarios
from rutas.visitas import bp as bp_visitas
from seguridad import hash_password
from validaciones import (ErrorValidacion, normalizar_usuario,
                          validar_password, validar_usuario)

registro = logging.getLogger(__name__)


def crear_app() -> Flask:
    Config.validar()

    app = Flask(__name__)
    app.config.from_object(Config)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    CORS(
        app,
        resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        max_age=600,
    )

    app.register_blueprint(bp_auth)
    app.register_blueprint(bp_empleados)
    app.register_blueprint(bp_usuarios)
    app.register_blueprint(bp_visitas)
    app.register_blueprint(bp_reportes)

    app.teardown_appcontext(cerrar_conexion)

    @app.after_request
    def cabeceras_seguridad(respuesta):
        respuesta.headers.setdefault("X-Content-Type-Options", "nosniff")
        respuesta.headers.setdefault("X-Frame-Options", "DENY")
        respuesta.headers.setdefault("Referrer-Policy", "no-referrer")
        respuesta.headers.setdefault("Cache-Control", "no-store")
        respuesta.headers.setdefault(
            "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
        )
        return respuesta

    @app.get("/api/salud")
    def salud():
        consultar_uno("SELECT 1 AS ok")
        return jsonify({"estado": "ok"})

    # --- Manejo de errores: nunca se expone la traza ni el SQL al cliente ---

    @app.errorhandler(ErrorValidacion)
    def manejar_validacion(fallo: ErrorValidacion):
        return (
            jsonify(
                {
                    "mensaje": "Revisa los datos del formulario e intenta nuevamente.",
                    "errores": fallo.errores,
                }
            ),
            400,
        )

    @app.errorhandler(404)
    def no_encontrado(_fallo):
        return jsonify({"mensaje": "No encontramos la información solicitada."}), 404

    @app.errorhandler(405)
    def metodo_no_permitido(_fallo):
        return jsonify({"mensaje": "Método no permitido."}), 405

    @app.errorhandler(413)
    def demasiado_grande(_fallo):
        return jsonify({"mensaje": "La solicitud supera el tamaño permitido."}), 413

    @app.errorhandler(pyodbc.Error)
    def error_base_datos(fallo):
        app.logger.error(
            "Error de base de datos (SQLSTATE=%s)",
            getattr(fallo, "args", [""])[0],
        )
        return (
            jsonify({"mensaje": "No se pudo conectar con la base de datos."}),
            503,
        )

    @app.errorhandler(Exception)
    def error_no_controlado(fallo):
        if isinstance(fallo, HTTPException):
            return fallo
        app.logger.exception("Error no controlado en la API")
        return (
            jsonify({"mensaje": "El servidor no está disponible en este momento."}),
            500,
        )

    # --- Comando de consola para crear el primer administrador ---

    @app.cli.command("crear-admin")
    def crear_admin():
        """Crea el usuario administrador inicial (solo si no existe)."""
        nombre = os.getenv("ADMIN_NOMBRE") or click.prompt("Nombre completo")
        usuario = os.getenv("ADMIN_USUARIO") or click.prompt("Usuario")
        password = os.getenv("ADMIN_PASSWORD") or getpass.getpass(
            "Contraseña (mínimo 8, con letra y número): "
        )

        try:
            limpio = validar_usuario(
                {
                    "nombre": nombre,
                    "usuario": usuario,
                    "password": password,
                    "empresa": os.getenv("ADMIN_EMPRESA", "GYJ Ferreterías"),
                    "rol": "admin",
                }
            )
        except ErrorValidacion as fallo:
            for mensaje in fallo.errores.values():
                click.echo(f"Error: {mensaje}", err=True)
            raise SystemExit(1)

        existente = consultar_uno(
            "SELECT id FROM dbo.usuarios WHERE usuario = ?", (limpio["usuario"],)
        )
        if existente is not None:
            click.echo("Ese nombre de usuario ya existe.", err=True)
            raise SystemExit(1)

        with transaccion() as actual:
            actual.execute(
                """
                INSERT INTO dbo.usuarios
                    (nombre, usuario, password, empresa, rol, estado, creado_en)
                VALUES (?, ?, ?, ?, 'admin', 'activo', SYSDATETIME())
                """,
                (
                    limpio["nombre"],
                    limpio["usuario"],
                    hash_password(limpio["password"]),
                    limpio["empresa"],
                ),
            )

        click.echo(f"Administrador '{limpio['usuario']}' creado correctamente.")

    @app.cli.command("restablecer-password")
    def restablecer_password():
        """Cambia la contraseña de un usuario existente."""
        usuario = normalizar_usuario(
            os.getenv("RESET_USUARIO") or click.prompt("Usuario")
        )
        password = os.getenv("RESET_PASSWORD") or getpass.getpass(
            "Nueva contraseña (mínimo 8, con letra y número): "
        )

        try:
            validar_password(password)
        except ErrorValidacion as fallo:
            for mensaje in fallo.errores.values():
                click.echo(f"Error: {mensaje}", err=True)
            raise SystemExit(1)

        fila = consultar_uno(
            "SELECT id FROM dbo.usuarios WHERE usuario = ?", (usuario,)
        )
        if fila is None:
            click.echo("No existe un usuario con ese nombre.", err=True)
            raise SystemExit(1)

        with transaccion() as actual:
            actual.execute(
                """
                UPDATE dbo.usuarios
                SET password = ?, actualizado_en = SYSDATETIME()
                WHERE id = ?
                """,
                (hash_password(password), fila["id"]),
            )

        click.echo(f"Contraseña actualizada para '{usuario}'.")

    return app


app = crear_app()


if __name__ == "__main__":
    app.run(host=Config.HOST, port=Config.PUERTO, debug=Config.DEBUG)
