"""Ocean-depth cross-section (18 - 31.6 s).

Vertical axis is true to scale in kilometres (avg land +0.84 km, avg seafloor
-3.7 km, Challenger Deep -10.935 km, Everest 8.849 km). The horizontal axis
is schematic/compressed so the features fit a vertical phone frame.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import core as C
from core import seg, ease, ease_io, lerp, smoothstep

W, H = C.W, C.H
EVEREST = 8.849
TRENCH = -10.935
TX = 1700.0                     # trench axis (schematic x units)
AVG_LAND, AVG_SEA = 0.84, -3.7

_rng = np.random.default_rng(5)
_XS = np.arange(-400, 3200, dtype=np.float32)
_n = np.cumsum(_rng.normal(0, 1, (_XS.size,))).astype(np.float32)
_n = np.convolve(_n - np.convolve(_n, np.ones(301) / 301, "same"), np.ones(9) / 9, "same")
_n /= np.abs(_n).max()
_fine = np.convolve(_rng.normal(0, 1, _XS.size), np.ones(5) / 5, "same").astype(np.float32)

_g = np.fft.irfft2(np.fft.rfft2(_rng.normal(0, 1, (512, 512))) /
                   (1 + np.sqrt(np.fft.fftfreq(512)[:, None] ** 2 + np.fft.rfftfreq(512)[None, :] ** 2) * 60), s=(512, 512))
_GRAIN = ((_g - _g.mean()) / _g.std()).astype(np.float32)

_KX = np.array([-400, 0, 200, 380, 520, 600, 640, 700, 760, 860, 1000, 1060, 1120, 1200, 1300, 1420,
                1490, 1600, 1700, 1800, 1910, 1990, 2100, 2200, 2400, 3200], np.float32)
_KZ = np.array([1.1, 1.3, 0.6, 1.4, 0.5, 0.0, -0.12, -0.16, -1.2, -4.2, -4.45, -2.9, -4.4, -4.6, -5.0, -6.6,
                -9.6, -10.75, TRENCH, -10.7, -9.7, -8.0, -6.4, -5.5, -5.2, -5.0], np.float32)


def floor_z(x):
    z = np.interp(x, _KX, _KZ)
    amp = np.interp(x, [-400, 560, 620, 1000, 3200], [0.55, 0.45, 0.04, 0.35, 0.35])
    i = np.clip((x + 400).astype(np.int32), 0, _XS.size - 1)
    return z + _n[i] * amp + _fine[i] * 0.04


_EP = np.array([(-1, 0), (-0.82, 0.12), (-0.62, 0.30), (-0.47, 0.38), (-0.33, 0.55), (-0.2, 0.70), (-0.1, 0.86),
                (0, 1.0), (0.08, 0.94), (0.2, 0.80), (0.3, 0.74), (0.45, 0.58), (0.6, 0.40), (0.78, 0.2), (1, 0)],
               np.float32)
E_HALF = 205.0


def everest_top(dx):
    """Everest silhouette height (km above its base) at horizontal offset dx."""
    r = dx / E_HALF
    h = np.interp(r, _EP[:, 0], _EP[:, 1], left=-1, right=-1) * EVEREST
    i = np.clip((dx + 400).astype(np.int32), 0, _XS.size - 1)
    return np.where(h > 0, h + _fine[i] * 0.06, -1)


# camera keys: t, cx (units), cz (km), s (px per km)
KEYS = [(18.0, 640, -0.25, 520), (18.7, 700, -1.3, 250), (21.3, 900, -2.6, 150), (22.3, 560, -1.4, 175),
        (24.95, 640, -1.7, 165), (25.75, 1700, -5.6, 104), (30.65, 1700, -5.75, 106), (31.6, 1700, 0.35, 330)]


def camera(t):
    for (t0, x0, z0, s0), (t1, x1, z1, s1) in zip(KEYS, KEYS[1:]):
        if t <= t1:
            a = ease_io(seg(t, t0, t1))
            return lerp(x0, x1, a), lerp(z0, z1, a), float(np.exp(lerp(np.log(s0), np.log(s1), a)))
    return KEYS[-1][1:]


def everest_base(t):
    if t < 25.55:
        return None
    if t < 26.15:
        a = seg(t, 25.55, 26.15)
        return 16.0 - 16.0 * a * a
    a = seg(t, 26.15, 27.8)
    return TRENCH * (1 - (1 - a) ** 2.4)


def water_col(z):
    ks = np.array([-12, -6, -3, -1.2, -0.35, 0.0], np.float32)
    r = np.interp(z, ks, [0.012, 0.016, 0.022, 0.035, 0.06, 0.12])
    g = np.interp(z, ks, [0.055, 0.075, 0.115, 0.19, 0.34, 0.56])
    b = np.interp(z, ks, [0.15, 0.19, 0.28, 0.42, 0.56, 0.66])
    return np.stack([r, g, b], -1).astype(np.float32)


def render(t):
    cx, cz, s = camera(t)
    hs = s / 104.0                                   # px per x-unit
    xs = (np.arange(W, dtype=np.float32) - W / 2) / hs + cx
    zs = cz + (H / 2 - np.arange(H, dtype=np.float32)) / s
    Z = np.broadcast_to(zs[:, None], (H, W))
    fz = floor_z(xs)[None, :]
    img = np.zeros((H, W, 3), np.float32)

    # sky
    sky_t = smoothstep(0, 160.0 / s, Z)[..., None] ** 0.6
    sky = np.array([0.98, 0.66, 0.40], np.float32) * (1 - sky_t) + np.array([0.08, 0.20, 0.50], np.float32) * sky_t
    wave = 0.012 * np.sin(xs * 0.07 + t * 2.4)[None, :] * (40 / s)
    below = Z < wave
    rock = Z < fz
    water = below & ~rock

    img[:] = sky
    # water body + light shafts
    wc = water_col(Z)
    xr = (np.arange(W, dtype=np.float32)[None, :] + (np.arange(H, dtype=np.float32)[:, None] * 0.28))
    shafts = (0.5 + 0.5 * np.sin(xr * 0.021 + t * 0.6)) * (0.5 + 0.5 * np.sin(xr * 0.0063 - t * 0.35 + 1.7))
    shafts = shafts ** 3 * np.exp(np.minimum(Z, 0) / 1.6)
    wc = wc + shafts[..., None] * np.array([0.10, 0.22, 0.24], np.float32)
    img = np.where(water[..., None], wc, img)

    # seafloor / land rock with strata and a lit rim
    depth_in = (fz - Z)
    grain = _GRAIN[(np.arange(H)[:, None] + int(cz * s)) % 512, (np.arange(W)[None, :] + int(cx * hs)) % 512]
    strata = 0.92 + 0.05 * np.sin(depth_in * 7.0 + np.sin(xs[None, :] * 0.01) * 2) + 0.10 * grain
    sed = np.array([0.42, 0.34, 0.26], np.float32)
    basalt = np.array([0.16, 0.15, 0.17], np.float32)
    k = smoothstep(0.1, 1.6, depth_in)[..., None]
    rc = (sed * (1 - k) + basalt * k) * strata[..., None]
    land_top = (fz > 0)
    grass = (depth_in < 0.18) & land_top
    rc = np.where(grass[..., None], np.array([0.22, 0.40, 0.16], np.float32), rc)
    rim = np.exp(-np.clip(depth_in * s / 3.0, 0, 50))[..., None]
    uw = (fz < 0)[..., None] * np.ones((H, 1, 1), np.float32)
    light = 0.25 + 0.75 * np.exp(np.minimum(Z, 0) / 2.2)[..., None]
    rc_uw = rc * light * 0.95 + water_col(Z) * 0.55 + rim * np.array([0.25, 0.55, 0.60], np.float32)
    rc_land = rc + rim * np.array([0.3, 0.3, 0.2], np.float32)
    rcol = np.where(uw > 0, rc_uw, rc_land)
    img = np.where(rock[..., None], rcol, img)

    # sea surface line
    surf = np.exp(-((Z - wave) * s / 1.4) ** 2)[..., None] * (~rock)[..., None]
    img += surf * np.array([0.7, 0.95, 1.0], np.float32) * 0.8

    # Everest
    eb = everest_base(t)
    if eb is not None:
        top = everest_top(xs - TX)[None, :]
        inside = (Z > eb) & (Z < eb + top) & (top[0] > 0)[None, :] & ~rock
        if inside.any():
            hrel = (Z - eb) / EVEREST
            snow = smoothstep(0.80, 0.86, hrel + 0.03 * np.sin(xs[None, :] * 0.3))
            face = np.where((xs - TX)[None, :] < 0, 1.0, 0.72)
            ec = np.array([0.36, 0.33, 0.31], np.float32) * (0.85 + 0.15 * strata[..., None])
            ec = ec * (1 - snow[..., None]) + np.array([0.95, 0.96, 1.0], np.float32) * snow[..., None]
            ec = ec * face[..., None]
            streak = _GRAIN[(np.arange(H)[:, None] // 14) % 512, ((np.arange(W)[None, :] + int(cx * hs)) // 3) % 512]
            ec = ec * (0.9 + 0.15 * streak[..., None])
            edge = np.exp(-np.clip(((eb + top) - Z) * s / 2.0, 0, 50))[..., None]
            ec = ec + edge * 0.25
            uwm = (Z < 0)[..., None]
            ec_uw = ec * (0.25 + 0.75 * np.exp(np.minimum(Z, 0) / 2.6))[..., None] * 0.75 + water_col(Z) * 0.55
            img = np.where(inside[..., None], np.where(uwm, ec_uw, ec), img)
    img = np.ascontiguousarray(img)
    return img, (cx, cz, s, hs)


def zy(z, cam):
    cx, cz, s, hs = cam
    return H / 2 - (z - cz) * s


def ux(x, cam):
    cx, cz, s, hs = cam
    return W / 2 + (x - cx) * hs


def overlay(fr, t, cam):
    """Dashed reference lines, bubbles and splash drawn on the uint8 frame."""
    im = Image.fromarray(fr)
    d = ImageDraw.Draw(im, "RGBA")

    def dashed(y, x0, x1, col, a):
        if a <= 0 or y < -10 or y > H + 10:
            return
        for x in range(int(x0), int(x1), 34):
            d.line([(x, y), (min(x + 20, x1), y)], fill=col + (int(255 * a),), width=4)

    a_sea = ease(seg(t, 19.7, 20.2)) * (1 - ease(seg(t, 24.9, 25.4)))
    dashed(zy(AVG_SEA, cam), 40, W - 40, (255, 214, 120), a_sea)
    a_land = ease(seg(t, 22.4, 22.9)) * (1 - ease(seg(t, 24.9, 25.4)))
    dashed(zy(AVG_LAND, cam), 40, W - 40, (140, 255, 170), a_land)

    eb = everest_base(t)
    if eb is not None:
        # splash as Everest hits the surface
        if 26.1 < t < 27.4:
            r = np.random.default_rng(11)
            ts = t - 26.12
            y0 = zy(0, cam)
            for i in range(90):
                vx = r.uniform(-1, 1) * 420
                vy = r.uniform(0.4, 1.0) * 900
                x = ux(TX, cam) + r.uniform(-1, 1) * E_HALF * cam[3] * 0.9 + vx * ts
                y = y0 - (vy * ts - 0.5 * 1800 * ts * ts)
                if y > y0:
                    continue
                rad = r.uniform(3, 9)
                al = int(220 * (1 - seg(t, 26.1, 27.4)))
                d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=(235, 250, 255, al))
        # bubbles stream off the sinking mountain
        if 26.15 < t < 31.0:
            r = np.random.default_rng(12)
            for i in range(140):
                birth = r.uniform(26.15, 28.2)
                age = t - birth
                if age < 0:
                    continue
                bx = TX + r.uniform(-1, 1) * E_HALF * 0.9
                bz0 = everest_base(birth) + max(everest_top(np.array([bx - TX]))[0], 0) * r.uniform(0.2, 1)
                bz = bz0 + age * 2.6
                if bz > -0.02:
                    continue
                x = ux(bx, cam) + np.sin(age * 4 + i) * 6
                y = zy(bz, cam)
                rad = r.uniform(2, 6)
                al = int(170 * min(1, age * 3) * (1 - seg(t, 29.8, 31.0)))
                d.ellipse([x - rad, y - rad, x + rad, y + rad], outline=(200, 240, 255, al), width=2)

    # bracket: peak -> surface
    a_br = ease(seg(t, 28.7, 29.2)) * (1 - ease(seg(t, 30.6, 31.0)))
    if a_br > 0 and eb is not None:
        yp, ys = zy(eb + EVEREST, cam), zy(0, cam)
        x = ux(TX, cam) + 120
        col = (255, 214, 120, int(255 * a_br))
        d.line([(x, ys + 4), (x, yp - 4)], fill=col, width=5)
        d.line([(x - 18, ys + 4), (x + 18, ys + 4)], fill=col, width=5)
        d.line([(x - 18, yp - 4), (x + 18, yp - 4)], fill=col, width=5)
    return np.asarray(im).copy()
