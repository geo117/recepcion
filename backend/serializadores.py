"""Conversión de filas de SQL Server al contrato JSON del frontend."""

from datetime import date, datetime, time

from datos import EMPRESAS_POR_CODIGO


def _fecha_iso(valor) -> str | None:
    if isinstance(valor, datetime):
        return valor.isoformat(timespec="seconds")
    if isinstance(valor, date):
        return valor.isoformat()
    return None


def _hora_texto(valor) -> str | None:
    if isinstance(valor, time):
        return valor.strftime("%H:%M")
    return None


def _texto(valor) -> str:
    return "" if valor is None else str(valor)


def usuario_publico(fila: dict) -> dict:
    """Usuario sin el campo password (nunca se expone el hash)."""
    rol = _texto(fila.get("rol"))
    return {
        "id": fila.get("id"),
        "nombre": _texto(fila.get("nombre")),
        "usuario": _texto(fila.get("usuario")),
        "empresa": _texto(fila.get("empresa")),
        "rol": rol,
        "cargo": "Administrador" if rol == "admin" else "Recepcionista",
        "estado": _texto(fila.get("estado")),
        "creadoEn": _fecha_iso(fila.get("creado_en")),
        "actualizadoEn": _fecha_iso(fila.get("actualizado_en")),
    }


def visita_publica(fila: dict) -> dict:
    """Visita con los nombres camelCase que espera el frontend."""
    codigo_compania = fila.get("company_reg")
    codigo_compania = int(codigo_compania) if codigo_compania is not None else None

    return {
        "id": fila.get("id"),
        "nombre": _texto(fila.get("nombre")),
        "documento": _texto(fila.get("documento")),
        "empresa": _texto(fila.get("empresa")),
        "companyReg": codigo_compania,
        "companyNombre": EMPRESAS_POR_CODIGO.get(codigo_compania, ""),
        "personaId": _texto(fila.get("persona_id")),
        "personaVisitar": _texto(fila.get("persona_visitar")),
        "motivo": _texto(fila.get("motivo")),
        "telefono": _texto(fila.get("telefono")),
        "telefonoEmergencia": _texto(fila.get("telefono_emergencia")),
        "eps": _texto(fila.get("eps")),
        "arl": _texto(fila.get("arl")),
        "rh": _texto(fila.get("rh")),
        "foto": _texto(fila.get("foto")),
        "fecha": _fecha_iso(fila.get("fecha")),
        "horaEntrada": _hora_texto(fila.get("hora_entrada")),
        "horaSalida": _hora_texto(fila.get("hora_salida")),
        "estado": _texto(fila.get("estado")),
        "registradoPor": _texto(fila.get("registrado_por")),
        "creadoEn": _fecha_iso(fila.get("creado_en")),
        "actualizadoEn": _fecha_iso(fila.get("actualizado_en")),
    }
