from __future__ import annotations

from urllib.parse import urlparse

import streamlit as st

from trend_search import (
    ProviderError,
    load_app_config,
    save_report,
    search_trends,
)


ALLOWED_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
    "tiktok.com",
    "www.tiktok.com",
    "instagram.com",
    "www.instagram.com",
}
PLATFORM_NAMES = {
    "youtube": "YouTube",
    "tiktok": "TikTok",
    "instagram": "Instagram / Reels",
}

st.title("Radar de tendencias")
st.caption("Descubre vídeos públicos por nicho y región. Las señales no son comparables entre plataformas.")

st.info(
    "YouTube ordena resultados recientes por visualizaciones; TikTok Research requiere aprobación y puede "
    "tener retrasos de datos; Instagram busca vídeos populares por hashtag, sin vistas ni filtro geográfico."
)

with st.form("trend-search"):
    niche = st.text_input("Tema o nicho", value="inteligencia artificial")
    left, right = st.columns(2)
    with left:
        region = st.text_input("País (código ISO de 2 letras)", value="VE", max_chars=2)
        days = st.number_input("Periodo de búsqueda (días)", min_value=1, max_value=30, value=7)
    with right:
        hashtags_text = st.text_input(
            "Hashtags de Instagram (separados por comas)",
            value="inteligenciaartificial, ia",
        )
        limit = st.number_input("Máximo de vídeos por plataforma", min_value=1, max_value=50, value=25)
    platforms = st.multiselect(
        "Plataformas",
        options=list(PLATFORM_NAMES),
        default=list(PLATFORM_NAMES),
        format_func=lambda platform: PLATFORM_NAMES[platform],
    )
    submitted = st.form_submit_button("Buscar tendencias", type="primary")

if submitted:
    st.session_state.pop("trend_report", None)
    st.session_state.pop("trend_report_path", None)
    hashtags = [tag.strip().lstrip("#") for tag in hashtags_text.split(",") if tag.strip()]
    try:
        with st.spinner("Consultando las APIs oficiales disponibles…"):
            report = search_trends(
                niche,
                region=region,
                days=int(days),
                limit=int(limit),
                platforms=tuple(platforms),
                hashtags=hashtags,
                app_config=load_app_config(),
            )
            report_path = save_report(report)
    except (ProviderError, ValueError, OSError) as exc:
        st.error(f"No se pudo completar la búsqueda: {exc}")
    else:
        st.session_state["trend_report"] = report
        st.session_state["trend_report_path"] = str(report_path)

report = st.session_state.get("trend_report")
if report:
    st.caption(
        f"Consulta: {report['query']} · País: {report['region']} · "
        f"Generado: {report['created_at']}"
    )
    st.caption(f"Informe guardado en el volumen Docker: {st.session_state['trend_report_path']}")

    for platform, source in report["platforms"].items():
        with st.expander(
            f"{PLATFORM_NAMES[platform]} — {source['status']} · {source['count']} vídeos",
            expanded=True,
        ):
            if source["status"] == "not_configured":
                st.warning(source["message"])
            elif source["status"] == "error":
                st.error(source["message"])
            else:
                st.caption(source.get("method", ""))
                if not source["videos"]:
                    st.info("La API no devolvió vídeos para esta consulta.")
                for video in source["videos"]:
                    st.text(video["title"])
                    details = [video["creator"]] if video.get("creator") else []
                    if video.get("published_at"):
                        details.append(video["published_at"])
                    if video.get("views") is not None:
                        details.append(f"vistas {video['views']:,}")
                    details.append(f"me gusta {video['likes']:,}")
                    details.append(f"comentarios {video['comments']:,}")
                    if video.get("views_per_hour_estimate") is not None:
                        details.append(
                            f"vistas/h estimadas {video['views_per_hour_estimate']:,.2f}"
                        )
                    st.caption(" · ".join(details))
                    parsed = urlparse(video.get("url") or "")
                    if parsed.scheme == "https" and parsed.hostname in ALLOWED_HOSTS:
                        st.link_button("Ver vídeo original", video["url"])

    st.subheader("Límites de interpretación")
    for limitation in report["limitations"]:
        st.caption(f"• {limitation}")
else:
    st.markdown(
        """
        Para activar las consultas, configura las credenciales aprobadas en `[app]` dentro del
        `config.toml` almacenado en el volumen aislado. No pegues claves en el código ni en el chat.

        - **YouTube:** proyecto de Google Cloud con YouTube Data API v3 y API key.
        - **TikTok:** Research API requiere elegibilidad y aprobación del proyecto; no es tiempo real.
        - **Instagram:** cuenta profesional conectada, Facebook Login y acceso aprobado a contenido público.
        """
    )
