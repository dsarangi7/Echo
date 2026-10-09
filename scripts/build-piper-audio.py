#!/usr/bin/env python3
"""Build Piper MP3 clips for the Echo sentence packs.

Hear it plays public/audio/{en,zh}/000.mp3 … 099.mp3. The index is the
sentence index. public/audio/manifest.json stores a sha256 of the spoken
line so a text edit cannot keep a stale clip.

Requires piper-tts (pip), ffmpeg, and the two voice files. Voices download
into .piper-voices/ on first run (gitignored):

  en_US-lessac-medium   US English, female
  zh_CN-huayan-medium   Mandarin, female

  python3 -m venv .venv
  .venv/bin/pip install piper-tts
  .venv/bin/python scripts/build-piper-audio.py

length_scale 1.06 is slightly slower than the model default so short
practice lines stay clear.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOICES_DIR = Path(os.environ.get("PIPER_VOICES_DIR", ROOT / ".piper-voices"))
AUDIO_DIR = ROOT / "public" / "audio"
LENGTH_SCALE = 1.06

VOICES = {
    "en": {
        "id": "en_US-lessac-medium",
        "field": "en",
        "files": {
            "en_US-lessac-medium.onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx",
            "en_US-lessac-medium.onnx.json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json",
        },
    },
    "zh": {
        "id": "zh_CN-huayan-medium",
        "field": "zh",
        "files": {
            "zh_CN-huayan-medium.onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx",
            "zh_CN-huayan-medium.onnx.json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json",
        },
    },
}


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def download(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"download {dest.name}", flush=True)
    urllib.request.urlretrieve(url, dest)


def load_pack(lang: str) -> list[dict]:
    path = ROOT / "src" / "data" / f"pack-{lang}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    if len(data) != 100:
        raise SystemExit(f"{path} has {len(data)} rows, expected 100")
    return data


def main() -> None:
    try:
        from piper import PiperVoice
        from piper.config import SynthesisConfig
    except ImportError:
        raise SystemExit("piper is not installed. See the docstring in this file.")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("ffmpeg is required")

    manifest_path = AUDIO_DIR / "manifest.json"
    old = {}
    if manifest_path.exists():
        old = json.loads(manifest_path.read_text(encoding="utf-8"))

    manifest = {
        "voices": {lang: spec["id"] for lang, spec in VOICES.items()},
        "lengthScale": LENGTH_SCALE,
        "en": [],
        "zh": [],
    }
    syn = SynthesisConfig(length_scale=LENGTH_SCALE)

    for lang, spec in VOICES.items():
        for name, url in spec["files"].items():
            download(url, VOICES_DIR / name)
        model = VOICES_DIR / f"{spec['id']}.onnx"
        print(f"load {spec['id']}", flush=True)
        voice = PiperVoice.load(model)
        pack = load_pack(lang)
        out_dir = AUDIO_DIR / lang
        out_dir.mkdir(parents=True, exist_ok=True)
        previous = old.get(lang) or []
        for index, row in enumerate(pack):
            spoken = row[spec["field"]]
            digest = sha256(spoken)
            manifest[lang].append(digest)
            dest = out_dir / f"{index:03d}.mp3"
            if dest.exists() and index < len(previous) and previous[index] == digest:
                continue
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
                wav_path = Path(handle.name)
            try:
                with wave.open(str(wav_path), "wb") as wav:
                    voice.synthesize_wav(spoken, wav, syn_config=syn)
                subprocess.run(
                    [
                        ffmpeg,
                        "-y",
                        "-loglevel",
                        "error",
                        "-i",
                        str(wav_path),
                        "-ac",
                        "1",
                        "-ar",
                        "22050",
                        "-codec:a",
                        "libmp3lame",
                        "-b:a",
                        "64k",
                        str(dest),
                    ],
                    check=True,
                )
            finally:
                wav_path.unlink(missing_ok=True)
            print(f"{lang} {index:03d}", flush=True)

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {manifest_path}", flush=True)


if __name__ == "__main__":
    main()
