#!/usr/bin/env python3
"""Turn the source handbell recordings into the app's sound files.

Run from the repository root on a Mac (uses the built-in `afconvert`):

    python3 tools/prepare-sounds.py

Reads   sounds/source/*.mp3   (InspectorJ "Hand Bells, Singles", see sounds/CREDITS.md)
Writes  sounds/c6.m4a ... sounds/c7.m4a  and  sounds/manifest.json

For each recording it trims the silence before the strike (so the bell sounds
the moment a swing is detected), keeps a fixed length with a gentle fade-out,
evens out loudness across notes, and encodes small mono AAC files.

It also retunes each bell. A handbell for music is tuned so its main overtone
is a twelfth above the note (exactly 3 times its frequency). These bells are
not: on C, D, E and F that overtone is at about 3.2 to 3.3 times, and at the
strike it is 14 to 21 dB LOUDER than the note itself. E, for example, rings a
loud C sharp. Played an octave down it stands out even more, and it clashes
with the chords. So the fundamental is moved to exact pitch, the main overtone
is moved to the twelfth and turned down, and the rest is turned down.

Takes a minute or two (pure Python, nothing to install).
"""
import cmath
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

FFT_SIZE = 1 << 18  # longer than any note, so nothing wraps around
OVERTONE_RANGE = (2.4, 3.6)  # where to look for the main overtone, x fundamental
OVERTONE_DB = -10  # loudest allowed at the strike, relative to the fundamental
REST_DB = -22  # same, for every other overtone
STRIKE_S = 0.15  # the strike, for those two limits

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

# Exact pitch of each recording (equal temperament, A6 = 1760 Hz).
PITCH = {
    name: 1760 * 2 ** (semis / 12)
    for name, semis in dict(c6=-9, d6=-7, e6=-5, f6=-4, g6=-2, a6=0, b6=2, c7=3).items()
}

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
    return [v / 32768 for v in x]


def fft(a, sign=-1):
    """Radix-2 FFT (no numpy needed). sign=+1 gives the unscaled inverse."""
    n = len(a)
    if n == 1:
        return list(a)
    even = fft(a[0::2], sign)
    odd = fft(a[1::2], sign)
    w = [cmath.exp(sign * 2j * math.pi * k / n) for k in range(n // 2)]
    t = [x * y for x, y in zip(w, odd)]
    return [e + o for e, o in zip(even, t)] + [e - o for e, o in zip(even, t)]


def spectrum(x):
    return fft(x + [0.0] * (FFT_SIZE - len(x)))[: FFT_SIZE // 2]


def waveform(half, n):
    return [v.real * 2 / FFT_SIZE for v in fft(half + [0j] * (FFT_SIZE // 2), +1)[:n]]


def band(f, lo, hi, edge):
    """1 inside lo..hi, falling smoothly to 0 over `edge` Hz outside it."""
    d = max(lo - f, f - hi, 0) / edge
    return 0.0 if d >= 1 else 0.5 + 0.5 * math.cos(math.pi * d)


def loudest(spec, lo, hi, sr):
    hz = sr / FFT_SIZE
    return hz * max(range(int(lo / hz), int(hi / hz)), key=lambda i: abs(spec[i]))


def strike_level(x, sr):
    """Loudest single partial over the strike, as an amplitude."""
    n = int(STRIKE_S * sr)
    win = [x[i] * (0.5 + 0.5 * math.cos(math.pi * i / n)) for i in range(n)]
    return max(abs(v) for v in spectrum(win))


def retune(x, sr, pitch):
    """The same bell at exact pitch, with its main overtone on the twelfth."""
    hz = sr / FFT_SIZE
    spec = spectrum(x)
    f0 = loudest(spec, pitch * 0.94, pitch * 1.06, sr)
    over = loudest(spec, pitch * OVERTONE_RANGE[0], pitch * OVERTONE_RANGE[1], sr)

    # Split into fundamental, main overtone and the rest. Moving a band along
    # the spectrum changes its pitch and keeps its attack and decay.
    n = len(spec)
    fund, main, rest = ([0j] * n for _ in range(3))
    d_fund = round((pitch - f0) / hz)
    d_main = round((pitch * 3 - over) / hz)
    for k, v in enumerate(spec):
        f = k * hz
        if f < 0.5 * pitch:
            continue  # room rumble and mains hum
        a = band(f, 0.7 * f0, 1.4 * f0, 0.2 * f0)
        b = band(f, over - 0.1 * f0, over + 0.1 * f0, 0.1 * f0)
        if a and k + d_fund < n:
            fund[k + d_fund] += v * a
        if b and k + d_main < n:
            main[k + d_main] += v * b
        rest[k] = v * (1 - a - b)
    fund, main, rest = (waveform(p, len(x)) for p in (fund, main, rest))

    l_fund, l_main, l_rest = (strike_level(p, sr) for p in (fund, main, rest))
    g_main = min(1, l_fund / l_main * 10 ** (OVERTONE_DB / 20))
    g_rest = min(1, l_fund / l_rest * 10 ** (REST_DB / 20))
    db = lambda r: 20 * math.log10(r)
    print('  note was %+5.1f cents off; main overtone %.2fx at %+5.1f dB -> 3x at %+5.1f dB; others %+5.1f -> %+5.1f dB' % (
        1200 * math.log2(f0 / pitch), over / f0, db(l_main / l_fund), db(g_main * l_main / l_fund),
        db(l_rest / l_fund), db(g_rest * l_rest / l_fund)))
    return [a + g_main * b + g_rest * c for a, b, c in zip(fund, main, rest)]


def fade_out(x, sr):
    fade = int(FADE_S * sr)
    for i in range(fade):
        x[-fade + i] *= 1 - i / fade
    return x


def rms(x, sr):
    w = x[: int(RMS_WINDOW_S * sr)]
    return math.sqrt(sum(v * v for v in w) / len(w))


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tones = {}
        for fid, name in RECORDINGS:
            x, sr = decode(source_for(fid), tmp)
            print(name)
            tones[name] = (fade_out(retune(trim(x, sr), sr, PITCH[name]), sr), sr)

        # Match loudness: one level for all, as loud as it can be with no note clipping.
        target = min(PEAK_CAP * rms(x, sr) / max(abs(v) for v in x) for x, sr in tones.values())

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
