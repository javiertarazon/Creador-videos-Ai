import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from zipfile import ZipFile

from remotion_export import (
    create_remotion_export_bundle,
    export_bundle_fingerprint,
)
from design_profiles import DESIGN_PROFILES


class RemotionExportTests(unittest.TestCase):
    def test_bundle_contains_only_selected_assets_and_manifest(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            originals = Path(temporary_dir)
            (originals / "own.mp4").write_bytes(b"own video")
            (originals / "private-config.toml").write_text("secret", encoding="utf-8")
            bundle = create_remotion_export_bundle(
                originals,
                "Guion original.",
                "IA",
                {"platform": "youtube", "url": "https://youtube.com/shorts/public"},
                "tech-utility",
                ["own.mp4"],
                "voice.wav",
                b"audio",
            )

            with ZipFile(__import__("io").BytesIO(bundle)) as archive:
                names = set(archive.namelist())
                manifest = json.loads(archive.read("manifest.json"))

            self.assertIn("public/assets/clips/01-own.mp4", names)
            self.assertIn("public/assets/audio/voiceover.wav", names)
            self.assertNotIn("private-config.toml", names)
            self.assertEqual(manifest["clips"], ["assets/clips/01-own.mp4"])
            self.assertEqual(manifest["voiceover"], "assets/audio/voiceover.wav")
            self.assertEqual(manifest["design_profile_id"], "tech-utility")
            self.assertEqual(
                manifest["design_profile"]["accent"],
                DESIGN_PROFILES["tech-utility"]["accent"],
            )

    def test_export_rejects_paths_that_escape_originals_directory(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            outside = root / "outside.mp4"
            outside.write_bytes(b"not authorized")
            originals = root / "originals"
            originals.mkdir()
            with self.assertRaises(ValueError):
                create_remotion_export_bundle(
                    originals,
                    "Guion",
                    "Nicho",
                    {},
                    "warm-editorial",
                    ["../outside.mp4"],
                    None,
                    None,
                )

    def test_export_rejects_clips_over_the_size_limit(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            originals = Path(temporary_dir)
            (originals / "large.mp4").write_bytes(b"12345")
            with patch("remotion_export.MAX_CLIP_BYTES", 4):
                with self.assertRaisesRegex(ValueError, "50 MiB"):
                    create_remotion_export_bundle(
                        originals,
                        "Guion",
                        "Nicho",
                        {},
                        "warm-editorial",
                        ["large.mp4"],
                        None,
                        None,
                    )

    def test_fingerprint_changes_with_script_or_voiceover(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            clip = root / "clip.mp4"
            clip.write_bytes(b"clip")
            base = export_bundle_fingerprint(
                root, "Guion", "Nicho", {}, "warm-editorial", ["clip.mp4"], None
            )
            self.assertNotEqual(
                base,
                export_bundle_fingerprint(
                    root, "Otro guion", "Nicho", {}, "warm-editorial", ["clip.mp4"], None
                ),
            )
            self.assertNotEqual(
                base,
                export_bundle_fingerprint(
                    root, "Guion", "Nicho", {}, "warm-editorial", ["clip.mp4"], b"voz"
                ),
            )
            self.assertNotEqual(
                base,
                export_bundle_fingerprint(
                    root,
                    "Guion",
                    "Nicho",
                    {"url": "https://youtube.com/shorts/new"},
                    "warm-editorial",
                    ["clip.mp4"],
                    None,
                ),
            )
            self.assertNotEqual(
                base,
                export_bundle_fingerprint(
                    root,
                    "Guion",
                    "Nicho",
                    {},
                    "tech-utility",
                    ["clip.mp4"],
                    None,
                ),
            )

    def test_unknown_visual_profile_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            with self.assertRaisesRegex(ValueError, "Perfil visual desconocido"):
                create_remotion_export_bundle(
                    Path(temporary_dir),
                    "Guion",
                    "Nicho",
                    {},
                    "unknown-style",
                    [],
                    None,
                    None,
                )


if __name__ == "__main__":
    unittest.main()
