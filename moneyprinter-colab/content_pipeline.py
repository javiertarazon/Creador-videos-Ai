#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys, time
import os
import tomllib
from datetime import datetime, timezone
from pathlib import Path

def choose_clips(manifest: dict, niche: str) -> list[dict]:
    words = {w.lower() for w in re.findall(r"[\wáéíóúñ]+", niche) if len(w) > 3}
    scored = []
    for video in manifest.get("videos", []):
        haystack = (video.get("name", "") + " " + video.get("path", "")).lower()
        score = sum(word in haystack for word in words)
        if score or not words:
            scored.append((score, video))
    scored.sort(key=lambda item: (-item[0], item[1].get("path", "")))
    return [video for _, video in scored[:12]]

def main() -> None:
    niche = " ".join(sys.argv[1:]).strip()
    if not niche:
        raise SystemExit('Uso: content_pipeline.py <nicho>')
    data_dir = Path(os.getenv('MPT_DATA_DIR', '/data'))
    manifest_path = data_dir / 'library-manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {'videos': []}
    clips = choose_clips(manifest, niche)
    prompt = f'''Eres estratega de videos cortos en español.
Nicho: {niche}
Plataformas: TikTok, YouTube Shorts e Instagram Reels.
Crea contenido ORIGINAL inspirado en patrones generales de atención; no copies guiones.
Devuelve SOLO JSON válido y compacto con las claves trend_angles, hooks, script, platforms y clip_keywords.
Incluye 1 hook, un guion de máximo 80 palabras y solo 2 hashtags por plataforma. En platforms usa solo title y hashtags. Empieza con un gancho fuerte y termina con una llamada a la acción.'''
    config_path = Path(os.getenv('MPT_CONFIG_PATH', '/MoneyPrinterTurbo/config.toml'))
    config = tomllib.loads(config_path.read_text(encoding='utf-8'))['app']
    api_key = str(config.get('openai_api_key') or '').strip()
    base_url = str(config.get('openai_base_url') or '').strip()
    model = str(config.get('openai_model_name') or '').strip()
    if not api_key or not base_url or not model:
        raise SystemExit('Configura openai_api_key, openai_base_url y openai_model_name en config.toml.')
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url=base_url)
    response = None
    for attempt in range(5):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.5,
                max_tokens=1800,
                response_format={'type': 'json_object'},
            )
            break
        except Exception as exc:
            if attempt == 4:
                raise SystemExit(f'NVIDIA NIM no disponible después de 5 intentos: {exc}') from exc
            time.sleep(4 * (attempt + 1))
    raw = (response.choices[0].message.content or '').strip().removeprefix('```json').removesuffix('```').strip()
    try:
        plan = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f'El proveedor no devolvió JSON válido: {exc}') from exc
    plan.update({'niche': niche, 'generated_at': datetime.now(timezone.utc).isoformat(), 'source_clips': clips})
    out = Path(os.getenv('MPT_PLANS_DIR', str(data_dir / 'content-plans'))) / (re.sub(r'[^a-z0-9]+', '-', niche.lower()).strip('-') + '.json')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"plan={out} clips={len(clips)} hooks={len(plan.get('hooks', []))}")

if __name__ == '__main__':
    main()
