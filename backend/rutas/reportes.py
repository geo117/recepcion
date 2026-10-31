"""Resumen estadístico para la pantalla de reportes."""

from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from db import consultar_todos, consultar_uno
from seguridad import requiere_admin
from validaciones import validar_rango

bp = Blueprint("reportes", __name__, url_prefix="/api/reportes")


@bp.get("/resumen")
@requiere_admin
def resumen():
    hoy = date.today()
    desde_texto = request.args.get("desde") or (hoy - timedelta(days=29)).isoformat()
    hasta_texto = request.args.get("hasta") or hoy.isoformat()
    desde, hasta = validar_rango(desde_texto, hasta_texto)

    totales = consultar_uno(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN estado = 'dentro' THEN 1 ELSE 0 END) AS dentro
        FROM dbo.visitantes
        WHERE fecha >= ? AND fecha <= ?
        """,
        (desde, hasta),
    ) or {}

    total = int(totales.get("total") or 0)
    dentro = int(totales.get("dentro") or 0)

    por_motivo = consultar_todos(
        """
        SELECT motivo, COUNT(*) AS cantidad
        FROM dbo.visitantes
        WHERE fecha >= ? AND fecha <= ?
        GROUP BY motivo
        ORDER BY cantidad DESC, motivo ASC
        """,
        (desde, hasta),
    )

    por_dia = consultar_todos(
        """
        SELECT fecha, COUNT(*) AS cantidad
        FROM dbo.visitantes
        WHERE fecha >= ? AND fecha <= ?
        GROUP BY fecha
        ORDER BY fecha ASC
        """,
        (desde, hasta),
    )

    dias = max(1, (hasta - desde).days + 1)
    motivos = [
        {"motivo": fila["motivo"], "cantidad": int(fila["cantidad"])}
        for fila in por_motivo
    ]
    dias_activos = [
        {"fecha": fila["fecha"].isoformat(), "cantidad": int(fila["cantidad"])}
        for fila in por_dia
    ]

    return jsonify(
        {
            "desde": desde.isoformat(),
            "hasta": hasta.isoformat(),
            "total": total,
            "dentro": dentro,
            "dias": dias,
            "promedioDiario": total / dias,
            "motivoFrecuente": motivos[0]["motivo"] if motivos else "Sin registros",
            "porMotivo": motivos,
            "porDia": dias_activos,
        }
    )
