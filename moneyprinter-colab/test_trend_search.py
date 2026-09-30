import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import trend_search


class TrendSearchTests(unittest.TestCase):
    def test_derive_hashtags_for_ai_niche(self):
        self.assertEqual(
            trend_search.derive_hashtags("IA"),
            ["inteligenciaartificial", "ia"],
        )

    def test_normalize_tiktok_includes_public_metrics_and_link(self):
        now = datetime(2026, 9, 28, tzinfo=timezone.utc)
        video = trend_search.normalize_tiktok(
            {
                "id": "123",
                "username": "creator",
                "video_description": "IA en 30 segundos",
                "create_time": int(now.timestamp()) - 3600,
                "region_code": "VE",
                "view_count": 720,
                "like_count": 30,
                "comment_count": 5,
                "share_count": 2,
                "hashtag_names": ["ia"],
                "video_duration": 30,
            },
            now,
        )
        self.assertEqual(video["url"], "https://www.tiktok.com/@creator/video/123")
        self.assertEqual(video["views"], 720)
        self.assertEqual(video["views_per_hour_estimate"], 720)
        self.assertEqual(video["creator_region"], "VE")

    def test_normalize_instagram_does_not_invent_views(self):
        video = trend_search.normalize_instagram(
            {
                "id": "ig123",
                "media_type": "VIDEO",
                "permalink": "https://www.instagram.com/reel/ig123/",
                "like_count": 42,
                "comments_count": 6,
            }
        )
        self.assertIsNone(video["views"])
        self.assertEqual(video["likes"], 42)
        self.assertEqual(video["url"], "https://www.instagram.com/reel/ig123/")

    def test_youtube_query_is_region_and_date_scoped(self):
        now = datetime(2026, 9, 28, tzinfo=timezone.utc)
        search_response = {"items": [{"id": {"videoId": "yt123"}}]}
        details_response = {
            "items": [
                {
                    "id": "yt123",
                    "snippet": {
                        "title": "Una idea sobre IA",
                        "channelTitle": "Canal",
                        "publishedAt": "2026-09-27T00:00:00Z",
                    },
                    "statistics": {"viewCount": "1000", "likeCount": "80"},
                }
            ]
        }
        with patch.object(
            trend_search, "request_json", side_effect=[search_response, details_response]
        ) as request:
            result = trend_search.search_youtube(
                {"youtube_api_key": "dummy-key"}, "IA", "VE", 7, 10, now
            )
        params = parse_qs(urlparse(request.call_args_list[0].args[0]).query)
        self.assertEqual(params["regionCode"], ["VE"])
        self.assertEqual(params["q"], ["IA"])
        self.assertEqual(result["videos"][0]["id"], "yt123")
        self.assertEqual(result["videos"][0]["views"], 1000)

    def test_tiktok_query_uses_research_region_and_success_envelope(self):
        now = datetime(2026, 9, 28, tzinfo=timezone.utc)
        response = {
            "error": {"code": "ok", "message": ""},
            "data": {
                "videos": [
                    {
                        "id": "tt123",
                        "username": "creator",
                        "create_time": int(now.timestamp()) - 7200,
                        "region_code": "VE",
                        "view_count": 600,
                    }
                ],
                "has_more": False,
            },
        }
        with patch.object(trend_search, "_tiktok_access_token", return_value="dummy-token"), patch.object(
            trend_search, "request_json", return_value=response
        ) as request:
            result = trend_search.search_tiktok(
                {
                    "tiktok_research_client_key": "dummy-key",
                    "tiktok_research_client_secret": "dummy-secret",
                },
                "IA",
                "VE",
                7,
                10,
                now,
            )
        body = request.call_args.kwargs["body"].decode("utf-8")
        self.assertIn('"field_name": "region_code"', body)
        self.assertIn('"field_values": ["VE"]', body)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["videos"][0]["views"], 600)

    def test_instagram_top_media_is_hashtag_scoped(self):
        responses = [
            {"data": [{"id": "hashtag123"}]},
            {
                "data": [
                    {
                        "id": "ig123",
                        "media_type": "VIDEO",
                        "permalink": "https://www.instagram.com/reel/ig123/",
                        "like_count": 12,
                        "comments_count": 3,
                    }
                ]
            },
        ]
        with patch.object(trend_search, "request_json", side_effect=responses) as request:
            result = trend_search.search_instagram(
                {
                    "instagram_access_token": "dummy-token",
                    "instagram_user_id": "account123",
                },
                "IA",
                ["inteligenciaartificial"],
                10,
            )
        hashtag_params = parse_qs(urlparse(request.call_args_list[0].args[0]).query)
        self.assertEqual(hashtag_params["q"], ["inteligenciaartificial"])
        self.assertEqual(result["videos"][0]["matched_hashtag"], "inteligenciaartificial")
        self.assertIsNone(result["videos"][0]["views"])

    def test_missing_credentials_produce_explicit_unavailable_sources(self):
        report = trend_search.search_trends(
            "inteligencia artificial",
            region="VE",
            app_config={},
            now=datetime(2026, 9, 28, tzinfo=timezone.utc),
        )
        self.assertEqual(report["overall_status"], "unavailable")
        self.assertEqual(
            {source["status"] for source in report["platforms"].values()},
            {"not_configured"},
        )

    def test_invalid_country_code_is_rejected(self):
        with self.assertRaises(ValueError):
            trend_search.search_trends("IA", region="VEN", app_config={})


if __name__ == "__main__":
    unittest.main()
