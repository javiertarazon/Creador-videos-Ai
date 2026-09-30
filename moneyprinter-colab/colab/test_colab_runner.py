import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from zipfile import ZipFile

from colab_runner import extract_project_bundle, render_bundle, split_script


class ColabRunnerTests(unittest.TestCase):
    def test_split_script_caps_scene_count_and_keeps_content(self):
        script = "Uno. Dos. Tres. Cuatro. Cinco."
        scenes = split_script(script, max_scenes=3)
        self.assertEqual(len(scenes), 3)
        self.assertIn("Uno.", " ".join(scenes))
        self.assertIn("Cinco.", " ".join(scenes))

    def test_extract_valid_bundle(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            bundle = root / "input.zip"
            with ZipFile(bundle, "w") as archive:
                archive.writestr("manifest.json", json.dumps({
                    "schema_version": 1,
                    "design_profile_id": "warm-editorial",
                    "script": "Guion de prueba.",
                    "clips": ["assets/clips/01-clip.mp4"],
                }))
                archive.writestr("public/assets/clips/01-clip.mp4", b"own clip")
            result = extract_project_bundle(bundle, root / "extracted")
            self.assertEqual(result["script"], "Guion de prueba.")

    def test_rejects_zip_slip_path(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            bundle = root / "input.zip"
            with ZipFile(bundle, "w") as archive:
                archive.writestr("../outside.txt", "no")
            with self.assertRaises(ValueError):
                extract_project_bundle(bundle, root / "extracted")

    def test_render_bundle_prepares_remotion_props_and_saves_mp4(self):
        with tempfile.TemporaryDirectory() as temporary_dir:
            root = Path(temporary_dir)
            bundle = root / "input.zip"
            with ZipFile(bundle, "w") as archive:
                archive.writestr("manifest.json", json.dumps({
                    "schema_version": 1,
                    "design_profile_id": "warm-editorial",
                    "title": "Prueba",
                    "niche": "IA",
                    "script": "Primera idea. Segunda idea.",
                    "clips": ["assets/clips/clip.mp4"],
                }))
                archive.writestr("public/assets/clips/clip.mp4", b"own clip")
            template = root / "remotion"
            (template / "src").mkdir(parents=True)
            (template / "public").mkdir()
            (template / "package.json").write_text("{}", encoding="utf-8")
            output_dir = root / "renders"
            captured_props = {}

            def fake_subprocess_run(command, **kwargs):
                if command[:3] == ["npx", "remotion", "render"]:
                    props_argument = next(item for item in command if item.startswith("--props="))
                    captured_props.update(
                        json.loads(Path(props_argument.split("=", 1)[1]).read_text(encoding="utf-8"))
                    )
                    Path(command[5]).write_bytes(b"rendered mp4")

            with patch("colab_runner.subprocess.run", side_effect=fake_subprocess_run):
                rendered = render_bundle(
                    bundle,
                    template,
                    output_dir,
                    generate_images=False,
                )

            self.assertTrue(rendered.is_file())
            self.assertEqual(rendered.read_bytes(), b"rendered mp4")
            self.assertEqual(len(captured_props["scenes"]), 2)
            self.assertEqual(
                captured_props["theme"],
                {
                    "background": "#142523",
                    "foreground": "#fff8eb",
                    "accent": "#f1b751",
                },
            )
            self.assertAlmostEqual(
                sum(scene["durationSeconds"] for scene in captured_props["scenes"]),
                20.0,
            )
            self.assertEqual(captured_props["scenes"][0]["clip"], "assets/clips/clip.mp4")


if __name__ == "__main__":
    unittest.main()
