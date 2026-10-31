"""Registro y consulta de visitantes."""

from math import ceil

from flask import Blueprint, g, jsonify, request

from datos import codigo_empresa
from db import consultar_todos, consultar_uno, transaccion
from seguridad import requiere_admin, requiere_auth
from serializadores import visita_publica
from validaciones import (ErrorValidacion, leer_fecha, limpiar_texto,
                          validar_estado_visita, validar_visita)

bp = Blueprint("visitas", __name__, url_prefix="/api/visitas")

CAMPOS_VISITA = """
    id, nombre, documento, empresa, company_reg, persona_id, persona_visitar,
    motivo, telefono, telefono_emergencia, eps, arl, rh, {foto}, fecha,
    hora_entrada, hora_salida, estado, registrado_por, usuario_recepcion,
    creado_en, actualizado_en
"""


def _campos(incluir_foto: bool = True) -> str:
    expresion = "foto" if incluir_foto else "CAST('' AS NVARCHAR(MAX)) AS foto"
    return CAMPOS_VISITA.format(foto=expresion)


def _condicion_usuario(usuario: dict) -> tuple[str, list]:
    """Alcance de los registros que puede consultar el usuario autenticado.

    Un administrador ve todo. Una recepcionista ve únicamente lo que ella
    registró. El usuario sale del token, nunca de la petición, así que el
    alcance no se puede ampliar agregando parámetros a la URL.

    No se agrega la empresa como condición: `usuarios.usuario` es único y cada
    visita guarda la empresa del usuario que la registró, así que filtrar por
    usuario ya limita a la empresa correcta. Añadirla además haría que un
    registro con `company_reg` inconsistente desapareciera para su propio autor.
    """
    if usuario.get("rol") == "admin":
        return "", []

    return "usuario_recepcion = ?", [usuario.get("usuario") or ""]


def _condicion_empresa(usuario: dict) -> tuple[str, list]:
    """Alcance por empresa, sin exigir que el registro sea propio.

    Se usa en las búsquedas operativas de la recepción (visita abierta y datos
    de la última visita): permiten detectar una entrada activa o reutilizar los
    datos de alguien registrado por un compañero de la misma empresa, sin
    exponer información de las otras empresas.
    """
    if usuario.get("rol") == "admin":
        return "", []

    codigo = codigo_empresa(usuario.get("empresa"))
    if codigo is None:
        return "", []

    return "company_reg = ?", [codigo]


def _obtener(id_visita: int) -> dict | None:
    """Devuelve la visita si el usuario autenticado puede verla.

    Para una recepcionista el filtro va en el WHERE, así que un id ajeno
    responde 404 igual que uno inexistente: no se puede sondear el historial
    de otros usuarios cambiando el número en la URL.
    """
    condicion, parametros = _condicion_usuario(g.usuario_actual)
    extra = f" AND {condicion}" if condicion else ""
    return consultar_uno(
        f"SELECT {_campos(True)} FROM dbo.visitantes WHERE id = ?{extra}",
        (id_visita, *parametros),
    )


def _entero(valor, defecto: int, minimo: int, maximo: int) -> int:
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        return defecto
    return max(minimo, min(maximo, numero))


def _patron_like(texto: str) -> str:
    escapado = (
        texto.replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
        .replace("[", "\\[")
        .replace("]", "\\]")
    )
    return f"%{escapado}%"


@bp.get("/", strict_slashes=False)
@requiere_auth
def listar():
    argumentos = request.args

    pagina = _entero(argumentos.get("pagina"), 1, 1, 100000)
    por_pagina = _entero(argumentos.get("porPagina"), 20, 1, 1000)
    limite = _entero(argumentos.get("limite"), 0, 0, 1000)
    orden = "ASC" if str(argumentos.get("orden", "")).lower() == "asc" else "DESC"

    condiciones: list[str] = []
    parametros: list = []

    condicion_usuario, parametros_usuario = _condicion_usuario(g.usuario_actual)
    if condicion_usuario:
        condiciones.append(condicion_usuario)
        parametros.extend(parametros_usuario)

    fecha = leer_fecha(argumentos.get("fecha"), campo="fecha")
    desde = leer_fecha(argumentos.get("desde"), campo="desde")
    hasta = leer_fecha(argumentos.get("hasta"), campo="hasta")

    if fecha:
        condiciones.append("fecha = ?")
        parametros.append(fecha)
    if desde:
        condiciones.append("fecha >= ?")
        parametros.append(desde)
    if hasta:
        condiciones.append("fecha <= ?")
        parametros.append(hasta)

    estado = limpiar_texto(argumentos.get("estado"), 10, quitar_angulos=False).lower()
    if estado:
        estado = validar_estado_visita(estado)
        condiciones.append("estado = ?")
        parametros.append(estado)

    termino = limpiar_texto(argumentos.get("busqueda"), 80)
    if termino:
        patron = _patron_like(termino)
        condiciones.append(
            "(nombre LIKE ? ESCAPE '\\' OR documento LIKE ? ESCAPE '\\' "
            "OR empresa LIKE ? ESCAPE '\\' OR persona_visitar LIKE ? ESCAPE '\\' "
            "OR motivo LIKE ? ESCAPE '\\' OR eps LIKE ? ESCAPE '\\' "
            "OR arl LIKE ? ESCAPE '\\')"
        )
        parametros.extend([patron] * 7)

    where = f" WHERE {' AND '.join(condiciones)}" if condiciones else ""

    total = int(
        consultar_uno(
            f"SELECT COUNT(*) AS total FROM dbo.visitantes{where}",
            tuple(parametros),
        )["total"]
    )

    if limite:
        pagina = 1
        por_pagina = limite

    # En exportaciones grandes (CSV de 1000 filas) no se envían las fotos.
    incluir_foto = por_pagina <= 100

    filas = consultar_todos(
        f"""
        SELECT {_campos(incluir_foto)}
        FROM dbo.visitantes
        {where}
        ORDER BY fecha {orden}, hora_entrada {orden}, id {orden}
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """,
        tuple(parametros) + ((pagina - 1) * por_pagina, por_pagina),
    )

    return jsonify(
        {
            "datos": [visita_publica(fila) for fila in filas],
            "total": total,
            "pagina": pagina,
            "porPagina": por_pagina,
            "totalPaginas": 1 if limite else max(1, ceil(total / por_pagina)),
        }
    )


@bp.get("/abierta")
@requiere_auth
def abierta():
    documento = limpiar_texto(request.args.get("documento"), 12, quitar_angulos=False).upper()
    if not documento:
        return jsonify(None)

    condicion, parametros = _condicion_empresa(g.usuario_actual)
    extra = f" AND {condicion}" if condicion else ""

    fila = consultar_uno(
        f"""
        SELECT TOP 1 {_campos(True)}
        FROM dbo.visitantes
        WHERE documento = ?
          AND estado = 'dentro'
          AND fecha = CAST(SYSDATETIME() AS DATE){extra}
        ORDER BY hora_entrada DESC, id DESC
        """,
        (documento, *parametros),
    )
    return jsonify(visita_publica(fila) if fila else None)


@bp.get("/ultima")
@requiere_auth
def ultima():
    documento = limpiar_texto(request.args.get("documento"), 12, quitar_angulos=False).upper()
    if not documento:
        return jsonify(None)

    condicion, parametros = _condicion_empresa(g.usuario_actual)
    extra = f" AND {condicion}" if condicion else ""

    fila = consultar_uno(
        f"""
        SELECT TOP 1 {_campos(True)}
        FROM dbo.visitantes
        WHERE documento = ?{extra}
        ORDER BY fecha DESC, hora_entrada DESC, id DESC
        """,
        (documento, *parametros),
    )
    return jsonify(visita_publica(fila) if fila else None)


@bp.get("/<int:id_visita>")
@requiere_auth
def detalle(id_visita: int):
    fila = _obtener(id_visita)
    if fila is None:
        return jsonify({"mensaje": "No encontramos la visita solicitada."}), 404
    return jsonify(visita_publica(fila))


@bp.post("/", strict_slashes=False)
@requiere_auth
def crear():
    limpio = validar_visita(request.get_json(silent=True))

    # La compañía se toma del usuario autenticado, no del cuerpo de la petición.
    codigo_compania = codigo_empresa(g.usuario_actual.get("empresa"))
    if codigo_compania is None:
        return (
            jsonify(
                {
                    "mensaje": (
                        "Tu usuario no tiene una empresa válida asignada. "
                        "Contacta al administrador."
                    )
                }
            ),
            400,
        )

    with transaccion() as actual:
        actual.execute(
            """
            SELECT id
            FROM dbo.visitantes WITH (UPDLOCK, HOLDLOCK)
            WHERE documento = ?
              AND estado = 'dentro'
              AND fecha = CAST(SYSDATETIME() AS DATE)
            """,
            (limpio["documento"],),
        )
        if actual.fetchone() is not None:
            return (
                jsonify(
                    {
                        "mensaje": (
                            "Ya existe una visita activa con este documento. "
                            "Registra primero la salida."
                        )
                    }
                ),
                409,
            )

        actual.execute(
            """
            INSERT INTO dbo.visitantes
                (nombre, documento, empresa, company_reg, persona_id,
                 persona_visitar, motivo, telefono, telefono_emergencia, eps,
                 arl, rh, foto, fecha, hora_entrada, hora_salida, estado,
                 registrado_por, usuario_recepcion, creado_en)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    CAST(SYSDATETIME() AS DATE),
                    CAST(SYSDATETIME() AS TIME(0)),
                    NULL, 'dentro', ?, ?, SYSDATETIME())
            """,
            (
                limpio["nombre"],
                limpio["documento"],
                limpio["empresa"],
                codigo_compania,
                limpio["persona_id"],
                limpio["persona_visitar"],
                limpio["motivo"],
                limpio["telefono"],
                limpio["telefono_emergencia"],
                limpio["eps"],
                limpio["arl"],
                limpio["rh"],
                limpio["foto"],
                g.usuario_actual["nombre"],
                g.usuario_actual["usuario"],
            ),
        )
        id_nuevo = int(actual.fetchone()[0])

    return jsonify(visita_publica(_obtener(id_nuevo))), 201


@bp.patch("/<int:id_visita>/salida")
@requiere_auth
def registrar_salida(id_visita: int):
    condicion, parametros = _condicion_usuario(g.usuario_actual)
    extra = f" AND {condicion}" if condicion else ""

    with transaccion() as actual:
        actual.execute(
            f"""
            SELECT id, estado, hora_salida
            FROM dbo.visitantes WITH (UPDLOCK, HOLDLOCK)
            WHERE id = ?{extra}
            """,
            (id_visita, *parametros),
        )
        fila = actual.fetchone()

        if fila is None:
            return jsonify({"mensaje": "No encontramos la visita solicitada."}), 404

        if fila.estado == "salio" or fila.hora_salida is not None:
            return jsonify({"mensaje": "Esta visita ya tiene una salida registrada."}), 409

        actual.execute(
            """
            UPDATE dbo.visitantes
            SET hora_salida = CAST(SYSDATETIME() AS TIME(0)),
                estado = 'salio',
                actualizado_en = SYSDATETIME()
            WHERE id = ?
            """,
            (id_visita,),
        )

    return jsonify(visita_publica(_obtener(id_visita)))


@bp.put("/<int:id_visita>")
@requiere_auth
def actualizar(id_visita: int):
    fila = _obtener(id_visita)
    if fila is None:
        return jsonify({"mensaje": "No encontramos la visita solicitada."}), 404

    cuerpo = request.get_json(silent=True)
    if not isinstance(cuerpo, dict):
        raise ErrorValidacion({"general": "El cuerpo de la solicitud no es válido."})

    combinado = {
        "nombre": cuerpo.get("nombre", fila["nombre"]),
        "documento": cuerpo.get("documento", fila["documento"]),
        "empresa": cuerpo.get("empresa", fila["empresa"]),
        "personaId": cuerpo.get("personaId", fila["persona_id"]),
        "motivo": cuerpo.get("motivo", fila["motivo"]),
        "telefono": cuerpo.get("telefono", fila["telefono"]),
        "telefonoEmergencia": cuerpo.get(
            "telefonoEmergencia", fila["telefono_emergencia"]
        ),
        "eps": cuerpo.get("eps", fila["eps"]),
        "arl": cuerpo.get("arl", fila["arl"]),
        "rh": cuerpo.get("rh", fila["rh"]),
        "foto": cuerpo.get("foto", fila["foto"]),
    }
    limpio = validar_visita(combinado)

    with transaccion() as actual:
        if fila["estado"] == "dentro" and limpio["documento"] != fila["documento"]:
            actual.execute(
                """
                SELECT id
                FROM dbo.visitantes WITH (UPDLOCK, HOLDLOCK)
                WHERE documento = ?
                  AND estado = 'dentro'
                  AND fecha = CAST(SYSDATETIME() AS DATE)
                  AND id <> ?
                """,
                (limpio["documento"], id_visita),
            )
            if actual.fetchone() is not None:
                return (
                    jsonify(
                        {
                            "mensaje": (
                                "Ya existe otra visita activa con ese documento."
                            )
                        }
                    ),
                    409,
                )

        actual.execute(
            """
            UPDATE dbo.visitantes
            SET nombre = ?, documento = ?, empresa = ?, persona_id = ?,
                persona_visitar = ?, motivo = ?, telefono = ?,
                telefono_emergencia = ?, eps = ?, arl = ?, rh = ?, foto = ?,
                actualizado_en = SYSDATETIME()
            WHERE id = ?
            """,
            (
                limpio["nombre"],
                limpio["documento"],
                limpio["empresa"],
                limpio["persona_id"],
                limpio["persona_visitar"],
                limpio["motivo"],
                limpio["telefono"],
                limpio["telefono_emergencia"],
                limpio["eps"],
                limpio["arl"],
                limpio["rh"],
                limpio["foto"],
                id_visita,
            ),
        )

    return jsonify(visita_publica(_obtener(id_visita)))


@bp.delete("/<int:id_visita>")
@requiere_admin
def eliminar(id_visita: int):
    fila = consultar_uno(
        "SELECT id FROM dbo.visitantes WHERE id = ?", (id_visita,)
    )
    if fila is None:
        return jsonify({"mensaje": "No encontramos la visita solicitada."}), 404

    with transaccion() as actual:
        actual.execute("DELETE FROM dbo.visitantes WHERE id = ?", (id_visita,))

    return jsonify({"ok": True})
