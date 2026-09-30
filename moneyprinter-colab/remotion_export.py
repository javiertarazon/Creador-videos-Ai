from __future__ import annotations

import hashlib
import io
import json
import re
import zipfile
from pathlib import Path

from design_profiles import get_design_profile

MAX_CLIP_BYTES = 50 * 1024 * 1024
MAX_CLIPS_BYTES = 200 * 1024 * 1024
MAX_AUDIO_BYTES = 50 * 1024 * 1024
ALLOWED_CLIP_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg"}
def export_bundle_fingerprint(
    originals_dir: Path,
    script: str,
    niche: str,
    reference: dict,
    design_profile_id: str,
    clips: list[str],
    voiceover: bytes | None,
) -> str:
    clip_state = []
    for relative_path in clips:
        path = originals_dir / relative_path
        try:
            stat = path.stat()
        except OSError:
            clip_state.append((relative_path, "missing"))
        else:
            clip_state.append((relative_path, stat.st_size, stat.st_mtime_ns))
    digest = hashlib.sha256()
    digest.update(
        json.dumps(
            {
                "script": script,
                "niche": niche,
                "design_profile_id": design_profile_id,
                "reference": {
                    key: reference.get(key)
                    for key in ("platform", "title", "url", "trend_angle", "hook_pattern")
                },
                "clips": clip_state,
            },
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8")
    )
    if voiceover:
        digest.update(hashlib.sha256(voiceover).digest())
    return digest.hexdigest()


def create_remotion_export_bundle(
    originals_dir: Path,
    script: str,
    niche: str,
    selected: dict,
    design_profile_id: str,
    selected_clips: list[str],
    voiceover_name: str | None,
    voiceover_data: bytes | None,
) -> bytes:
    design_profile = get_design_profile(design_profile_id)
    buffer = io.BytesIO()
    manifest = {
        "schema_version": 1,
        "title": niche,
        "niche": niche,
        "script": script,
        "design_profile_id": design_profile_id,
        "design_profile": design_profile,
        "reference": {
            "platform": selected.get("platform"),
            "title": selected.get("title"),
            "url": selected.get("url"),
            "trend_angle": selected.get("trend_angle"),
            "hook_pattern": selected.get("hook_pattern"),
        },
        "clips": [],
        "voiceover": None,
    }
    clip_bytes = 0

    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for index, relative_path in enumerate(selected_clips, start=1):
            source_path = originals_dir / relative_path
            resolved = source_path.resolve(strict=True)
            resolved.relative_to(originals_dir.resolve(strict=True))
            if not resolved.is_file():
                raise ValueError(f"El clip seleccionado ya no existe: {relative_path}")
            if resolved.suffix.lower() not in ALLOWED_CLIP_EXTENSIONS:
                raise ValueError(f"Formato de clip no permitido: {relative_path}")
            file_size = resolved.stat().st_size
            if file_size > MAX_CLIP_BYTES:
                raise ValueError(f"{relative_path} supera el límite de 50 MiB por clip.")
            if file_size > MAX_CLIPS_BYTES - clip_bytes:
                raise ValueError("La selección supera el máximo de 200 MiB por paquete.")
            clip_bytes += file_size

            safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", resolved.name).strip(".-")
            archive_path = f"public/assets/clips/{index:02d}-{safe_name or 'clip.mp4'}"
            archive.write(resolved, archive_path)
            manifest["clips"].append(archive_path.removeprefix("public/"))

        if voiceover_data is not None and voiceover_name:
            extension = Path(voiceover_name).suffix.lower()
            if extension not in ALLOWED_AUDIO_EXTENSIONS:
                raise ValueError("Formato de voz no compatible para Remotion.")
            if not voiceover_data:
                raise ValueError("El archivo de locución está vacío.")
            if len(voiceover_data) > MAX_AUDIO_BYTES:
                raise ValueError("El audio de voz supera el límite de 50 MiB.")
            archive_path = f"public/assets/audio/voiceover{extension}"
            archive.writestr(archive_path, voiceover_data)
            manifest["voiceover"] = archive_path.removeprefix("public/")

        archive.writestr(
            "manifest.json",
            json.dumps(manifest, ensure_ascii=False, indent=2),
        )
    return buffer.getvalue()
