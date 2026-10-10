"""Sunlit upper ocean full of phytoplankton (53.9 - 61.6 s)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import core as C
from core import seg, ease, ease_io, lerp, smoothstep

W, H = C.W, C.H
S = 192  # sprite canvas
SNOW, CENTRIC, PENNATE, CHAIN, DINO = range(5)
RIM = (170, 240, 255)
CHL = (140, 215, 90)
GOLDC = (230, 190, 90)


def _canvas():
    return Image.new("RGBA", (S, S), (0, 0, 0, 0))


def _centric(rng):
    im = _canvas()
    d = ImageDraw.Draw(im)
    c, r = S / 2, S * 0.36
    d.ellipse([c - r, c - r, c + r, c + r], fill=(60, 120, 120, 70), outline=RIM + (230,), width=4)
    for k in range(48):
        a = k / 48 * 2 * np.pi
        d.line([(c + np.cos(a) * r * 0.25, c + np.sin(a) * r * 0.25), (c + np.cos(a) * r * 0.95, c + np.sin(a) * r * 0.95)],
               fill=RIM + (70,), width=1)
    for rr in (0.45, 0.7):
        d.ellipse([c - r * rr, c - r * rr, c + r * rr, c + r * rr], outline=RIM + (90,), width=2)
    for _ in range(14):
        a, q = rng.uniform(0, 2 * np.pi), rng.uniform(0.1, 0.65) * r
        x, y, s = c + np.cos(a) * q, c + np.sin(a) * q, rng.uniform(5, 10)
        d.ellipse([x - s, y - s * 0.7, x + s, y + s * 0.7], fill=(GOLDC if rng.random() < 0.5 else CHL) + (200,))
    return im


def _pennate(rng):
    im = _canvas()
    d = ImageDraw.Draw(im)
    c = S / 2
    rx, ry = S * 0.44, S * 0.12
    d.ellipse([c - rx, c - ry, c + rx, c + ry], fill=(60, 120, 110, 80), outline=RIM + (230,), width=3)
    for k in range(-16, 17):
        x = c + k / 17 * rx * 0.92
        h = ry * np.sqrt(max(0, 1 - (k / 17) ** 2)) * 0.85
        d.line([(x, c - h), (x, c + h)], fill=RIM + (80,), width=1)
    d.line([(c - rx * 0.85, c), (c + rx * 0.85, c)], fill=RIM + (120,), width=2)
    for sgn in (-1, 1):
        d.ellipse([c + sgn * rx * 0.45 - 22, c - ry * 0.6, c + sgn * rx * 0.45 + 22, c + ry * 0.6], fill=GOLDC + (190,))
    return im


def _chain(rng):
    im = _canvas()
    d = ImageDraw.Draw(im)
    n = 4
    w = S * 0.18
    x0 = S / 2 - n * w / 2
    for i in range(n):
        x = x0 + i * w
        d.rounded_rectangle([x + 2, S / 2 - w * 0.55, x + w - 2, S / 2 + w * 0.55], radius=10,
                            fill=(60, 120, 110, 90), outline=RIM + (220,), width=3)
        d.ellipse([x + w * 0.25, S / 2 - w * 0.25, x + w * 0.75, S / 2 + w * 0.25], fill=CHL + (210,))
        for sgn in (-1, 1):
            a = rng.uniform(0.6, 1.2) * sgn
            d.line([(x + w / 2, S / 2 + sgn * w * 0.5), (x + w / 2 + np.sin(a) * S * 0.12, S / 2 + sgn * S * 0.40)],
                   fill=RIM + (150,), width=2)
    return im


def _dino(rng):
    im = _canvas()
    d = ImageDraw.Draw(im)
    c = S / 2
    r = S * 0.17
    for (dx, dy, l) in ((0, -1, 0.42), (-0.45, 1, 0.34), (0.35, 1, 0.26)):
        d.line([(c, c), (c + dx * S * 0.2, c + dy * S * l)], fill=RIM + (200,), width=9)
        d.line([(c, c), (c + dx * S * 0.2, c + dy * S * l)], fill=(80, 140, 120, 160), width=5)
    d.ellipse([c - r, c - r * 1.1, c + r, c + r * 1.1], fill=(70, 130, 110, 120), outline=RIM + (230,), width=3)
    d.line([(c - r, c), (c + r, c)], fill=RIM + (160,), width=3)
    d.ellipse([c - r * 0.5, c - r * 0.5, c + r * 0.5, c + r * 0.5], fill=GOLDC + (200,))
    return im


def _snow(rng):
    im = _canvas()
    d = ImageDraw.Draw(im)
    c, r = S / 2, S * 0.18
    d.ellipse([c - r, c - r, c + r, c + r], fill=(220, 240, 245, 200))
    return im.filter(ImageFilter.GaussianBlur(S * 0.06))


_rng = np.random.default_rng(61)
BASE = {SNOW: [_snow(_rng)],
        CENTRIC: [_centric(_rng) for _ in range(3)],
        PENNATE: [_pennate(_rng) for _ in range(3)],
        CHAIN: [_chain(_rng) for _ in range(3)],
        DINO: [_dino(_rng) for _ in range(3)]}
SIZES = np.array([6, 9, 13, 18, 26, 36, 50, 70, 96, 130, 180, 240], np.float32)
_CACHE = {}


def sprite(kind, var, rot, size_i, blur_i):
    key = (kind, var, rot, size_i, blur_i)
    if key not in _CACHE:
        im = BASE[kind][var]
        if kind != SNOW:
            im = im.rotate(rot * 22.5, resample=Image.BICUBIC)
            glow = im.filter(ImageFilter.GaussianBlur(10))
            im = Image.alpha_composite(glow, im)
        sz = int(SIZES[size_i])
        im = im.resize((sz, sz), Image.LANCZOS)
        if blur_i > 0:
            pad = int(blur_i * 3 + 2)
            big = Image.new("RGBA", (sz + 2 * pad, sz + 2 * pad), (0, 0, 0, 0))
            big.paste(im, (pad, pad))
            im = big.filter(ImageFilter.GaussianBlur(blur_i * 1.3 + sz * 0.012 * blur_i))
        a = np.asarray(im).astype(np.float32) / 255.0
        _CACHE[key] = (a[..., :3] * a[..., 3:4], a[..., 3:4])
    return _CACHE[key]


N = 1100
r = np.random.default_rng(62)
KIND = r.choice([SNOW, CENTRIC, PENNATE, CHAIN, DINO], N, p=[0.52, 0.16, 0.13, 0.11, 0.08])
VAR = r.integers(0, 3, N)
ROT = r.integers(0, 16, N)
PX = r.uniform(-7, 7, N)
PY = r.uniform(-12, 12, N)
PZ = r.uniform(0.6, 15, N)
SZ = np.where(KIND == SNOW, r.uniform(0.02, 0.06, N), r.uniform(0.2, 0.5, N))
RANK = r.uniform(0, 1, N)
DRIFT = r.normal(0, 0.05, (N, 2))


def cam_z(t):
    if t < 58.45:
        return 2.2 * ease_io(seg(t, 53.9, 58.45))
    return lerp(2.2, -3.2, ease_io(seg(t, 58.45, 61.7)))


def render(t):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    k = (yy / H)[..., None]
    top = np.array([0.10, 0.60, 0.72], np.float32)
    mid = np.array([0.03, 0.30, 0.52], np.float32)
    bot = np.array([0.01, 0.10, 0.26], np.float32)
    img = np.where(k < 0.45, top + (mid - top) * (k / 0.45), mid + (bot - mid) * ((k - 0.45) / 0.55))
    thin = ease(seg(t, 59.6, 61.2))
    # sun glow + god rays from above
    sx, sy = W * 0.5 + 60 * np.sin(t * 0.2), -260
    ang = np.arctan2(xx - sx, yy - sy)
    rr = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2)
    rays = (np.sin(ang * 37 + t * 0.35) * 0.5 + 0.5) * (np.sin(ang * 23 - t * 0.27 + 1.3) * 0.5 + 0.5) \
        * (np.sin(ang * 61 + t * 0.6 + 0.4) * 0.5 + 0.5)
    rays = rays ** 1.5 * np.exp(-rr / 1500) * (1 - 0.35 * thin)
    img = img + rays[..., None] * np.array([0.26, 0.42, 0.36], np.float32)
    img = img + (np.exp(-rr / 500) * 0.55)[..., None] * np.array([0.6, 0.85, 0.8], np.float32)
    caust = np.sin(xx * 0.05 + np.sin(yy * 0.03 + t * 1.5) * 2) * np.sin(yy * 0.045 - t * 1.1 + np.sin(xx * 0.02) * 2)
    img = img + (smoothstep(0.6, 1.0, caust) * np.exp(-yy / 260) * 0.25)[..., None]

    cz = cam_z(t)
    f = 760.0
    zr = PZ - cz
    order = np.argsort(-zr)
    fog_col = np.array([0.04, 0.32, 0.50], np.float32)
    focus = 3.2
    for i in order:
        z = zr[i]
        if z < 0.25:
            continue
        x = PX[i] + DRIFT[i, 0] * (t - 54) + 0.03 * np.sin(t * 0.5 + i)
        y = PY[i] + DRIFT[i, 1] * (t - 54) + 0.04 * (t - 54)
        px = W / 2 + x / z * f
        py = H / 2 - y / z * f
        size = SZ[i] / z * f
        if size < 3 or size > 300:
            continue
        if not (-size < px < W + size and -size < py < H + size):
            continue
        a_vis = 1.0
        if KIND[i] != SNOW:
            a_vis = smoothstep(RANK[i] - 0.06, RANK[i], 1 - 0.72 * thin)
            if a_vis <= 0:
                continue
        si = int(np.argmin(np.abs(SIZES - size)))
        bi = int(min(3, abs(np.log(z / focus)) * 2.2))
        rgb, al = sprite(int(KIND[i]), int(VAR[i]) if KIND[i] != SNOW else 0, int(ROT[i]), si, bi)
        hgt, wid = al.shape[:2]
        x0, y0 = int(px - wid / 2), int(py - hgt / 2)
        xa, ya = max(0, x0), max(0, y0)
        xb, yb = min(W, x0 + wid), min(H, y0 + hgt)
        if xb <= xa or yb <= ya:
            continue
        fog = float(np.exp(-z / 9.0))
        bright = 1.25 * fog * a_vis
        sub_rgb = rgb[ya - y0:yb - y0, xa - x0:xb - x0]
        sub_a = al[ya - y0:yb - y0, xa - x0:xb - x0] * (0.25 + 0.75 * fog) * a_vis
        reg = img[ya:yb, xa:xb]
        img[ya:yb, xa:xb] = reg * (1 - sub_a) + (sub_rgb * bright + fog_col * (1 - fog) * sub_a)
    if thin > 0:
        lum = img @ np.array([0.3, 0.6, 0.1], np.float32)
        img = img * (1 - 0.35 * thin) + lum[..., None] * 0.35 * thin
        img = img * (1 - 0.18 * thin)
    return img, None
