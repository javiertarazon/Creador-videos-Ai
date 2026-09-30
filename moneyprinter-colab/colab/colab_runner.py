from __future__ import annotations

import json
import re
import shutil
import stat
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from zipfile import ZipFile

from design_profiles import get_design_profile

MAX_BUNDLE_BYTES = 700 * 1024 * 1024
MAX_SCENES = 6
IMAGE_MODEL_ID = "Qwen/Qwen-Image-2.1"


def split_script(script: str, max_scenes: int = MAX_SCENES) -> list[str]:
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", script.strip())
        if sentence.strip()
    ]
    if not sentences and script.strip():
        sentences = [script.strip()]
    if not sentences:
        raise ValueError("El manifiesto no contiene un guion.")
    if len(sentences) <= max_scenes:
        return sentences

    groups: list[list[str]] = [[] for _ in range(max_scenes)]
    for index, sentence in enumerate(sentences):
        groups[min(index * max_scenes // len(sentences), max_scenes - 1)].append(sentence)
    return [" ".join(group) for group in groups if group]


def _safe_archive_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
        raise ValueError(f"Ruta no permitida en el paquete: {name}")
    if "\\" in name or ":" in name:
        raise ValueError(f"Ruta no permitida en el paquete: {name}")
    return path


def extract_project_bundle(bundle_path: Path, destination: Path) -> dict[str, Any]:
    with ZipFile(bundle_path) as archive:
        entries = archive.infolist()
        total_size = sum(entry.file_size for entry in entries)
        if total_size > MAX_BUNDLE_BYTES:
            raise ValueError("El paquete supera el máximo de 700 MiB.")

        for entry in entries:
            _safe_archive_path(entry.filename)
            mode = entry.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise ValueError("El paquete contiene un enlace simbólico no permitido.")
        if archive.testzip() is not None:
            raise ValueError("El ZIP contiene un archivo dañado.")

        destination.mkdir(parents=True, exist_ok=True)
        for entry in entries:
            archive.extract(entry, destination)

    manifest_path = destination / "manifest.json"
    if not manifest_path.is_file():
        raise ValueError("El paquete no contiene manifest.json.")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict) or manifest.get("schema_version") != 1:
        raise ValueError("La versión del manifiesto no es compatible.")
    if not isinstance(manifest.get("script"), str) or not manifest["script"].strip():
        raise ValueError("El manifiesto no contiene un guion.")
    if not isinstance(manifest.get("clips"), list):
        raise ValueError("La lista de clips del manifiesto no es válida.")
    design_profile_id = manifest.get("design_profile_id")
    if not isinstance(design_profile_id, str):
        raise ValueError("El manifiesto no contiene una dirección visual válida.")
    manifest["design_profile"] = get_design_profile(design_profile_id)

    assets_root = (destination / "public" / "assets").resolve()
    for relative_path in manifest["clips"]:
        _validate_asset_path(relative_path, assets_root)
    if manifest.get("voiceover"):
        _validate_asset_path(manifest["voiceover"], assets_root)
    return manifest


def _validate_asset_path(relative_path: Any, assets_root: Path) -> Path:
    if not isinstance(relative_path, str):
        raise ValueError("La ruta de un recurso del manifiesto no es válida.")
    path = _safe_archive_path(relative_path)
    if path.parts[:1] != ("assets",):
        raise ValueError("Los recursos deben estar dentro de assets/.")
    resolved = (assets_root.parent / Path(*path.parts)).resolve(strict=True)
    resolved.relative_to(assets_root)
    if not resolved.is_file():
        raise ValueError(f"No se encontró el recurso: {relative_path}")
    return resolved


def generate_qwen_images(
    prompts: list[str],
    output_dir: Path,
    model_id: str = IMAGE_MODEL_ID,
) -> list[str]:
    import torch
    from diffusers import QwenImage21Pipeline

    if not torch.cuda.is_available():
        raise RuntimeError(
            "No hay GPU CUDA activa. En Colab selecciona Entorno de ejecución > Cambiar tipo de entorno > GPU."
        )

    gpu = torch.cuda.get_device_properties(0)
    print(f"GPU: {gpu.name} · VRAM: {gpu.total_memory / (1024 ** 3):.1f} GiB")
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    pipeline = QwenImage21Pipeline.from_pretrained(model_id, torch_dtype=dtype)
    pipeline.enable_model_cpu_offload()

    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for index, prompt in enumerate(prompts, start=1):
        output_path = output_dir / f"scene-{index:02d}.png"
        try:
            image = pipeline(
                prompt=prompt,
                width=1024,
                height=1824,
                num_inference_steps=30,
                generator=torch.Generator(device="cuda").manual_seed(20260929 + index),
            ).images[0]
        except RuntimeError as exc:
            if "out of memory" in str(exc).lower():
                raise RuntimeError(
                    "Qwen-Image agotó la memoria de la GPU. Prueba un runtime con más VRAM o "
                    "reduce la resolución/número de escenas en colab_runner.py."
                ) from exc
            raise
        image.save(output_path)
        results.append(output_path.name)
        del image
        torch.cuda.empty_cache()

    del pipeline
    torch.cuda.empty_cache()
    return results


def _voiceover_duration_seconds(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    try:
        duration = float(result.stdout.strip())
    except ValueError as exc:
        raise RuntimeError("ffprobe no pudo determinar la duración de la locución.") from exc
    if duration <= 0:
        raise RuntimeError("La duración de la locución debe ser mayor que cero.")
    return duration


def render_bundle(
    bundle_path: Path,
    project_template: Path,
    output_dir: Path,
    *,
    generate_images: bool = True,
    model_id: str = IMAGE_MODEL_ID,
) -> Path:
    if not bundle_path.is_file():
        raise FileNotFoundError(f"No se encontró el paquete de entrada: {bundle_path}")
    if bundle_path.stat().st_size > MAX_BUNDLE_BYTES:
        raise ValueError("El ZIP de entrada supera el límite de 700 MiB.")
    if not project_template.is_dir():
        raise FileNotFoundError(f"No se encontró el proyecto Remotion: {project_template}")

    with tempfile.TemporaryDirectory(prefix="mpt-remotion-") as temporary_dir:
        work_dir = Path(temporary_dir)
        extracted_dir = work_dir / "input"
        manifest = extract_project_bundle(bundle_path, extracted_dir)
        design_profile = manifest["design_profile"]
        project_dir = work_dir / "remotion"
        shutil.copytree(project_template, project_dir)
        public_dir = project_dir / "public"
        input_assets = extracted_dir / "public" / "assets"
        if input_assets.is_dir():
            shutil.copytree(input_assets, public_dir / "assets", dirs_exist_ok=True)

        sentences = split_script(manifest["script"])
        generated_images: list[str] = []
        if generate_images:
            image_prompts = [
                (
                    "Create a cinematic vertical 9:16 visual for a Spanish social video. "
                    f"{design_profile['description']} "
                    "No text, captions, letters, logos, watermarks, or UI. Story idea: "
                    f"{manifest.get('niche', manifest.get('title', ''))}. Scene: {sentence}"
                )
                for sentence in sentences
            ]
            generated_names = generate_qwen_images(
                image_prompts,
                public_dir / "assets" / "generated",
                model_id,
            )
            generated_images = [
                f"assets/generated/{name}" for name in generated_names
            ]

        clip_paths = [
            str(_validate_asset_path(item, (extracted_dir / "public" / "assets").resolve()))
            for item in manifest["clips"]
        ]
        voiceover_path = None
        if manifest.get("voiceover"):
            voiceover_path = _validate_asset_path(
                manifest["voiceover"],
                (extracted_dir / "public" / "assets").resolve(),
            )
        if not generated_images and not clip_paths:
            raise ValueError("El proyecto necesita al menos un clip propio o imágenes Qwen.")

        scene_weights = [max(1, len(sentence.split())) for sentence in sentences]
        total_duration = max(
            20.0,
            min(45.0, sum(scene_weights) / 2.7),
        )
        if voiceover_path:
            total_duration = _voiceover_duration_seconds(voiceover_path)
        scenes = []
        for index, sentence in enumerate(sentences):
            scenes.append(
                {
                    "text": sentence,
                    "durationSeconds": total_duration * scene_weights[index] / sum(scene_weights),
                    "image": generated_images[index] if generated_images else None,
                    "clip": (
                        manifest["clips"][index % len(manifest["clips"])]
                        if manifest["clips"]
                        else None
                    ),
                }
            )

        props = {
            "title": str(manifest.get("title") or manifest.get("niche") or "Una idea para recordar")[:72],
            "theme": {
                key: design_profile[key]
                for key in ("background", "foreground", "accent")
            },
            "scenes": scenes,
            "voiceover": (
                str(voiceover_path.relative_to(extracted_dir / "public"))
                if voiceover_path
                else None
            ),
        }
        props_path = project_dir / "props.json"
        props_path.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
        subprocess.run(
            ["npm", "install", "--no-audit", "--no-fund"],
            cwd=project_dir,
            check=True,
        )
        subprocess.run(
            ["npx", "remotion", "browser", "ensure"],
            cwd=project_dir,
            check=True,
        )
        temporary_output = work_dir / "social-short.mp4"
        subprocess.run(
            [
                "npx",
                "remotion",
                "render",
                "src/index.tsx",
                "SocialShort",
                str(temporary_output),
                f"--props={props_path}",
                "--codec=h264",
                "--crf=18",
                "--concurrency=2",
            ],
            cwd=project_dir,
            check=True,
        )

        output_dir.mkdir(parents=True, exist_ok=True)
        safe_title = re.sub(r"[^A-Za-z0-9_-]+", "-", props["title"]).strip("-") or "social-short"
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        job_output_dir = output_dir / f"{safe_title}-{stamp}"
        job_output_dir.mkdir(parents=True, exist_ok=False)
        final_output = job_output_dir / "social-short.mp4"
        shutil.copy2(temporary_output, final_output)
        shutil.copy2(extracted_dir / "manifest.json", job_output_dir / "manifest.json")
        shutil.copy2(props_path, job_output_dir / "props.json")
        generated_dir = public_dir / "assets" / "generated"
        if generated_dir.is_dir():
            shutil.copytree(generated_dir, job_output_dir / "assets" / "generated")
        return final_output
