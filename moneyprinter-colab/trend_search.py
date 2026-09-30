#!/usr/bin/env python3
"""Search public video trends through the official YouTube, TikTok and Instagram APIs."""
from __future__ import annotations

import argparse
import json
import os
import re
import tomllib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

CONFIG_PATH = Path(
    os.getenv("MPT_CONFIG_PATH", "/home/dev/proyectos/MoneyPrinterTurbo/config.toml")
)
REPORTS_DIR = Path(os.getenv("MPT_REPORTS_DIR", "/home/dev/proyectos/trend-reports"))
YOUTUBE_API = "https://www.googleapis.com/youtube/v3"
TIKTOK_API = "https://open.tiktokapis.com/v2"
INSTAGRAM_API = "https://graph.facebook.com"
VIDEO_FIELDS = (
    "id,video_description,create_time,username,region_code,like_count,"
    "comment_count,share_count,view_count,hashtag_names,video_duration"
)
TIKTOK_DELAY_DAYS = 2


class ProviderError(Exception):
    """An API returned an invalid response or could not be reached."""


def _response_error(payload: dict[str, Any]) -> str | None:
    error = payload.get("error")
    if not error:
        return None
    if isinstance(error, dict):
        code = str(error.get("code") or "").lower()
        if code in {"ok", "0"}:
            return None
        message = error.get("message") or error.get("error_description") or error.get("code")
        return str(message or error)
    return str(error)


def request_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
) -> dict[str, Any]:
    request = Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        try:
            detail = exc.read().decode("utf-8", errors="replace")
        except OSError:
            detail = ""
        try:
            error_payload = json.loads(detail) if detail else {}
        except json.JSONDecodeError:
            error_payload = {}
        message = _response_error(error_payload) or detail[:400] or "sin detalle"
        raise ProviderError(f"HTTP {exc.code}: {message}") from exc
    except (URLError, TimeoutError) as exc:
        raise ProviderError(f"error de conexión: {exc.reason if isinstance(exc, URLError) else exc}") from exc
    except json.JSONDecodeError as exc:
        raise ProviderError("la API no devolvió JSON válido") from exc

    if not isinstance(payload, dict):
        raise ProviderError("la API devolvió una respuesta JSON inesperada")
    message = _response_error(payload)
    if message:
        raise ProviderError(message)
    return payload


def load_app_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        with path.open("rb") as config_file:
            config = tomllib.load(config_file)
    except (OSError, tomllib.TOMLDecodeError) as exc:
        raise ProviderError(f"No se pudo leer la configuración de MoneyPrinterTurbo: {exc}") from exc
    app = config.get("app", {})
    if not isinstance(app, dict):
        raise ProviderError("La sección [app] de config.toml no es válida")
    return app


def derive_hashtags(niche: str) -> list[str]:
    normalized = re.sub(r"[^a-z0-9]", "", niche.lower())
    if normalized in {"ia", "ai", "inteligenciaartificial"}:
        return ["inteligenciaartificial", "ia"]
    return [normalized] if normalized else []


def _count(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def _iso_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _views_per_hour(views: int, published: datetime | None, now: datetime) -> float | None:
    if published is None:
        return None
    age_hours = max((now - published).total_seconds() / 3600, 1)
    return round(views / age_hours, 2)


def normalize_youtube(item: dict[str, Any], now: datetime) -> dict[str, Any]:
    snippet = item.get("snippet") or {}
    statistics = item.get("statistics") or {}
    video_id = item.get("id") or ""
    published = _iso_datetime(snippet.get("publishedAt"))
    views = _count(statistics.get("viewCount"))
    return {
        "id": video_id,
        "title": snippet.get("title") or "(sin título)",
        "description": snippet.get("description") or "",
        "creator": snippet.get("channelTitle") or "",
        "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
        "published_at": published.isoformat() if published else None,
        "views": views,
        "likes": _count(statistics.get("likeCount")),
        "comments": _count(statistics.get("commentCount")),
        "shares": None,
        "views_per_hour_estimate": _views_per_hour(views, published, now),
        "hashtags": [],
    }


def normalize_tiktok(item: dict[str, Any], now: datetime) -> dict[str, Any]:
    video_id = str(item.get("id") or "")
    username = str(item.get("username") or "")
    try:
        published = datetime.fromtimestamp(int(item["create_time"]), timezone.utc)
    except (KeyError, TypeError, ValueError, OSError):
        published = None
    views = _count(item.get("view_count"))
    return {
        "id": video_id,
        "title": item.get("video_description") or "(sin descripción)",
        "description": item.get("video_description") or "",
        "creator": username,
        "url": f"https://www.tiktok.com/@{username}/video/{video_id}" if username and video_id else "",
        "published_at": published.isoformat() if published else None,
        "creator_region": item.get("region_code"),
        "views": views,
        "likes": _count(item.get("like_count")),
        "comments": _count(item.get("comment_count")),
        "shares": _count(item.get("share_count")),
        "views_per_hour_estimate": _views_per_hour(views, published, now),
        "hashtags": item.get("hashtag_names") or [],
        "duration_seconds": _count(item.get("video_duration")),
    }


def normalize_instagram(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("id") or "",
        "title": item.get("caption") or "(sin descripción)",
        "description": item.get("caption") or "",
        "creator": "",
        "url": item.get("permalink") or "",
        "published_at": item.get("timestamp"),
        "views": None,
        "likes": _count(item.get("like_count")),
        "comments": _count(item.get("comments_count")),
        "shares": None,
        "views_per_hour_estimate": None,
        "hashtags": [],
    }


def _status(
    platform: str,
    state: str,
    *,
    videos: list[dict[str, Any]] | None = None,
    message: str | None = None,
    method: str = "",
) -> dict[str, Any]:
    items = videos or []
    result: dict[str, Any] = {
        "platform": platform,
        "status": state,
        "count": len(items),
        "method": method,
        "videos": items,
    }
    if message:
        result["message"] = message
    return result


def search_youtube(
    app: dict[str, Any], niche: str, region: str, days: int, limit: int, now: datetime
) -> dict[str, Any]:
    api_key = str(app.get("youtube_api_key") or "").strip()
    if not api_key:
        return _status("youtube", "not_configured", message="Añade youtube_api_key en [app] de config.toml.")

    published_after = (now - timedelta(days=days)).isoformat(timespec="seconds").replace("+00:00", "Z")
    search_params = {
        'part': 'snippet',
        'type': 'video',
        'q': niche,
        'regionCode': region,
        'publishedAfter': published_after,
        'order': 'viewCount',
        'key': api_key,
    }
    try:
        ids: list[str] = []
        page_token = ""
        while len(ids) < limit:
            params = {
                **search_params,
                "maxResults": min(limit - len(ids), 50),
            }
            if page_token:
                params["pageToken"] = page_token
            search_result = request_json(f"{YOUTUBE_API}/search?{urlencode(params)}")
            ids.extend(
                str((item.get("id") or {}).get("videoId") or "")
                for item in search_result.get("items", [])
            )
            ids = [video_id for video_id in ids if video_id]
            page_token = str(search_result.get("nextPageToken") or "")
            if not page_token:
                break
        if not ids:
            return _status(
                "youtube", "ok", message="La búsqueda no devolvió vídeos en el periodo indicado.",
                method="YouTube Data API v3; búsqueda regional reciente ordenada por visualizaciones.",
            )
        details_params = {
            'part': 'snippet,statistics',
            'id': ','.join(ids),
            'key': api_key,
        }
        details = request_json(f"{YOUTUBE_API}/videos?{urlencode(details_params)}")
    except ProviderError as exc:
        return _status("youtube", "error", message=str(exc))

    videos = [normalize_youtube(item, now) for item in details.get("items", [])]
    videos.sort(key=lambda video: video["views_per_hour_estimate"] or 0, reverse=True)
    return _status(
        "youtube", "ok", videos=videos,
        method="YouTube Data API v3; búsqueda por nicho, país y fecha, ordenada por vistas y luego por "
        "vistas/hora estimadas. La velocidad usa vistas acumuladas, no crecimiento medido.",
    )


def _tiktok_access_token(app: dict[str, Any]) -> str:
    client_key = str(app.get("tiktok_research_client_key") or "").strip()
    client_secret = str(app.get("tiktok_research_client_secret") or "").strip()
    if not client_key or not client_secret:
        raise ProviderError(
            "Faltan tiktok_research_client_key y tiktok_research_client_secret en [app] de config.toml. "
            "La cuenta de Research API también debe estar aprobada por TikTok."
        )
    body = urlencode({
        "client_key": client_key,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    }).encode("utf-8")
    response = request_json(
        f"{TIKTOK_API}/oauth/token/",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=body,
    )
    token = response.get("access_token")
    if not token:
        raise ProviderError("TikTok no devolvió access_token para Research API")
    return str(token)


def search_tiktok(
    app: dict[str, Any], niche: str, region: str, days: int, limit: int, now: datetime
) -> dict[str, Any]:
    if not app.get("tiktok_research_client_key") or not app.get("tiktok_research_client_secret"):
        return _status(
            "tiktok", "not_configured",
            message=(
                "Faltan tiktok_research_client_key y tiktok_research_client_secret en [app] de config.toml. "
                "TikTok debe aprobar la cuenta y el proyecto para Research API."
            ),
        )
    try:
        token = _tiktok_access_token(app)
        end_date = now.date() - timedelta(days=TIKTOK_DELAY_DAYS)
        start_date = end_date - timedelta(days=days - 1)
        query = {
            "and": [
                {"operation": "EQ", "field_name": "keyword", "field_values": [niche]},
                {"operation": "EQ", "field_name": "region_code", "field_values": [region]},
            ]
        }
        videos: list[dict[str, Any]] = []
        cursor: int | None = None
        search_id: str | None = None
        seen_cursors: set[int] = set()
        while len(videos) < limit:
            request_body: dict[str, Any] = {
                "query": query,
                "start_date": start_date.strftime("%Y%m%d"),
                "end_date": end_date.strftime("%Y%m%d"),
                "max_count": min(100, limit - len(videos)),
            }
            if cursor is not None:
                request_body["cursor"] = cursor
            if search_id:
                request_body["search_id"] = search_id
            fields = urlencode({"fields": VIDEO_FIELDS})
            url = f"{TIKTOK_API}/research/video/query/?{fields}"
            response = request_json(
                url,
                method="POST",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                body=json.dumps(request_body).encode("utf-8"),
            )
            data = response.get("data") or {}
            if not isinstance(data, dict):
                raise ProviderError("TikTok devolvió una sección data inesperada")
            videos.extend(
                normalize_tiktok(item, now)
                for item in data.get("videos", [])
                if isinstance(item, dict)
            )
            next_cursor = data.get("cursor")
            search_id = data.get("search_id") or search_id
            if not data.get("has_more") or not isinstance(next_cursor, int) or next_cursor in seen_cursors:
                break
            seen_cursors.add(next_cursor)
            cursor = next_cursor
    except ProviderError as exc:
        return _status("tiktok", "error", message=str(exc))

    videos.sort(key=lambda video: video["views_per_hour_estimate"] or 0, reverse=True)
    return _status(
        "tiktok", "ok", videos=videos,
        method=(
            f"TikTok Research API; región del creador {region}; fechas {start_date:%Y-%m-%d} a "
            f"{end_date:%Y-%m-%d}. La API puede tardar hasta 48 h en indexar vídeos y hasta 10 días "
            "en actualizar métricas. Velocidad estimada, no crecimiento medido."
        ),
    )


def search_instagram(
    app: dict[str, Any], niche: str, hashtags: list[str], limit: int
) -> dict[str, Any]:
    token = str(app.get("instagram_access_token") or "").strip()
    user_id = str(app.get("instagram_user_id") or "").strip()
    if not token or not user_id:
        return _status(
            "instagram", "not_configured",
            message="Añade instagram_access_token e instagram_user_id en [app] de config.toml.",
        )
    version = str(app.get("instagram_graph_version") or "v25.0").strip()
    if not re.fullmatch(r"v\d+\.\d+", version):
        return _status("instagram", "error", message="instagram_graph_version debe tener formato vN.N.")
    if not hashtags:
        hashtags = derive_hashtags(niche)
    if not hashtags:
        return _status("instagram", "error", message="Indica al menos un hashtag.")
    if len(set(hashtags)) > 30:
        return _status("instagram", "error", message="Instagram limita a 30 hashtags únicos por cuenta cada 7 días.")

    videos: list[dict[str, Any]] = []
    try:
        for hashtag in dict.fromkeys(tag.lower().lstrip("#") for tag in hashtags):
            if len(videos) >= limit:
                break
            if not hashtag:
                continue
            base = f"{INSTAGRAM_API}/{version}"
            hashtag_params = {"user_id": user_id, "q": hashtag, "access_token": token}
            hashtag_result = request_json(
                f"{base}/ig_hashtag_search?{urlencode(hashtag_params)}"
            )
            hashtag_items = hashtag_result.get("data") or []
            if not hashtag_items:
                continue
            hashtag_id = hashtag_items[0].get("id")
            if not hashtag_id:
                continue
            after: str | None = None
            scanned = 0
            while scanned < limit:
                media_params = {
                    "user_id": user_id,
                    "fields": "id,media_type,permalink,timestamp,caption,like_count,comments_count",
                    "limit": min(limit - scanned, 50),
                    "access_token": token,
                }
                if after:
                    media_params["after"] = after
                media_result = request_json(f"{base}/{hashtag_id}/top_media?{urlencode(media_params)}")
                media_items = media_result.get("data") or []
                if not isinstance(media_items, list):
                    raise ProviderError("Instagram devolvió una lista de medios inesperada")
                scanned += len(media_items)
                videos.extend(
                    {
                        **normalize_instagram(item),
                        "matched_hashtag": hashtag,
                    }
                    for item in media_items
                    if isinstance(item, dict) and item.get("media_type") in {"VIDEO", "REELS"}
                )
                paging = media_result.get("paging") or {}
                cursors = paging.get("cursors") or {}
                next_after = cursors.get("after")
                if not next_after or next_after == after or not paging.get("next"):
                    break
                after = str(next_after)
    except ProviderError as exc:
        return _status("instagram", "error", message=str(exc))

    unique: dict[str, dict[str, Any]] = {}
    for video in videos:
        unique.setdefault(str(video["id"]), video)
    return _status(
        "instagram", "ok", videos=list(unique.values())[:limit],
        method=(
            "Instagram Graph API top_media por hashtag. No expone vistas ni filtro regional; "
            "se conserva el orden de popularidad de Meta."
        ),
    )


def search_trends(
    niche: str,
    *,
    region: str = "VE",
    days: int = 7,
    limit: int = 25,
    platforms: tuple[str, ...] = ("youtube", "tiktok", "instagram"),
    hashtags: list[str] | None = None,
    app_config: dict[str, Any] | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    niche = niche.strip()
    region = region.strip().upper()
    if not niche:
        raise ValueError("El nicho no puede estar vacío")
    if not re.fullmatch(r"[A-Z]{2}", region):
        raise ValueError("La región debe ser un código de país de dos letras, por ejemplo VE")
    if not 1 <= days <= 30:
        raise ValueError("El periodo debe estar entre 1 y 30 días")
    if not 1 <= limit <= 100:
        raise ValueError("El límite debe estar entre 1 y 100 vídeos por plataforma")
    if not platforms:
        raise ValueError("Selecciona al menos una plataforma")
    supported = {"youtube", "tiktok", "instagram"}
    unknown = set(platforms) - supported
    if unknown:
        raise ValueError(f"Plataformas no admitidas: {', '.join(sorted(unknown))}")

    app = app_config if app_config is not None else load_app_config()
    timestamp = now or datetime.now(timezone.utc)
    selected: dict[str, dict[str, Any]] = {}
    if "youtube" in platforms:
        selected["youtube"] = search_youtube(app, niche, region, days, limit, timestamp)
    if "tiktok" in platforms:
        selected["tiktok"] = search_tiktok(app, niche, region, days, limit, timestamp)
    if "instagram" in platforms:
        selected["instagram"] = search_instagram(app, niche, hashtags or [], limit)
    successful = sum(source["status"] == "ok" for source in selected.values())
    overall = "ok" if successful == len(selected) else "partial" if successful else "unavailable"
    return {
        "query": niche,
        "region": region,
        "period_days": days,
        "created_at": timestamp.isoformat(),
        "overall_status": overall,
        "platforms": selected,
        "limitations": [
            "No existe una puntuación de viralidad comparable entre plataformas.",
            "Las estimaciones de visualizaciones por hora usan vistas acumuladas; no miden crecimiento entre dos capturas.",
            "TikTok Research API exige aprobación y tiene retraso de publicación y métricas.",
            "La API de hashtags de Instagram no ofrece filtro por país ni vistas en top_media.",
        ],
    }


def save_report(report: dict[str, Any], directory: Path = REPORTS_DIR) -> Path:
    slug = re.sub(r"[^a-z0-9]+", "-", report["query"].lower()).strip("-") or "tendencias"
    created = datetime.fromisoformat(report["created_at"]).astimezone(timezone.utc)
    stamp = created.strftime("%Y%m%dT%H%M%SZ")
    output = directory / f"{slug}-{report['region'].lower()}-{stamp}.json"
    directory.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Busca vídeos públicos por tendencias en APIs oficiales.")
    parser.add_argument("niche", help="Tema o nicho (por ejemplo: inteligencia artificial)")
    parser.add_argument("--region", default="VE", help="Código de país de dos letras; por defecto VE")
    parser.add_argument("--days", type=int, default=7, help="Ventana de búsqueda, de 1 a 30 días")
    parser.add_argument("--limit", type=int, default=25, help="Máximo de vídeos por plataforma, de 1 a 100")
    parser.add_argument(
        "--platform", dest="platforms", action="append", choices=["youtube", "tiktok", "instagram"],
        help="Plataforma a consultar (se puede repetir; por defecto todas)",
    )
    parser.add_argument("--hashtag", dest="hashtags", action="append", help="Hashtag de Instagram; se puede repetir")
    args = parser.parse_args()
    try:
        report = search_trends(
            args.niche,
            region=args.region,
            days=args.days,
            limit=args.limit,
            platforms=tuple(args.platforms or ("youtube", "tiktok", "instagram")),
            hashtags=args.hashtags,
        )
        output = save_report(report)
    except (ProviderError, ValueError, OSError) as exc:
        parser.exit(2, f"Error: {exc}\n")
    print(f"estado={report['overall_status']} informe={output}")
    for name, source in report["platforms"].items():
        message = source.get("message", source.get("method", ""))
        print(f"{name}: {source['status']} ({source['count']} vídeos){'; ' + message if message else ''}")
    return 0 if report["overall_status"] == "ok" else 2


if __name__ == "__main__":
    raise SystemExit(main())
