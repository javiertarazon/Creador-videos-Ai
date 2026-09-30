from __future__ import annotations

import os
from typing import Any

import requests

DEFAULT_SCRAPER_URL = os.getenv("SOCIAL_SCRAPER_URL", "http://scraper:8090")


class ScraperClientError(RuntimeError):
    pass


def search_public_social_posts(
    niche: str,
    *,
    region: str = "VE",
    platforms: list[str] | None = None,
    limit: int = 2,
    base_url: str = DEFAULT_SCRAPER_URL,
) -> dict[str, Any]:
    payload = {
        "niche": niche,
        "region": region,
        "platforms": platforms or ["youtube", "tiktok", "instagram"],
        "limit": limit,
    }
    try:
        response = requests.post(
            f"{base_url.rstrip('/')}/search",
            json=payload,
            timeout=(10, 240),
        )
        response.raise_for_status()
        result = response.json()
    except requests.RequestException as exc:
        raise ScraperClientError(
            "El servicio local ScrapeGraphAI no está disponible. Comprueba el contenedor mpt-scraper."
        ) from exc
    except ValueError as exc:
        raise ScraperClientError("El servicio local ScrapeGraphAI devolvió una respuesta inválida.") from exc
    if not isinstance(result, dict) or not isinstance(result.get("platforms"), dict):
        raise ScraperClientError("El servicio local ScrapeGraphAI devolvió un informe incompleto.")
    return result
