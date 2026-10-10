#!/usr/bin/env python3
"""Regenerate the Hear it clips with free Piper voices.

The site commits the MP3s. This script is only needed when a sentence changes.

Requires the Piper binary and these MIT-licensed voices (not committed):

  en_US-lessac-medium   US English, female
  zh_CN-huayan-medium   Mandarin, female

https://github.com/rhasspy/piper/releases
https://huggingface.co/rhasspy/piper-voices

Usage:
  PIPER=./piper ESPEAK_DATA=./espeak-ng-data \\
  EN_MODEL=en_US-lessac-medium.onnx ZH_MODEL=zh_CN-huayan-medium.onnx \\
  python3 scripts/generate-audio.py
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PIPER = os.environ.get("PIPER", "piper")
ESPEAK = os.environ.get("ESPEAK_DATA", "")
EN_MODEL = os.environ["EN_MODEL"]
ZH_MODEL = os.environ["ZH_MODEL"]


def synth(model: str, text: str, mp3: Path) -> None:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
        wav = handle.name
    cmd = [
        PIPER,
        "--model",
        model,
        "--config",
        model + ".json",
        "--length_scale",
        "1.05",
        "--sentence_silence",
        "0.15",
        "--output_file",
        wav,
        "--quiet",
    ]
    if ESPEAK:
        cmd.extend(["--espeak_data", ESPEAK])
    subprocess.run(cmd, input=text.encode(), check=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            wav,
            "-codec:a",
            "libmp3lame",
            "-ac",
            "1",
            "-ar",
            "22050",
            "-b:a",
            "40k",
            str(mp3),
        ],
        check=True,
    )
    os.remove(wav)


def main() -> None:
    jobs = [
        ("en", EN_MODEL, json.loads((ROOT / "src/data/pack-en.json").read_text()), "en"),
        ("zh", ZH_MODEL, json.loads((ROOT / "src/data/pack-zh.json").read_text()), "zh"),
    ]
    for lang, model, rows, key in jobs:
        out = ROOT / "public/audio" / lang
        out.mkdir(parents=True, exist_ok=True)
        for index, row in enumerate(rows):
            synth(model, row[key], out / f"{index:03d}.mp3")
            print(lang, index)

    intros = json.loads((ROOT / "src/data/intro.json").read_text())
    intro_dir = ROOT / "public/audio/intro"
    intro_dir.mkdir(parents=True, exist_ok=True)
    synth(EN_MODEL, intros["en"], intro_dir / "en.mp3")
    print("intro", "en")
    synth(ZH_MODEL, intros["zh"], intro_dir / "zh.mp3")
    print("intro", "zh")


if __name__ == "__main__":
    main()
