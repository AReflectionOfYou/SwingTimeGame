#!/usr/bin/env python3
"""Turn the source handbell recordings into the app's sound files.

Run from the repository root on a Mac (uses the built-in `afconvert`):

    python3 tools/prepare-sounds.py

Reads   sounds/source/*.mp3   (InspectorJ "Hand Bells, Singles", see sounds/CREDITS.md)
Writes  sounds/c6.m4a ... sounds/c7.m4a  and  sounds/manifest.json

For each recording it trims the silence before the strike (so the bell sounds
the moment a swing is detected), keeps a fixed length with a gentle fade-out,
evens out loudness across notes, and encodes small mono AAC files.
"""
import json
import math
import os
import struct
import subprocess
import sys
import tempfile
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'sounds', 'source')
OUT = os.path.join(ROOT, 'sounds')

LENGTH_S = 3.0  # kept per note; shifted notes play twice as long
FADE_S = 0.4
ONSET_LEVEL = 800  # 16-bit sample level that counts as the strike
RMS_WINDOW_S = 0.4  # loudness is matched over the first part of the ring
PEAK_CAP = 0.89  # about -1 dBFS
BITRATE = 64000

# Source file (by Freesound id) → output name and the pitch it actually sounds.
RECORDINGS = [
    ('339815', 'c6'),  # Low-C
    ('339813', 'd6'),
    ('339812', 'e6'),
    ('339816', 'f6'),
    ('339818', 'g6'),
    ('339810', 'a6'),
    ('339809', 'b6'),
    ('339820', 'c7'),  # High-C
]

# App note → recording, and playback rate. The pack covers one octave
# (C6-C7), so the app's lower octave plays the same recordings at half speed,
# exactly one octave down. Those notes are marked "shifted".
NOTES = {
    'Do': ('c6', 0.5), 'Re': ('d6', 0.5), 'Mi': ('e6', 0.5), 'Fa': ('f6', 0.5),
    'Sol': ('g6', 0.5), 'La': ('a6', 0.5), 'Ti': ('b6', 0.5),
    'Do2': ('c6', 1), 'Re2': ('d6', 1), 'Mi2': ('e6', 1), 'Fa2': ('f6', 1),
    'Sol2': ('g6', 1), 'La2': ('a6', 1), 'Ti2': ('b6', 1),
    'Do3': ('c7', 1),
}


def source_for(fid):
    for name in os.listdir(SRC):
        if name.startswith(fid + ' '):
            return os.path.join(SRC, name)
    sys.exit('Missing source recording for Freesound id ' + fid)


def decode(path, tmp):
    wav = os.path.join(tmp, os.path.basename(path) + '.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', path, wav], check=True)
    w = wave.open(wav)
    n = w.getnframes()
    samples = list(struct.unpack('<%dh' % n, w.readframes(n)))
    return samples, w.getframerate()


def trim(x, sr):
    start = next(i for i, v in enumerate(x) if abs(v) > ONSET_LEVEL)
    start = max(0, start - int(0.003 * sr))  # keep the very start of the strike
    x = x[start:start + int(LENGTH_S * sr)]
    fade = int(FADE_S * sr)
    for i in range(fade):
        x[-fade + i] *= 1 - i / fade
    return [v / 32768 for v in x]


def rms(x, sr):
    w = x[: int(RMS_WINDOW_S * sr)]
    return math.sqrt(sum(v * v for v in w) / len(w))


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tones = {}
        for fid, name in RECORDINGS:
            x, sr = decode(source_for(fid), tmp)
            tones[name] = (trim(x, sr), sr)

        # Match loudness: one target level for all, lowered if any note would clip.
        target = min(rms(x, sr) for x, sr in tones.values())
        target = min(target, min(PEAK_CAP * rms(x, sr) / max(abs(v) for v in x) for x, sr in tones.values()))

        for name, (x, sr) in tones.items():
            g = target / rms(x, sr)
            pcm = [max(-32767, min(32767, int(v * g * 32767))) for v in x]
            wav = os.path.join(tmp, name + '.wav')
            w = wave.open(wav, 'w')
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(struct.pack('<%dh' % len(pcm), *pcm))
            w.close()
            out = os.path.join(OUT, name + '.m4a')
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', str(BITRATE), wav, out], check=True)
            print('%-6s gain %+5.1f dB  %6d bytes' % (name, 20 * math.log10(g), os.path.getsize(out)))

    manifest = {
        '_about': 'Which sound file each note plays. rate 0.5 = played at half speed, one octave down '
                  '("shifted": the pack has no recording at that pitch). Made by tools/prepare-sounds.py.',
        'notes': {
            note: dict(file=name + '.m4a', rate=rate, **({'shifted': True} if rate != 1 else {}))
            for note, (name, rate) in NOTES.items()
        },
    }
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')
    print('wrote sounds/manifest.json')


if __name__ == '__main__':
    main()
