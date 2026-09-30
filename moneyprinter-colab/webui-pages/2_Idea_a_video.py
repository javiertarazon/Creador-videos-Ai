from __future__ import annotations

import json
import mimetypes
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests
import streamlit as st

from design_profiles import DESIGN_PROFILES
from remotion_export import (
    MAX_AUDIO_BYTES,
    create_remotion_export_bundle,
    export_bundle_fingerprint,
)
from scraper_client import ScraperClientError, search_public_social_posts
from trend_search import load_app_config

ORIGINALS_DIR = Path(
    os.getenv("MPT_ORIGINALS_DIR", "/home/dev/proyectos/videos-originales")
)
REPORTS_DIR = Path(
    os.getenv("MPT_REPORTS_DIR", "/home/dev/proyectos/trend-reports")
)
PLANS_DIR = Path(os.getenv("MPT_PLANS_DIR", "/home/dev/proyectos/content-plans"))
API_URL = os.getenv("MPT_API_URL", "http://api:8080").rstrip("/")
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}
MAX_CLIP_BYTES = 50 * 1024 * 1024
MAX_IMPORT_BYTES = 200 * 1024 * 1024
MAX_CLIPS_PER_VIDEO = 8
SOCIAL_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
    "tiktok.com",
    "www.tiktok.com",
    "instagram.com",
    "www.instagram.com",
}
OPEN_GENERATIVE_AI_URL = "https://dev.muapi.ai/open-generative-ai"

st.set_page_config(page_title="De tendencia a vídeo", page_icon="✳", layout="wide")
st.markdown(
    """
    <style>
    .trend-hero {
      padding: 1.6rem 1.8rem;
      border-radius: 18px;
      background:
        radial-gradient(ellipse at 90% 0%, rgba(246, 176, 63, .24), transparent 38%),
        linear-gradient(120deg, #142523 0%, #1d3530 66%, #27443a 100%);
      border: 1px solid rgba(233, 218, 185, .22);
      color: #f5f0e5;
      margin-bottom: 1rem;
    }
    .trend-hero .eyebrow {
      font-size: .74rem;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: #f1b751;
      margin-bottom: .55rem;
    }
    .trend-hero h1 {
      color: #fff9ed;
      margin: 0;
      font-size: clamp(1.8rem, 4vw, 3rem);
    }
    .trend-hero p {
      color: #d5ded5;
      max-width: 54rem;
      margin: .6rem 0 0;
    }
    .source-card {
      border-left: 3px solid #edaa3d;
      padding: .15rem 0 .15rem .85rem;
      margin: .7rem 0 1rem;
    }
    </style>
    <section class="trend-hero">
      <div class="eyebrow">Radar · idea · montaje</div>
      <h1>De una señal social a un vídeo propio.</h1>
      <p>Busca publicaciones públicas, detecta su ángulo y patrón de apertura, conviértelo en un guion original
      y móntalo con tus propios clips. Aquí no se descargan ni reutilizan los vídeos de referencia.</p>
    </section>
    """,
    unsafe_allow_html=True,
)

st.warning(
    "ScrapeGraphAI procesa páginas públicas encontradas en buscadores. NVIDIA NIM recibe el texto visible "
    "para resumirlo. No se inicia sesión ni se sortean bloqueos; la búsqueda puede no devolver contenido de "
    "TikTok o Instagram. Los resultados no son rankings oficiales ni garantía de viralidad."
)

with st.form("public-social-search"):
    left, right = st.columns([2, 1])
    with left:
        niche = st.text_input("Nicho o tema", value="inteligencia artificial", max_chars=100)
    with right:
        region = st.text_input("País", value="VE", max_chars=2, help="Venezuela por defecto")
    platforms = st.multiselect(
        "Buscar en redes",
        ["youtube", "tiktok", "instagram"],
        default=["youtube", "tiktok", "instagram"],
        format_func=lambda value: {
            "youtube": "YouTube Shorts",
            "tiktok": "TikTok",
            "instagram": "Instagram Reels",
        }[value],
    )
    limit = st.slider(
        "Candidatos públicos por red",
        min_value=1,
        max_value=3,
        value=1,
        help="Cada página analizada consume una solicitud de NVIDIA NIM. Empieza con un candidato para reducir el uso de cuota.",
    )
    search_submitted = st.form_submit_button("Buscar ideas públicas", type="primary")


def persist_json(directory: Path, stem: str, payload: dict) -> Path:
    safe_stem = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-") or "idea"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / f"{safe_stem}-{stamp}.json"
    destination.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return destination


def mpt_headers() -> dict[str, str]:
    api_key = load_app_config().get("api_key")
    if api_key in (None, ""):
        return {}
    if not isinstance(api_key, str):
        raise ValueError("La clave de autenticación del API de MoneyPrinterTurbo no es válida.")
    return {"x-api-key": api_key}


def api_request(method: str, endpoint: str, **kwargs) -> dict:
    headers = {**mpt_headers(), **kwargs.pop("headers", {})}
    try:
        response = requests.request(
            method,
            f"{API_URL}{endpoint}",
            headers=headers,
            timeout=kwargs.pop("timeout", (10, 120)),
            **kwargs,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.HTTPError as exc:
        detail = ""
        if exc.response is not None:
            try:
                detail = str(exc.response.json().get("message") or exc.response.text[:300])
            except ValueError:
                detail = exc.response.text[:300]
        raise RuntimeError(f"MoneyPrinterTurbo respondió con error: {detail or exc}") from exc
    except requests.RequestException as exc:
        raise RuntimeError("No se pudo conectar con el API local de MoneyPrinterTurbo.") from exc
    except ValueError as exc:
        raise RuntimeError("MoneyPrinterTurbo devolvió una respuesta inválida.") from exc
    if not isinstance(payload, dict) or payload.get("status", 200) != 200:
        message = payload.get("message", "respuesta de API inesperada") if isinstance(payload, dict) else ""
        raise RuntimeError(f"MoneyPrinterTurbo no completó la operación: {message}")
    result = payload.get("data", payload)
    if not isinstance(result, dict):
        raise RuntimeError("MoneyPrinterTurbo devolvió datos incompletos.")
    return result


def source_candidates(report: dict) -> list[dict]:
    platforms_result = report.get("platforms", {})
    return [
        candidate
        for platform_result in platforms_result.values()
        if isinstance(platform_result, dict)
        for candidate in platform_result.get("candidates", [])
        if isinstance(candidate, dict)
    ]


if search_submitted:
    st.session_state.pop("social_scrape_report", None)
    st.session_state.pop("social_scrape_error", None)
    st.session_state.pop("generated_script", None)
    st.session_state.pop("generated_task", None)
    st.session_state.pop("selected_public_candidate", None)
    try:
        with st.spinner("Buscando páginas públicas y leyendo solo los candidatos permitidos…"):
            report = search_public_social_posts(
                niche,
                region=region,
                platforms=platforms,
                limit=limit,
            )
            report_path = persist_json(
                REPORTS_DIR,
                f"scrapegraph-{region}-{niche}",
                report,
            )
    except (ScraperClientError, RuntimeError, ValueError, OSError) as exc:
        st.session_state["social_scrape_error"] = str(exc)
    else:
        report["report_path"] = str(report_path)
        st.session_state["social_scrape_report"] = report

if st.session_state.get("social_scrape_error"):
    st.error(st.session_state["social_scrape_error"])

report = st.session_state.get("social_scrape_report")
candidates = source_candidates(report) if report else []

if report:
    st.caption(
        f"Consulta **{report['niche']}** · país **{report['region']}** · "
        f"guardada en `{report['report_path']}`"
    )
    quota_error = next(
        (
            result.get("message")
            for result in report.get("platforms", {}).values()
            if result.get("error_code") == "nvidia_quota"
        ),
        None,
    )
    if quota_error:
        st.warning(quota_error)
    source_columns = st.columns(len(report.get("platforms", {})) or 1)
    for column, (platform, result) in zip(source_columns, report.get("platforms", {}).items()):
        platform_name = {
            "youtube": "YouTube",
            "tiktok": "TikTok",
            "instagram": "Instagram",
        }.get(platform, platform)
        column.metric(platform_name, f"{len(result.get('candidates', []))} candidatos")
        if result.get("status") == "error" and not quota_error:
            column.caption(result.get("message", "No se pudo leer el contenido público."))
    if not candidates:
        st.info(
            "No hay candidatos verificables para convertir en guion. Las plataformas pueden ocultar "
            "páginas a los buscadores o requerir autenticación; el scraper no intenta saltarse esos límites."
        )
    else:
        labels = [
            f"{candidate.get('platform', '').upper()} · {candidate.get('title', 'Publicación')[:100]}"
            for candidate in candidates
        ]
        selected_index = st.selectbox(
            "Elige una publicación como referencia de tema y estructura",
            range(len(candidates)),
            format_func=lambda index: labels[index],
            key="selected_public_candidate",
        )
        selected = candidates[selected_index]
        st.markdown('<div class="source-card">SEÑAL EDITORIAL · NO COPIAR</div>', unsafe_allow_html=True)
        angle_col, hook_col = st.columns(2)
        angle_col.markdown("**Ángulo observado**")
        angle_col.write(selected.get("trend_angle") or "No disponible")
        hook_col.markdown("**Patrón del gancho (parafraseado)**")
        hook_col.write(selected.get("hook_pattern") or "No disponible")
        if selected.get("caption_summary"):
            st.caption("Resumen de la publicación: " + selected["caption_summary"])
        parsed_source = urlparse(str(selected.get("url") or ""))
        if parsed_source.scheme == "https" and parsed_source.hostname in SOCIAL_HOSTS:
            st.link_button("Abrir publicación de referencia", str(selected["url"]))
        if selected.get("views") is not None:
            st.caption(
                "Contadores visibles en la página (no validados por la API oficial): "
                f"{selected['views']:,} vistas"
            )

        with st.form("generate-original-script"):
            generate_script_submitted = st.form_submit_button(
                "Crear un guion original con MoneyPrinterTurbo",
                type="primary",
            )
        if generate_script_submitted:
            prompt = (
                "Escribe un guion ORIGINAL en español latino para un video vertical de 30 a 45 segundos "
                "(aprox. 75 a 100 palabras). Abre con un gancho fuerte inspirado únicamente en la "
                "estructura abstracta descrita, desarrolla una idea nueva y útil sobre el tema, y termina "
                "con una llamada a la acción natural. No copies ni parafrasees de cerca el título, el "
                "caption, el guion o frases de la publicación de referencia. No inventes datos, cifras ni "
                "promesas. Devuelve solo el texto narrable, sin etiquetas de escena ni hashtags.\n\n"
                f"Tema para el nuevo video: {report['niche']}\n"
                f"Ángulo que se quiere explorar: {selected.get('trend_angle', '')}\n"
                f"Patrón abstracto de apertura: {selected.get('hook_pattern', '')}"
            )
            try:
                with st.spinner("Generando un guion original…"):
                    script_result = api_request(
                        "POST",
                        "/api/v1/scripts",
                        json={
                            "video_subject": report["niche"][:500],
                            "video_language": "Spanish",
                            "paragraph_number": 1,
                            "video_script_prompt": prompt,
                            "custom_system_prompt": (
                                "Escribe contenido original. La publicación de referencia solo aporta "
                                "el tema y un patrón general de atención; no reutilices frases protegidas."
                            ),
                        },
                    )
                generated = str(script_result.get("video_script") or "").strip()
                if not generated:
                    raise RuntimeError("El modelo no devolvió un guion.")
            except (RuntimeError, ValueError, OSError) as exc:
                st.error(f"No se pudo generar el guion: {exc}")
            else:
                st.session_state["generated_script"] = generated
                st.session_state.pop("generated_task", None)

        if st.session_state.get("generated_script"):
            st.subheader("Guion original")
            st.text_area(
                "Revísalo y edítalo antes de generar el vídeo",
                key="generated_script",
                height=220,
            )
            design_profile_id = st.selectbox(
                "Dirección visual del vídeo",
                options=list(DESIGN_PROFILES),
                format_func=lambda profile_id: DESIGN_PROFILES[profile_id]["label"],
                key="remotion_design_profile",
                help="Mantiene una dirección estética y una paleta coherentes en las imágenes Qwen y en los rótulos.",
            )
            design_profile = DESIGN_PROFILES[design_profile_id]
            voiceover = st.file_uploader(
                "Locución propia (opcional para Remotion)",
                type=["mp3", "wav", "m4a", "aac", "ogg"],
                help="La voz se incluye en el paquete de Colab; no se sube al API de MoneyPrinterTurbo.",
                key="remotion_voiceover",
            )
            voiceover_data = voiceover.getvalue() if voiceover else None

            available_videos: list[Path] = []
            if ORIGINALS_DIR.is_dir():
                available_videos = sorted(
                    (
                        path
                        for path in ORIGINALS_DIR.rglob("*")
                        if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS
                    ),
                    key=lambda path: str(path.relative_to(ORIGINALS_DIR)).lower(),
                )
            st.subheader("Tus vídeos originales")
            st.caption(
                "Solo se copian al almacenamiento privado de MoneyPrinterTurbo los clips seleccionados. "
                "No se usan los vídeos descargados de las redes."
            )
            if not available_videos:
                st.warning(
                    f"La carpeta de originales está vacía: `{ORIGINALS_DIR}`. "
                    "Copia allí clips propios y vuelve a cargar esta página."
                )
            else:
                relative_paths = [
                    str(path.relative_to(ORIGINALS_DIR)) for path in available_videos
                ]
                selected_clips = st.multiselect(
                    "Selecciona los clips propios que autorizas para este montaje",
                    relative_paths,
                    max_selections=MAX_CLIPS_PER_VIDEO,
                )
                total_selected_bytes = sum(
                    (ORIGINALS_DIR / item).stat().st_size
                    for item in selected_clips
                    if (ORIGINALS_DIR / item).is_file()
                )
                if total_selected_bytes > MAX_IMPORT_BYTES:
                    st.error("Reduce la selección: el límite de importación por vídeo es 200 MiB.")
                elif selected_clips:
                    st.caption(
                        f"{len(selected_clips)} clips · {total_selected_bytes / (1024 * 1024):.1f} MiB seleccionados"
                    )
                rights_confirmed = st.checkbox(
                    "Confirmo que tengo derecho a usar los clips seleccionados y cualquier audio adjunto."
                )
                export_fingerprint = export_bundle_fingerprint(
                    ORIGINALS_DIR,
                    st.session_state["generated_script"],
                    report["niche"],
                    selected,
                    design_profile_id,
                    selected_clips,
                    voiceover_data,
                )
                saved_export = st.session_state.get("remotion_export_bundle")
                if saved_export and saved_export.get("fingerprint") != export_fingerprint:
                    st.session_state.pop("remotion_export_bundle", None)
                    saved_export = None

                st.markdown("#### Render alternativo en Google Colab")
                st.caption(
                    "Descarga un ZIP con el guion y únicamente los clips que seleccionaste. "
                    f"Dirección visual: **{design_profile['label']}**. "
                    "Súbelo a tu carpeta de entrada en Drive y renderízalo con Qwen-Image + Remotion. "
                    "El ZIP no incluye claves API ni config.toml."
                )
                prepare_export = st.button(
                    "Preparar paquete para Colab",
                    key="prepare_remotion_export",
                    disabled=(
                        not selected_clips
                        or not rights_confirmed
                        or total_selected_bytes > MAX_IMPORT_BYTES
                        or (
                            voiceover_data is not None
                            and len(voiceover_data) > MAX_AUDIO_BYTES
                        )
                    ),
                )
                if prepare_export:
                    try:
                        bundle = create_remotion_export_bundle(
                            ORIGINALS_DIR,
                            st.session_state["generated_script"],
                            report["niche"],
                            selected,
                            design_profile_id,
                            selected_clips,
                            voiceover.name if voiceover else None,
                            voiceover_data,
                        )
                    except (OSError, ValueError) as exc:
                        st.error(f"No se pudo preparar el paquete de Colab: {exc}")
                    else:
                        st.session_state["remotion_export_bundle"] = {
                            "fingerprint": export_fingerprint,
                            "data": bundle,
                        }
                        saved_export = st.session_state["remotion_export_bundle"]
                if saved_export:
                    st.download_button(
                        "Descargar paquete Remotion para Colab",
                        data=saved_export["data"],
                        file_name="remotion-project.zip",
                        mime="application/zip",
                        key="download_remotion_export",
                    )
                with st.expander("Explorar otros modelos de imagen o vídeo"):
                    st.warning(
                        "Este enlace abre un servicio externo. Open Generative AI usa MuAPI para generar "
                        "contenido y puede requerir una cuenta y créditos. No envía automáticamente tu "
                        "guion, clips, archivos ni claves desde MoneyPrinterTurbo."
                    )
                    st.link_button(
                        "Abrir Open Generative AI",
                        OPEN_GENERATIVE_AI_URL,
                    )

                create_video_submitted = st.button(
                    "Montar vídeo vertical con mis clips",
                    type="primary",
                    disabled=(
                        not selected_clips
                        or not rights_confirmed
                        or total_selected_bytes > MAX_IMPORT_BYTES
                    ),
                )
                if create_video_submitted:
                    imported = st.session_state.setdefault("imported_own_clips", {})
                    materials = []
                    failed = False
                    progress = st.progress(0)
                    for index, relative_path in enumerate(selected_clips):
                        source_path = ORIGINALS_DIR / relative_path
                        try:
                            resolved = source_path.resolve(strict=True)
                            resolved.relative_to(ORIGINALS_DIR.resolve(strict=True))
                        except (OSError, ValueError) as exc:
                            st.error(f"Ruta de clip no válida: {relative_path}")
                            failed = True
                            break
                        if resolved.stat().st_size > MAX_CLIP_BYTES:
                            st.error(f"{relative_path} supera el máximo de 50 MiB por clip.")
                            failed = True
                            break
                        cache_key = f"{relative_path}|{resolved.stat().st_size}|{resolved.stat().st_mtime_ns}"
                        stored_name = imported.get(cache_key)
                        if not stored_name:
                            try:
                                with resolved.open("rb") as clip_file:
                                    upload_result = api_request(
                                        "POST",
                                        "/api/v1/video_materials",
                                        files={
                                            "file": (
                                                resolved.name,
                                                clip_file,
                                                mimetypes.guess_type(resolved.name)[0]
                                                or "application/octet-stream",
                                            )
                                        },
                                        timeout=(10, 180),
                                    )
                                stored_name = str(upload_result.get("file") or "")
                                if not stored_name:
                                    raise RuntimeError("MoneyPrinterTurbo no confirmó el clip importado.")
                                imported[cache_key] = stored_name
                            except (OSError, RuntimeError, ValueError) as exc:
                                st.error(f"No se pudo importar {relative_path}: {exc}")
                                failed = True
                                break
                        materials.append(
                            {"provider": "local", "url": stored_name, "duration": 0}
                        )
                        progress.progress((index + 1) / len(selected_clips))

                    if not failed:
                        video_payload = {
                            "video_subject": str(selected.get("trend_angle") or report["niche"])[:500],
                            "video_script": st.session_state["generated_script"],
                            "video_terms": None,
                            "video_aspect": "9:16",
                            "video_fit_mode": "cover",
                            "video_concat_mode": "sequential",
                            "video_clip_duration": 5,
                            "video_clip_speed": 1.0,
                            "match_materials_to_script": False,
                            "video_count": 1,
                            "video_source": "local",
                            "video_materials": materials,
                            "video_language": "Spanish",
                            "subtitle_enabled": True,
                            "bgm_type": "random",
                            "bgm_volume": 0.15,
                        }
                        try:
                            with st.spinner("Encolando el montaje en MoneyPrinterTurbo…"):
                                task = api_request(
                                    "POST",
                                    "/api/v1/videos",
                                    json=video_payload,
                                )
                            task_id = str((task.get("task") or {}).get("task_id") or task.get("task_id") or "")
                            if not task_id:
                                raise RuntimeError("MoneyPrinterTurbo no devolvió el identificador de la tarea.")
                            st.session_state["generated_task"] = task_id
                            plan = {
                                "niche": report["niche"],
                                "region": report["region"],
                                "source_candidate": selected,
                                "script": st.session_state["generated_script"],
                                "own_clips": selected_clips,
                                "video_task_id": task_id,
                                "created_at": datetime.now(timezone.utc).isoformat(),
                            }
                            plan_path = persist_json(
                                PLANS_DIR,
                                f"{report['region']}-{report['niche']}",
                                plan,
                            )
                            st.session_state["generated_plan_path"] = str(plan_path)
                        except (RuntimeError, ValueError, OSError) as exc:
                            st.error(f"No se pudo encolar el vídeo: {exc}")

if st.session_state.get("generated_task"):
    st.success(
        f"Vídeo encolado en MoneyPrinterTurbo. ID de tarea: "
        f"`{st.session_state['generated_task']}`"
    )
    if st.session_state.get("generated_plan_path"):
        st.caption(f"Guion, fuente y clips usados: `{st.session_state['generated_plan_path']}`")
