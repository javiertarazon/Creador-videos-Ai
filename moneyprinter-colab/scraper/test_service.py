from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from pydantic import ValidationError

import service


class FakeSearchClient:
    def __init__(self):
        self.query = None
        self.max_results = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def text(self, query, **kwargs):
        self.query = query
        self.max_results = kwargs["max_results"]
        return [
            {"href": "https://www.youtube.com/shorts/abc123", "title": "Vídeo público"},
            {"href": "https://example.com/video", "title": "Sitio ajeno"},
        ]


class FakeExtracted:
    def __init__(self):
        self.title = "Vídeo público de IA"
        self.trend_angle = "Demostración rápida de una herramienta de IA"
        self.hook_pattern = "Abrir con una pregunta que plantea un resultado inesperado"
        self.creator = "Canal público"
        self.published_at = None
        self.caption_summary = "Prueba una herramienta de IA"
        self.views = None
        self.likes = None
        self.comments = None

    def model_dump(self):
        return {
            "title": self.title,
            "creator": self.creator,
            "published_at": self.published_at,
            "caption_summary": self.caption_summary,
            "trend_angle": self.trend_angle,
            "hook_pattern": self.hook_pattern,
            "views": self.views,
            "likes": self.likes,
            "comments": self.comments,
        }


class ScrapeGraphServiceTests(unittest.TestCase):
    def test_public_url_filter_rejects_non_social_and_login_urls(self):
        self.assertEqual(
            service.normalize_public_video_url(
                "https://www.youtube.com/shorts/abc123?feature=share", "youtube"
            ),
            "https://www.youtube.com/shorts/abc123",
        )
        self.assertIsNone(
            service.normalize_public_video_url("https://example.com/video", "youtube")
        )
        self.assertIsNone(
            service.normalize_public_video_url(
                "https://www.tiktok.com/login", "tiktok"
            )
        )
        self.assertIsNone(
            service.normalize_public_video_url(
                "https://www.instagram.com/accounts/login/", "instagram"
            )
        )

    def test_search_filters_discovered_urls_and_returns_source_provenance(self):
        search_instance = FakeSearchClient()

        class FakeSearchProvider:
            def __new__(cls):
                return search_instance

        with patch.object(
            service,
            "_load_nvidia_config",
            return_value=("https://integrate.api.nvidia.com/v1", "key", "model"),
        ):
            response = service.search_public_posts(
                service.SearchRequest(niche="IA", platforms=["youtube"]),
                search_provider=FakeSearchProvider,
                extract_page=lambda *_: FakeExtracted(),
            )
        self.assertEqual(response.status, "ok")
        self.assertEqual(response.platforms["youtube"].candidates[0].url.host, "www.youtube.com")
        self.assertIn("site:youtube.com/shorts", search_instance.query)
        self.assertEqual(search_instance.max_results, 6)

    def test_search_configuration_failure_is_not_hidden(self):
        with patch.object(
            service, "_load_nvidia_config", side_effect=RuntimeError("missing config")
        ):
            with self.assertRaises(RuntimeError):
                service.search_public_posts(
                    service.SearchRequest(niche="IA", platforms=["youtube"])
                )

    def test_nvidia_quota_exhaustion_stops_remaining_page_and_platform_calls(self):
        search_instance = FakeSearchClient()
        extract_calls = []

        class FakeSearchProvider:
            def __new__(cls):
                return search_instance

        def extract_page(_url, platform, *_):
            extract_calls.append(platform)
            raise RuntimeError("429 RESOURCE_EXHAUSTED: quota exceeded")

        with patch.object(
            service,
            "_load_nvidia_config",
            return_value=("https://integrate.api.nvidia.com/v1", "key", "model"),
        ):
            response = service.search_public_posts(
                service.SearchRequest(
                    niche="IA",
                    platforms=["youtube", "instagram"],
                    limit=2,
                ),
                search_provider=FakeSearchProvider,
                extract_page=extract_page,
            )

        self.assertEqual(extract_calls, ["youtube"])
        self.assertEqual(response.status, "unavailable")
        for platform in ("youtube", "instagram"):
            result = response.platforms[platform]
            self.assertEqual(result.error_code, "nvidia_quota")
            self.assertIn("cuota", result.message.lower())

    def test_nvidia_config_loads_only_the_dedicated_secret(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "nvidia-scraper.toml"
            config_path.write_text(
                '[nvidia]\nbase_url = "https://integrate.api.nvidia.com/v1"\n'
                'api_key = "isolated-key"\nmodel = "vendor/model"\n',
                encoding="utf-8",
            )
            self.assertEqual(
                service._load_nvidia_config(config_path),
                (
                    "https://integrate.api.nvidia.com/v1",
                    "isolated-key",
                    "vendor/model",
                ),
            )

    def test_nvidia_config_rejects_non_nvidia_endpoint(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "nvidia-scraper.toml"
            config_path.write_text(
                '[nvidia]\nbase_url = "https://attacker.example/v1"\n'
                'api_key = "isolated-key"\nmodel = "vendor/model"\n',
                encoding="utf-8",
            )
            with self.assertRaisesRegex(RuntimeError, "endpoint HTTPS oficial"):
                service._load_nvidia_config(config_path)

    def test_page_extraction_uses_nvidia_openai_compatible_endpoint(self):
        captured = {}

        class FakeGraph:
            def __init__(self, *, prompt, source, config, schema):
                captured.update(config=config, schema=schema)

            def run(self):
                return {
                    "title": "Vídeo público",
                    "trend_angle": "Una demostración breve",
                    "hook_pattern": "Abrir con una pregunta",
                }

        with patch.object(service, "SmartScraperGraph", FakeGraph):
            service._extract_public_page(
                "https://www.youtube.com/shorts/abc123",
                "youtube",
                "https://integrate.api.nvidia.com/v1",
                "isolated-key",
                "vendor/model",
            )

        llm_config = captured["config"]["llm"]
        self.assertEqual(llm_config["model"], "openai/vendor/model")
        self.assertEqual(llm_config["base_url"], "https://integrate.api.nvidia.com/v1")
        self.assertEqual(llm_config["api_key"], "isolated-key")
        self.assertIs(captured["schema"], service.CandidateSchema)

    def test_invalid_search_limits_are_rejected(self):
        with self.assertRaises(ValidationError):
            service.SearchRequest(niche="IA", platforms=["youtube"], limit=20)


if __name__ == "__main__":
    unittest.main()
