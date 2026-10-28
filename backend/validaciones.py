"""Validaciones del servidor.

El frontend valida por experiencia de usuario, pero el backend no confía en
esos datos: repite todas las reglas antes de escribir en SQL Server.
"""

import base64
import binascii
import re
from datetime import date

from config import Config
from datos import (
    EMPRESAS,
    ESTADOS_USUARIO,
    ESTADOS_VISITA,
    GRUPOS_SANGUINEOS,
    MAPA_EMPLEADOS,
    ROLES,
)

PATRON_NOMBRE = re.compile(r"^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s'.-]*$")
PATRON_USUARIO = re.compile(r"^[a-z][a-z0-9._-]{3,19}$")
PATRON_DOCUMENTO = re.compile(r"^[A-Za-z0-9]{6,12}$")
PATRON_TELEFONO = re.compile(r"^\d{10}$")
PATRON_FOTO = re.compile(
    r"^data:image/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$"
)


class ErrorValidacion(ValueError):
    """Error de negocio con detalle por campo (HTTP 400)."""

    def __init__(self, errores: dict[str, str]):
        super().__init__("Datos inválidos")
        self.errores = errores


def limpiar_texto(valor, maximo: int = 120, quitar_angulos: bool = True) -> str:
    """Normaliza espacios, elimina caracteres de control y limita longitud."""
    if not isinstance(valor, str):
        return ""
    texto = " ".join(valor.split())
    texto = "".join(caracter for caracter in texto if caracter.isprintable())
    if quitar_angulos:
        texto = texto.replace("<", "").replace(">", "")
    return texto[:maximo]


def normalizar_usuario(valor) -> str:
    return limpiar_texto(valor, 20, quitar_angulos=False).lower()


def _validar_nombre(nombre: str) -> str:
    if len(nombre) < 3:
        return "Escribe el nombre completo (mínimo 3 caracteres)."
    if len(nombre) > 80:
        return "El nombre no puede superar 80 caracteres."
    if not PATRON_NOMBRE.match(nombre):
        return "Usa solo letras, espacios y guiones."
    if len(nombre.split(" ")) < 2:
        return "Incluye al menos nombre y apellido."
    return ""


def _validar_usuario(usuario: str) -> str:
    if not usuario:
        return "El nombre de usuario es obligatorio."
    if not PATRON_USUARIO.match(usuario):
        return (
            "Usa de 4 a 20 caracteres: letras minúsculas, números, "
            "punto, guion o guion bajo."
        )
    return ""


def _validar_password(password: str) -> str:
    if len(password) < 8:
        return "La contraseña debe tener al menos 8 caracteres."
    if len(password) > 128:
        return "La contraseña no puede superar 128 caracteres."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "La contraseña debe incluir al menos una letra y un número."
    return ""


def validar_usuario(datos, es_edicion: bool = False) -> dict:
    """Valida y normaliza los datos de un usuario."""
    if not isinstance(datos, dict):
        raise ErrorValidacion({"general": "El cuerpo de la solicitud no es válido."})

    errores: dict[str, str] = {}

    nombre = limpiar_texto(datos.get("nombre"), 80)
    error = _validar_nombre(nombre)
    if error:
        errores["nombre"] = error

    usuario = normalizar_usuario(datos.get("usuario"))
    error = _validar_usuario(usuario)
    if error:
        errores["usuario"] = error

    empresa = limpiar_texto(datos.get("empresa"), 60)
    if empresa not in EMPRESAS:
        errores["empresa"] = "Selecciona una empresa válida."

    rol = limpiar_texto(datos.get("rol"), 20, quitar_angulos=False).lower()
    if rol not in ROLES:
        errores["rol"] = "Selecciona un perfil de acceso válido."

    password = datos.get("password") if isinstance(datos.get("password"), str) else ""
    if not es_edicion or password:
        error = _validar_password(password)
        if error:
            errores["password"] = error

    if errores:
        raise ErrorValidacion(errores)

    limpio = {
        "nombre": nombre,
        "usuario": usuario,
        "empresa": empresa,
        "rol": rol,
    }
    if password:
        limpio["password"] = password
    return limpio


def validar_estado_usuario(estado) -> str:
    valor = limpiar_texto(estado, 10, quitar_angulos=False).lower()
    if valor not in ESTADOS_USUARIO:
        raise ErrorValidacion({"estado": "El estado solicitado no es válido."})
    return valor


def validar_password(password) -> str:
    """Valida una contraseña suelta (p. ej. restablecimiento por consola)."""
    error = _validar_password(password if isinstance(password, str) else "")
    if error:
        raise ErrorValidacion({"password": error})
    return password


def validar_documento(valor) -> str:
    documento = limpiar_texto(valor, 12, quitar_angulos=False).upper()
    if not PATRON_DOCUMENTO.match(documento):
        raise ErrorValidacion(
            {"documento": "Debe tener entre 6 y 12 caracteres alfanuméricos."}
        )
    return documento


def _validar_foto(foto) -> str:
    if foto is None or foto == "":
        return ""

    if not isinstance(foto, str):
        raise ErrorValidacion({"foto": "La foto no tiene un formato válido."})

    limite_texto = int(Config.FOTO_MAX_BYTES * 1.4) + 200
    if len(foto) > limite_texto:
        raise ErrorValidacion({"foto": "La foto supera el tamaño permitido (2 MB)."})

    coincidencia = PATRON_FOTO.match(foto)
    if not coincidencia:
        raise ErrorValidacion(
            {"foto": "La foto debe ser una imagen JPEG, PNG o WebP en Base64."}
        )

    try:
        contenido = base64.b64decode(coincidencia.group(1), validate=True)
    except (binascii.Error, ValueError):
        raise ErrorValidacion({"foto": "La foto está dañada o mal codificada."})

    if len(contenido) > Config.FOTO_MAX_BYTES:
        raise ErrorValidacion({"foto": "La foto supera el tamaño permitido (2 MB)."})

    return foto


def validar_visita(datos) -> dict:
    """Valida el registro/edición de una visita. Devuelve columnas SQL."""
    if not isinstance(datos, dict):
        raise ErrorValidacion({"general": "El cuerpo de la solicitud no es válido."})

    errores: dict[str, str] = {}

    nombre = limpiar_texto(datos.get("nombre"), 80)
    error = _validar_nombre(nombre)
    if error:
        errores["nombre"] = error

    documento = limpiar_texto(datos.get("documento"), 12, quitar_angulos=False).upper()
    if not PATRON_DOCUMENTO.match(documento):
        errores["documento"] = (
            "El documento debe tener entre 6 y 12 caracteres alfanuméricos."
        )

    empresa = limpiar_texto(datos.get("empresa"), 60)

    persona_id = limpiar_texto(datos.get("personaId"), 20, quitar_angulos=False)
    persona = MAPA_EMPLEADOS.get(persona_id)
    if persona is None:
        errores["personaId"] = "Selecciona una persona a visitar válida."

    motivo = limpiar_texto(datos.get("motivo"), 120)
    if not motivo:
        errores["motivo"] = "Escribe el motivo o área de la visita."

    telefono = limpiar_texto(datos.get("telefono"), 10, quitar_angulos=False)
    if telefono and not PATRON_TELEFONO.match(telefono):
        errores["telefono"] = "Escribe un número de 10 dígitos."

    telefono_emergencia = limpiar_texto(
        datos.get("telefonoEmergencia"), 10, quitar_angulos=False
    )
    if telefono_emergencia and not PATRON_TELEFONO.match(telefono_emergencia):
        errores["telefonoEmergencia"] = "Escribe un número de 10 dígitos."

    eps = limpiar_texto(datos.get("eps"), 60)
    arl = limpiar_texto(datos.get("arl"), 60)

    rh = limpiar_texto(datos.get("rh"), 5, quitar_angulos=False).upper()
    if rh and rh not in GRUPOS_SANGUINEOS:
        errores["rh"] = "Selecciona un grupo sanguíneo válido."

    try:
        foto = _validar_foto(datos.get("foto"))
    except ErrorValidacion as fallo:
        errores.update(fallo.errores)
        foto = ""

    if errores:
        raise ErrorValidacion(errores)

    return {
        "nombre": nombre,
        "documento": documento,
        "empresa": empresa,
        "persona_id": persona_id,
        "persona_visitar": persona["nombre"],
        "motivo": motivo,
        "telefono": telefono,
        "telefono_emergencia": telefono_emergencia,
        "eps": eps,
        "arl": arl,
        "rh": rh,
        "foto": foto,
    }


def validar_estado_visita(estado) -> str:
    valor = limpiar_texto(estado, 10, quitar_angulos=False).lower()
    if valor not in ESTADOS_VISITA:
        raise ErrorValidacion({"estado": "El estado solicitado no es válido."})
    return valor


def leer_fecha(valor, defecto: date | None = None, campo: str = "fecha") -> date | None:
    """Convierte AAAA-MM-DD de la URL en date, sin aceptar otros formatos."""
    if valor in (None, ""):
        return defecto
    try:
        return date.fromisoformat(str(valor))
    except ValueError:
        raise ErrorValidacion({campo: "Usa una fecha con formato AAAA-MM-DD."})


def validar_rango(desde, hasta) -> tuple[date, date]:
    fecha_desde = leer_fecha(desde, campo="desde")
    fecha_hasta = leer_fecha(hasta, campo="hasta")

    if fecha_desde is None or fecha_hasta is None:
        raise ErrorValidacion({"fecha": "Debes indicar desde y hasta."})

    if fecha_desde > fecha_hasta:
        raise ErrorValidacion({"fecha": "La fecha inicial no puede ser mayor."})

    dias = (fecha_hasta - fecha_desde).days + 1
    if dias > Config.RANGO_REPORTE_MAX_DIAS:
        raise ErrorValidacion(
            {"fecha": f"El rango no puede superar {Config.RANGO_REPORTE_MAX_DIAS} días."}
        )
    return fecha_desde, fecha_hasta
