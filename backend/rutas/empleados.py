"""Catálogo de colaboradores (personas a visitar)."""

from flask import Blueprint, jsonify

from datos import EMPLEADOS
from seguridad import requiere_auth

bp = Blueprint("empleados", __name__, url_prefix="/api/empleados")


@bp.get("/", strict_slashes=False)
@requiere_auth
def listar():
    return jsonify([dict(empleado) for empleado in EMPLEADOS])
