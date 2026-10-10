"""Score + sound design, mixed under the untouched voice-over.

usage: python audio.py voiceover.wav out_mix.wav
Everything except the narration is synthesised here (no third-party samples).
The narration is only resampled 24 kHz -> 48 kHz; its timing and level are untouched
(the final loudness pass in render.py scales the whole mix uniformly).
"""
import sys
import numpy as np
from scipy import signal
import soundfile as sf

SR = 48000
DUR = 75.0
N = int(SR * DUR)
rng = np.random.default_rng(2026)
T = np.arange(N) / SR


def db(x):
    return 10 ** (x / 20)


def env(t0, a, d, r, peak=1.0, hold=0.0):
    """Attack/hold/release envelope (seconds) starting at t0."""
    e = np.zeros(N, np.float32)
    i0 = int(t0 * SR)
    seg_len = int((a + hold + d + r) * SR) + 1
    t = np.arange(seg_len) / SR
    shape = np.where(t < a, t / max(a, 1e-4),
                     np.where(t < a + hold, 1.0,
                              np.where(t < a + hold + d, 1 - 0.3 * (t - a - hold) / max(d, 1e-4),
                                       0.7 * np.exp(-(t - a - hold - d) / max(r, 1e-4) * 3))))
    i1 = min(N, i0 + seg_len)
    e[i0:i1] = (shape[: i1 - i0] * peak).astype(np.float32)
    return e


def noise(n=N, color="white"):
    w = rng.normal(0, 1, n).astype(np.float32)
    if color == "brown":
        w = np.cumsum(w)
        w = signal.lfilter([1], [1, -0.995], np.diff(w, prepend=0)).astype(np.float32)
    elif color == "pink":
        b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
        a = [1, -2.494956002, 2.017265875, -0.522189400]
        w = signal.lfilter(b, a, w).astype(np.float32)
    return w / (np.abs(w).max() + 1e-9)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x).astype(np.float32)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "lowpass", fs=SR, output="sos"), x).astype(np.float32)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "highpass", fs=SR, output="sos"), x).astype(np.float32)


def sweep_bp(x, f0, f1, t0, t1, q=2.0, block=1024):
    """Band-pass with a centre frequency gliding f0 -> f1 between t0 and t1 (block-wise)."""
    out = np.zeros_like(x)
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR))
    zi = None
    for s in range(i0, i1, block):
        e = min(i1, s + block)
        k = (s - i0) / max(1, i1 - i0)
        fc = f0 * (f1 / f0) ** k
        lo, hi = fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 - 100)
        sos = signal.butter(2, [lo, hi], "bandpass", fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y, zi = signal.sosfilt(sos, x[s:e], zi=zi)
        out[s:e] = y
    return out


def reverb(x, secs=2.8, wet=0.35, damp=3000):
    n = int(secs * SR)
    ir = rng.normal(0, 1, n).astype(np.float32) * np.exp(-np.arange(n) / SR * 6.9 / secs).astype(np.float32)
    ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir ** 2))
    y = signal.fftconvolve(x, ir)[: x.size].astype(np.float32)
    return x * (1 - wet) + y * wet


def pan(x, p):
    """Equal-power pan; p in [-1, 1] (scalar or array)."""
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1).astype(np.float32)


# ------------------------------------------------------------------ score
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}


def hz(name, octave):
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


CHORDS = [  # start, chord tones (name, octave)
    (0.0, [("D", 2), ("A", 2), ("D", 3), ("F", 3), ("A", 3)]),
    (8.6, [("Bb", 1), ("F", 2), ("Bb", 2), ("D", 3), ("F", 3)]),
    (12.4, [("F", 2), ("C", 3), ("F", 3), ("A", 3), ("C", 4)]),
    (16.6, [("D", 2), ("A", 2), ("D", 3), ("F", 3), ("A", 3)]),
    (22.0, [("G", 1), ("D", 2), ("G", 2), ("Bb", 2), ("D", 3)]),
    (25.1, [("Eb", 2), ("Bb", 2), ("Eb", 3), ("G", 3), ("Bb", 3)]),
    (30.8, [("D", 2), ("A", 2), ("D", 3), ("F", 3), ("A", 3)]),
    (36.5, [("Bb", 1), ("F", 2), ("Bb", 2), ("D", 3), ("F", 3)]),
    (43.3, [("G", 1), ("D", 2), ("G", 2), ("Bb", 2), ("D", 3)]),
    (47.9, [("A", 1), ("E", 2), ("A", 2), ("C#", 3), ("E", 3)]),
    (50.0, [("Bb", 1), ("F", 2), ("Bb", 2), ("D", 3), ("F", 3), ("A", 3)]),
    (54.0, [("F", 2), ("C", 3), ("F", 3), ("A", 3), ("C", 4)]),
    (58.4, [("C", 2), ("G", 2), ("C", 3), ("E", 3), ("G", 3)]),
    (62.3, [("G", 1), ("D", 2), ("G", 2), ("Bb", 2), ("D", 3)]),
    (64.9, [("A", 1), ("E", 2), ("A", 2), ("C#", 3), ("E", 3)]),
    (67.84, [("Bb", 1), ("F", 2), ("Bb", 2), ("D", 3), ("F", 3), ("A", 3)]),
    (70.1, [("F", 1), ("C", 2), ("F", 2), ("A", 2), ("C", 3), ("F", 3)]),
    (75.0, []),
]


def pad():
    L = np.zeros(N, np.float32)
    R = np.zeros(N, np.float32)
    for (t0, notes), (t1, _) in zip(CHORDS, CHORDS[1:]):
        a, rel = 1.6, 2.2
        i0 = int(t0 * SR)
        i1 = min(N, int((t1 + rel) * SR))
        t = np.arange(i1 - i0) / SR
        e = np.clip(t / a, 0, 1) * np.where(t < (t1 - t0), 1.0, np.exp(-(t - (t1 - t0)) / (rel / 3)))
        e = e.astype(np.float32)
        for name, octv in notes:
            f = hz(name, octv)
            for det, side in ((-0.004, 0), (0.0, 1), (0.004, 2)):
                ph = rng.uniform(0, 2 * np.pi)
                s = np.zeros_like(t, dtype=np.float32)
                for h in range(1, 7):
                    if f * h > 6000:
                        break
                    s += (np.sin(2 * np.pi * f * (1 + det) * h * t + ph * h) / h ** 1.6).astype(np.float32)
                s *= e * (0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * t + ph)).astype(np.float32)
                if side == 0:
                    L[i0:i1] += s
                elif side == 2:
                    R[i0:i1] += s
                else:
                    L[i0:i1] += s * 0.7
                    R[i0:i1] += s * 0.7
    st = np.stack([lp(L, 2400), lp(R, 2400)], 1)
    return st / np.abs(st).max()


def sub_drone():
    s = np.zeros(N, np.float32)
    for (t0, notes), (t1, _) in zip(CHORDS, CHORDS[1:]):
        if not notes:
            continue
        f = hz(notes[0][0], 1) if notes[0][1] >= 2 else hz(notes[0][0], notes[0][1])
        i0, i1 = int(t0 * SR), min(N, int(t1 * SR))
        t = np.arange(i1 - i0) / SR
        x = np.sin(2 * np.pi * f * t) * np.clip(t / 0.4, 0, 1) * np.clip((t1 - t0 - t) / 0.4, 0, 1)
        s[i0:i1] += x.astype(np.float32)
    return s


def arps():
    """Soft plucked ostinato for the middle build (restrained)."""
    out = np.zeros(N, np.float32)
    step = 60 / 100 / 2
    t = 31.0
    k = 0
    while t < 66.5:
        notes = [n for (t0, n) in CHORDS if t0 <= t][-1]
        if notes:
            name, octv = notes[[2, 3, 4, 3][k % 4] % len(notes)]
            f = hz(name, octv + 1)
            n = int(0.9 * SR)
            tt = np.arange(n) / SR
            x = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 5.5)
            vel = 0.35 + 0.65 * np.clip((t - 31) / 30, 0, 1)
            if 47.9 < t < 50.0:
                vel *= 0.5
            i0 = int(t * SR)
            i1 = min(N, i0 + n)
            out[i0:i1] += (x[: i1 - i0] * vel).astype(np.float32)
        t += step
        k += 1
    return lp(out, 3500)


def hit(t0, f0=58, gain=1.0, length=2.4):
    """Low cinematic impact: pitch-dropping sine + filtered noise transient."""
    n = int(length * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 1.5 * np.exp(-t * 18))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    tr = lp(rng.normal(0, 1, n).astype(np.float32), 900) * np.exp(-t * 30) * 0.8
    x = (body + tr) * gain
    out = np.zeros(N, np.float32)
    i0 = int(t0 * SR)
    i1 = min(N, i0 + n)
    out[i0:i1] = x[: i1 - i0]
    return out


def whoosh(t0, dur, f0=300, f1=3000, gain=1.0, rev=False):
    x = noise()
    t1 = t0 + dur
    y = sweep_bp(x, f0, f1, t0, t1, q=1.6)
    e = np.zeros(N, np.float32)
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR))
    tt = np.linspace(0, 1, i1 - i0)
    shape = tt ** 2.5 if rev else np.sin(np.pi * tt) ** 1.5
    e[i0:i1] = shape
    return y * e * gain


def bubbles(t0, t1, rate=6.0, gain=1.0):
    out = np.zeros(N, np.float32)
    t = t0
    while t < t1:
        t += rng.exponential(1 / rate)
        n = int(rng.uniform(0.03, 0.09) * SR)
        tt = np.arange(n) / SR
        f = rng.uniform(350, 900) * (1 + tt * rng.uniform(6, 14))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 45) * rng.uniform(0.3, 1)
        i0 = int(t * SR)
        i1 = min(N, i0 + n)
        if i0 < N:
            out[i0:i1] += x[: i1 - i0].astype(np.float32)
    return out * gain


def gate(t0, t1, fade=0.6):
    g = np.clip(np.minimum((T - t0) / fade, (t1 - T) / fade), 0, 1)
    return g.astype(np.float32)


def chime(t0, f=hz("F", 5), gain=1.0):
    n = int(3.5 * SR)
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * r * t) * a * np.exp(-t * d) for r, a, d in
            ((1, 1, 1.4), (2.76, 0.35, 2.5), (5.4, 0.15, 4.0), (1.5, 0.3, 1.8)))
    out = np.zeros(N, np.float32)
    i0 = int(t0 * SR)
    i1 = min(N, i0 + n)
    out[i0:i1] = (x[: i1 - i0] * gain).astype(np.float32)
    return out


def build(vo_path, out_path):
    vo, sr = sf.read(vo_path, dtype="float32")
    if vo.ndim > 1:
        vo = vo.mean(1)
    vo = signal.resample_poly(vo, SR, sr).astype(np.float32)
    v = np.zeros(N, np.float32)
    v[: min(N, vo.size)] = vo[:N]

    # sidechain envelope from the narration
    venv = signal.sosfiltfilt(signal.butter(2, 6, "lowpass", fs=SR, output="sos"), np.abs(v))
    venv = np.clip(venv / (np.percentile(venv, 98) + 1e-9), 0, 1).astype(np.float32)
    duck = 1 - 0.55 * venv

    # ---- music
    intensity = np.interp(T, [0, 8, 16, 30, 31, 43, 50, 54, 62, 64, 67.8, 70, 73, 75],
                          [0.75, 0.6, 0.55, 0.62, 0.5, 0.62, 0.7, 0.8, 0.7, 0.85, 1.0, 1.0, 0.9, 0.0]).astype(np.float32)
    music = pad() * db(-25) * intensity[:, None]
    music += pan(sub_drone() * db(-27) * intensity, 0)
    ar = arps() * db(-30)
    music += np.stack([reverb(ar, 2.2, 0.45) * 0.9, reverb(np.roll(ar, 240), 2.2, 0.45)], 1)
    music[:, 0] = reverb(music[:, 0], 3.2, 0.3)
    music[:, 1] = reverb(music[:, 1], 3.4, 0.3)
    music *= duck[:, None]

    # ---- impacts
    sfx = np.zeros((N, 2), np.float32)
    for t0, g, f0 in ((0.05, 1.0, 52), (1.58, 0.55, 60), (3.4, 0.55, 56), (7.44, 0.8, 46), (11.6, 0.6, 55),
                      (26.15, 0.9, 42), (30.8, 0.6, 40), (39.05, 0.45, 55), (43.36, 0.5, 50), (50.0, 0.45, 60),
                      (63.1, 0.7, 48), (64.88, 0.8, 50), (67.84, 0.55, 55), (72.0, 0.5, 58)):
        sfx += pan(reverb(hit(t0, f0, g), 2.5, 0.3), 0) * db(-12)

    # ---- whooshes
    for t0, d, f0, f1, g, p, rv in ((1.25, 0.6, 250, 2500, 0.7, -0.4, False), (3.05, 0.6, 2500, 300, 0.7, 0.4, False),
                                    (8.3, 0.6, 400, 3500, 0.6, 0, False), (11.35, 0.6, 300, 2800, 0.6, -0.3, False),
                                    (16.9, 1.55, 200, 4500, 1.0, 0, True), (31.0, 0.8, 300, 2200, 0.6, 0.3, False),
                                    (38.5, 0.7, 500, 3000, 0.6, -0.3, False), (42.95, 0.7, 2500, 400, 0.6, 0.3, False),
                                    (49.6, 0.7, 300, 2600, 0.6, 0, False), (53.6, 0.7, 3000, 300, 0.6, 0, False),
                                    (61.0, 0.8, 400, 2400, 0.5, 0.2, False), (62.25, 0.9, 4000, 200, 0.9, 0, False),
                                    (67.6, 0.9, 300, 3000, 0.6, 0, False)):
        sfx += pan(whoosh(t0, d, f0, f1, g, rv), p) * db(-17)

    # ---- beds
    under = lp(noise(color="brown"), 420) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.13 * T)).astype(np.float32)
    uw_gate = gate(18.0, 31.4, 0.5) + gate(54.0, 61.5, 0.5)
    sfx += pan(under * uw_gate, 0) * db(-21)
    sfx += pan(bubbles(18.1, 31.2, 4.5) * gate(18.0, 31.4, 0.4), 0.25) * db(-27)
    sfx += pan(bubbles(54.1, 61.3, 3.0) * gate(54.0, 61.5, 0.4), -0.25) * db(-29)
    splash = lp(noise(), 2500) * env(26.12, 0.01, 0.3, 1.4)
    sfx += pan(reverb(splash, 1.8, 0.4), 0) * db(-14)
    sfx += pan(bubbles(26.2, 28.6, 26.0, 0.8) * gate(26.2, 28.8, 0.3), 0) * db(-22)

    swell = (0.6 + 0.4 * np.sin(2 * np.pi * 0.16 * T)).astype(np.float32)
    sea = bp(noise(color="pink"), 120, 1800) * swell * gate(31.4, 39.2, 0.6)
    sfx += np.stack([sea, np.roll(sea, 1500)], 1) * db(-22)
    rain = hp(noise(), 2500) * gate(33.5, 37.6, 1.0) * np.clip(1 - (T - 34) / 4, 0, 1)
    sfx += np.stack([rain, np.roll(rain, 800)], 1) * db(-30)

    gust = (0.55 + 0.45 * np.sin(2 * np.pi * 0.21 * T) * np.sin(2 * np.pi * 0.07 * T + 1)).astype(np.float32)
    wind = sweep_bp(noise(color="pink"), 250, 900, 43.2, 48.0, q=1.2) * gust * gate(43.3, 48.2, 0.6)
    storm = lp(noise(color="brown"), 160) * gate(43.3, 48.2, 0.8)
    sfx += np.stack([wind, np.roll(wind, 2400)], 1) * db(-18) + pan(storm, 0) * db(-24)
    bliz = bp(noise(), 700, 3800) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.6 * T)).astype(np.float32) * gate(47.8, 50.1, 0.35)
    howl = np.sin(2 * np.pi * (620 + 90 * np.sin(2 * np.pi * 0.35 * T)) * T).astype(np.float32) * 0.15 * gate(47.9, 50.1, 0.5)
    sfx += np.stack([bliz + howl, np.roll(bliz, 1900) + howl], 1) * db(-19)

    shimmer = hp(noise(), 5000) * np.clip((T - 50) / 3.5, 0, 1).astype(np.float32) * gate(50.0, 54.0, 0.3)
    sfx += np.stack([shimmer, np.roll(shimmer, 600)], 1) * db(-31)
    for t0 in (72.0, 73.28):
        c = reverb(chime(t0, hz("F", 5) if t0 < 73 else hz("C", 6), 1.0), 3.0, 0.5)
        sfx += pan(c, -0.15 if t0 < 73 else 0.15) * db(-24)

    sfx *= (1 - 0.35 * venv)[:, None]

    bed = (music + sfx) * db(4.0)
    mix = bed + np.stack([v, v], 1)
    if STEMS:
        sf.write(out_path.replace(".wav", "_bed.wav"), bed, SR, subtype="PCM_24")
    fade = np.clip((DUR - T) / 0.6, 0, 1).astype(np.float32)
    mix *= fade[:, None]
    peak = np.abs(mix).max()
    if peak > 0.98:
        mix *= 0.98 / peak
    sf.write(out_path, mix, SR, subtype="PCM_24")
    print("mix written", out_path, "peak", float(peak))


STEMS = "--stems" in sys.argv

if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
