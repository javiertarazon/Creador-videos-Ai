#!/usr/bin/env python3
"""Build a searchable manifest for the user's original video library."""
from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}


def probe(path: Path) -> dict:
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "format=duration,size:stream=width,height,r_frame_rate,codec_name",
        "-of", "json", str(path),
    ]
    try:
        raw = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)
        data = json.loads(raw)
        stream = (data.get("streams") or [{}])[0]
        fmt = data.get("format") or {}
        return {
            "duration": round(float(fmt.get("duration") or 0), 3),
            "size": int(fmt.get("size") or path.stat().st_size),
            "width": int(stream.get("width") or 0),
            "height": int(stream.get("height") or 0),
            "fps": stream.get("r_frame_rate", ""),
            "codec": stream.get("codec_name", ""),
        }
    except (OSError, subprocess.CalledProcessError, ValueError, json.JSONDecodeError):
        return {"duration": 0, "size": path.stat().st_size, "width": 0, "height": 0, "fps": "", "codec": ""}


def main() -> None:
    library = Path(os.getenv("MPT_ORIGINALS_DIR", "/library"))
    output = Path(os.getenv("MPT_DATA_DIR", "/data")) / "library-manifest.json"
    videos = []
    for path in sorted(library.rglob("*")):
        if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS:
            info = probe(path)
            info.update({"path": str(path.relative_to(library)), "name": path.name})
            videos.append(info)
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "library": str(library),
        "count": len(videos),
        "videos": videos,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"indexed={len(videos)} output={output}")


if __name__ == "__main__":
    main()
