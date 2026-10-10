#!/usr/bin/env python3
"""Original soft meow for the Android reminder channel.

Synthesized in this file (no sampled recording). About one second, quiet,
with a rising "me" and a falling "ow". Output is 16-bit mono PCM WAV.
"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

RATE = 44100
SECONDS = 1.05


def envelope(t: float) -> float:
    attack = 0.07
    release = 0.22
    if t < attack:
        return t / attack
    if t > SECONDS - release:
        return max(0.0, (SECONDS - t) / release)
    # Soft swell through the vowel, then ease off. Peak stays well under clipping.
    hold = (t - attack) / (SECONDS - attack - release)
    return 0.72 + 0.28 * math.sin(math.pi * min(1.0, hold))


def pitch(t: float) -> float:
    # "me" rises, "ow" falls. Gentle, not a siren.
    if t < 0.28:
        return 420 + (640 - 420) * (t / 0.28)
    fall = min(1.0, (t - 0.28) / 0.7)
    return 640 + (310 - 640) * (fall ** 0.85)


def sample(t: float) -> float:
    if t < 0 or t > SECONDS:
        return 0.0
    f0 = pitch(t)
    # A little nasal "m" at the start, then a vowel with two formant-ish partials.
    nasal = math.exp(-t / 0.12)
    vibrato = 1 + 0.012 * math.sin(2 * math.pi * 5.5 * t)
    phase = 2 * math.pi * f0 * vibrato * t
    tone = (
        0.62 * math.sin(phase)
        + 0.22 * math.sin(2 * phase)
        + 0.10 * math.sin(3 * phase) * (1 - nasal)
        + 0.08 * math.sin(2 * math.pi * (f0 * 2.4) * t) * (1 - nasal)
    )
    breath = 0.015 * math.sin(2 * math.pi * 1800 * t) * nasal
    return (tone * (0.55 + 0.45 * (1 - nasal)) + breath) * envelope(t)


def main() -> None:
    dest = Path(__file__).resolve().parents[1] / "android/app/src/main/res/raw/echo_meow.wav"
    dest.parent.mkdir(parents=True, exist_ok=True)
    frames = bytearray()
    peak = 0.0
    raw = []
    for i in range(int(RATE * SECONDS)):
        value = sample(i / RATE)
        raw.append(value)
        peak = max(peak, abs(value))
    # Keep the meow soft: about -12 dBFS at the peak.
    gain = 0.25 / peak if peak else 0.0
    for value in raw:
        frames += struct.pack("<h", max(-32767, min(32767, int(value * gain * 32767))))
    with wave.open(str(dest), "w") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(frames)
    print(f"wrote {dest} ({dest.stat().st_size} bytes, {SECONDS:.2f}s)")


if __name__ == "__main__":
    main()
