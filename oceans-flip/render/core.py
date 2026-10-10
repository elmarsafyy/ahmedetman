"""Shared rendering primitives: globe ray-caster, sampling, grading, text."""
import os
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
FPS = 30
CACHE = os.environ.get("OF_CACHE", "cache")
FONT_DIR = "/usr/share/fonts/opentype/inter"

_E = np.load(os.path.join(CACHE, "earth.npz"))
BM = _E["bm"].astype(np.float32) / 255.0
BM = BM ** 1.15 * 1.12                      # Blue Marble is flat; add a little punch
FLIP = _E["flip"].astype(np.float32) / 255.0
LAND = _E["land"]
CLOUDS = _E["clouds"]
MOIST_FLIP = _E["moist_flip"]
DSEA_FLIP = _E["dsea_flip"]
N1 = _E["n1"]
TH, TW = LAND.shape


# ---------------------------------------------------------------- utilities
def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def ease(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def ease_io(t):
    t = np.clip(t, 0.0, 1.0)
    return np.where(t < 0.5, 4 * t ** 3, 1 - (-2 * t + 2) ** 3 / 2)


def ease_out(t, p=3):
    t = np.clip(t, 0.0, 1.0)
    return 1 - (1 - t) ** p


def lerp(a, b, t):
    return a + (b - a) * t


def seg(t, t0, t1):
    """0..1 progress of t across [t0, t1]."""
    return float(np.clip((t - t0) / (t1 - t0), 0, 1))


def sample(tex, u, v):
    """Bilinear sample of an equirect texture; u wraps (lon), v clamps (lat, 0=N)."""
    h, w = tex.shape[:2]
    x = (u % 1.0) * w - 0.5
    y = np.clip(v * h - 0.5, 0, h - 1.001)
    x0 = np.floor(x)
    y0 = np.floor(y)
    fx = (x - x0).astype(np.float32)
    fy = (y - y0).astype(np.float32)
    x0 = x0.astype(np.int32) % w
    y0 = y0.astype(np.int32)
    x1 = x0 + 1
    x1[x1 == w] = 0
    i00 = y0 * w + x0
    i01 = y0 * w + x1
    last = y0 >= h - 1
    i10 = np.where(last, i00, i00 + w)
    i11 = np.where(last, i01, i01 + w)
    if tex.ndim == 3:
        flat = tex.reshape(h * w, -1)
        fx = fx[..., None]
        fy = fy[..., None]
    else:
        flat = tex.ravel()
    a, b, c, d = flat[i00], flat[i01], flat[i10], flat[i11]
    ab = a + (b - a) * fx
    cd = c + (d - c) * fx
    return ab + (cd - ab) * fy


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], np.float32)


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], np.float32)


def norm(v):
    v = np.asarray(v, np.float32)
    return v / np.linalg.norm(v)


def lonlat_to_vec(lon, lat):
    lon, lat = np.radians(lon), np.radians(lat)
    return np.array([np.cos(lat) * np.sin(lon), np.sin(lat), np.cos(lat) * np.cos(lon)], np.float32)


def face_rotation(lon, lat, roll=0.0):
    """World->view rotation that brings (lon, lat) to face the camera (view -z)."""
    return rot_x(np.radians(-lat)) @ rot_y(np.radians(180 - lon))


# ---------------------------------------------------------------- background
def _space_bg():
    rng = np.random.default_rng(3)
    h, w = H + 400, W + 400

    def noise(beta, seed):
        r = np.random.default_rng(seed)
        fy = np.fft.fftfreq(h)[:, None]
        fx = np.fft.rfftfreq(w)[None, :]
        f = np.sqrt(fx ** 2 + fy ** 2)
        f[0, 0] = 1
        a = f ** (-beta / 2)
        a[0, 0] = 0
        n = np.fft.irfft2(a * np.exp(1j * r.uniform(0, 6.283, a.shape)), s=(h, w))
        return ((n - n.min()) / (n.max() - n.min())).astype(np.float32)

    n1, n2, n3 = noise(3.4, 21), noise(2.6, 22), noise(3.0, 23)
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    base = np.array([0.012, 0.016, 0.055], np.float32) * (1 - yy) + np.array([0.035, 0.02, 0.075], np.float32) * yy
    img = np.broadcast_to(base, (h, w, 3)).copy()
    neb1 = smoothstep(0.45, 0.85, n1) ** 1.5
    neb2 = smoothstep(0.5, 0.9, n2 * 0.7 + n1 * 0.3) ** 1.8
    img += neb1[..., None] * np.array([0.16, 0.07, 0.30], np.float32)       # violet
    img += neb2[..., None] * np.array([0.04, 0.10, 0.28], np.float32)       # indigo-blue
    img += (smoothstep(0.7, 0.95, n3) ** 2)[..., None] * np.array([0.25, 0.08, 0.20], np.float32) * neb1[..., None]
    # stars
    for count, size, bright in [(5000, 0.6, 0.55), (900, 1.1, 0.9), (110, 1.8, 1.4)]:
        ys = rng.integers(0, h, count)
        xs = rng.integers(0, w, count)
        br = rng.uniform(0.3, 1.0, count) * bright
        tint = rng.uniform(0, 1, count)
        col = np.stack([0.8 + 0.2 * tint, 0.85 + 0.1 * tint, 1.0 - 0.15 * tint], 1)
        layer = np.zeros((h, w, 3), np.float32)
        layer[ys, xs] = col * br[:, None]
        if size > 0.7:
            from scipy import ndimage
            layer = ndimage.gaussian_filter(layer, (size, size, 0)) * (size * 3.5) ** 2 / 4
        img += layer
    return img


_BG = None


def space(t, zoom=1.0, dx=0.0, dy=0.0):
    global _BG
    if _BG is None:
        _BG = _space_bg()
    h, w = _BG.shape[:2]
    ox = int(200 + dx + 25 * np.sin(t * 0.05))
    oy = int(200 + dy - t * 2.0) % 200
    out = _BG[oy:oy + H, ox:ox + W]
    if out.shape[:2] != (H, W):
        out = _BG[:H, :W]
    return out.copy()


# ---------------------------------------------------------------- globe
def globe(img, R, cx, cy, rotm, sun, surface, dist=3.6, cloud_amt=0.85, cloud_shift=0.0,
          cloud_mod=None, atmo=1.0, spec=1.0, night=0.06, halo_w=0.06, atmo_col=(0.32, 0.58, 1.0)):
    """Ray-cast a lit planet into `img` (float HxWx3, modified in place).

    surface(u, v, n_world) -> (rgb, ocean_mask[0..1], emissive or None)
    rotm: 3x3 world->view rotation. sun: view-space direction toward the sun.
    """
    f = R * np.sqrt(dist ** 2 - 1)
    pad = R * (1 + 4 * halo_w) + 4
    x0, x1 = int(max(0, cx - pad)), int(min(W, cx + pad))
    y0, y1 = int(max(0, cy - pad)), int(min(H, cy + pad))
    if x1 <= x0 or y1 <= y0:
        return img
    ys, xs = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    vx = (xs + 0.5 - cx) / f
    vy = -(ys + 0.5 - cy) / f
    inv = 1.0 / np.sqrt(vx * vx + vy * vy + 1)
    vx *= inv
    vy *= inv
    vz = inv
    b = -dist * vz
    md2 = dist * dist - b * b                          # squared closest approach
    disc = 1.0 - md2
    hit = disc > 0
    L = norm(sun)
    out = img[y0:y1, x0:x1]
    md = np.sqrt(np.maximum(md2, 0))

    # anti-aliased limb coverage (in pixels)
    px_per_unit = f / dist
    cover = np.clip((1.0 - md) * px_per_unit + 0.5, 0, 1)

    # ---- outer halo
    cpx, cpy, cpz = -b * vx, -b * vy, -dist + -b * vz
    cn = np.sqrt(cpx ** 2 + cpy ** 2 + cpz ** 2) + 1e-6
    hl = (cpx * L[0] + cpy * L[1] + cpz * L[2]) / cn
    lit_h = smoothstep(-0.35, 0.6, hl)
    hd = np.maximum(md - 1.0, 0)
    halo = np.exp(-hd / halo_w) * (md > 0.999) * atmo
    acol = np.array(atmo_col, np.float32)
    sunset = np.array([1.0, 0.55, 0.25], np.float32)
    rim_tint = smoothstep(0.35, -0.05, hl)[..., None] * smoothstep(-0.4, 0.0, hl)[..., None]
    hcol = acol * (1 - rim_tint) + sunset * rim_tint
    out += (halo * lit_h * 0.9)[..., None] * hcol

    if not hit.any():
        return img
    idx = np.nonzero(hit)
    t = -b[idx] - np.sqrt(disc[idx])
    px, py, pz = t * vx[idx], t * vy[idx], -dist + t * vz[idx]
    n = np.stack([px, py, pz], 1)
    n /= np.linalg.norm(n, axis=1, keepdims=True)
    nw = n @ rotm                                    # view -> world (rotm orthonormal)
    lon = np.arctan2(nw[:, 0], nw[:, 2])
    lat = np.arcsin(np.clip(nw[:, 1], -1, 1))
    u = lon / (2 * np.pi) + 0.5
    v = 0.5 - lat / np.pi
    rgb, ocean, emis = surface(u, v, nw)

    ndl = n @ L
    lam = np.clip((ndl + 0.06) / 1.06, 0, 1)
    viewv = -np.stack([vx[idx], vy[idx], vz[idx]], 1)
    mu = np.clip(np.sum(n * viewv, 1), 0, 1)

    # clouds
    if cloud_amt > 0:
        ca = sample(CLOUDS, u + cloud_shift, v) * cloud_amt
        if cloud_mod is not None:
            cm = cloud_mod(u, v, nw)
            ca = ca * cm
        sh = sample(CLOUDS, u + cloud_shift + 0.0025, v + 0.0015) * cloud_amt
        if cloud_mod is not None:
            sh = sh * cm
        rgb = rgb * (1 - 0.45 * sh)[:, None]
    else:
        ca = np.zeros_like(u)

    # specular sun glint on water
    hv = L[None, :] + viewv
    hv /= np.linalg.norm(hv, axis=1, keepdims=True)
    ndh = np.clip(np.sum(n * hv, 1), 0, 1)
    n2_ = ndh * ndh; n4_ = n2_ * n2_; n8_ = n4_ * n4_; n16_ = n8_ * n8_; n64_ = n16_ * n16_ * n16_ * n16_
    sp = (n64_ * n16_ * n8_ * n2_ * 0.32 + n8_ * n4_ * 0.05) * ocean * (1 - ca) * spec * smoothstep(0.0, 0.2, ndl)

    terminator = (smoothstep(-0.05, 0.08, ndl) * smoothstep(0.35, 0.08, ndl))[:, None]
    warm = np.array([1.0, 0.62, 0.38], np.float32)
    lit = lam[:, None] * (1 - 0.45 * terminator) + terminator * 0.45 * lam[:, None] * warm * 1.6
    col = rgb * (lit + night * np.array([0.5, 0.7, 1.0], np.float32))
    cloud_c = (lam[:, None] * np.array([1.0, 1.0, 1.0], np.float32) * (1 - 0.3 * terminator)
               + terminator * 0.3 * lam[:, None] * warm + 0.02)
    col = col * (1 - ca[:, None]) + cloud_c * ca[:, None] * 1.02
    col += sp[:, None] * np.array([1.0, 0.92, 0.78], np.float32)
    if emis is not None:
        col += emis
    # inner atmosphere (fresnel)
    om = 1 - mu
    rim = om * om * om * atmo
    lit_r = smoothstep(-0.25, 0.5, ndl)
    col = col * (1 - 0.55 * rim[:, None]) + (rim * lit_r * 1.1)[:, None] * acol
    col = col + (0.06 * om * np.sqrt(om) * lit_r * atmo)[:, None] * acol

    cv = cover[idx][:, None]
    out[idx] = out[idx] * (1 - cv) + col * cv
    return img


def earth_surface(u, v, nw):
    rgb = sample(BM, u, v)
    land = sample(LAND, u, v)
    return rgb, 1 - land, None


def flip_surface(u, v, nw):
    rgb = sample(FLIP, u, v)
    land = sample(LAND, u, v)
    return rgb, land, None


# ---------------------------------------------------------------- post
def tonemap(x):
    x = np.maximum(x, 0) * 1.05
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)


_VIG = None


def finish(img, t, grade=None, sat=1.08, vignette=0.28, bloom=0.35, grain=0.012):
    global _VIG
    if bloom > 0:
        small = Image.fromarray((np.clip(img, 0, 4) / 4 * 255).astype(np.uint8)).resize((W // 6, H // 6), Image.BILINEAR)
        bright = np.asarray(small).astype(np.float32) / 255 * 4
        bright = np.maximum(bright - 0.55, 0)
        bimg = Image.fromarray((np.clip(bright / 3, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))
        bl = np.asarray(bimg.resize((W, H), Image.BILINEAR)).astype(np.float32) / 255 * 3
        img = img + bl * bloom
    out = tonemap(img)
    if grade is not None:
        out = out * np.asarray(grade[0], np.float32) + np.asarray(grade[1], np.float32)
    lum = out @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    out = lum[..., None] + (out - lum[..., None]) * sat
    if _VIG is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2)
        _VIG = (1 - smoothstep(0.55, 1.15, r))[..., None]
    out = out * (1 - vignette + vignette * _VIG)
    if grain > 0:
        rng = np.random.default_rng(int(t * 1000) % 2 ** 31)
        out = out + rng.normal(0, grain, (H // 2, W // 2, 1)).repeat(2, 0).repeat(2, 1).astype(np.float32)
    return (np.clip(out, 0, 1) ** (1 / 1.0) * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------- text
_FONTS = {}


def font(weight, size):
    key = (weight, size)
    if key not in _FONTS:
        name = {"black": "InterDisplay-Black.otf", "xbold": "InterDisplay-ExtraBold.otf",
                "bold": "InterDisplay-Bold.otf", "semi": "InterDisplay-SemiBold.otf",
                "medium": "InterDisplay-Medium.otf"}[weight]
        _FONTS[key] = ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    return _FONTS[key]


_TXT = {}


def text_img(s, weight, size, color=(255, 255, 255), track=0, shadow=True, glow=None):
    key = (s, weight, size, color, track, shadow, glow)
    if key in _TXT:
        return _TXT[key]
    fnt = font(weight, size)
    # measure with tracking
    widths = [fnt.getlength(ch) for ch in s]
    tw = int(sum(widths) + track * (len(s) - 1)) + 2
    asc, desc = fnt.getmetrics()
    th = asc + desc
    m = int(size * 0.6)
    im = Image.new("RGBA", (tw + 2 * m, th + 2 * m), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = m
    for ch, wd in zip(s, widths):
        d.text((x, m), ch, font=fnt, fill=color + (255,))
        x += wd + track
    if shadow or glow:
        a = im.split()[3]
        base = Image.new("RGBA", im.size, (0, 0, 0, 0))
        if shadow:
            sh = a.filter(ImageFilter.GaussianBlur(size * 0.12))
            sh = ImageChops.lighter(sh.point(lambda p: min(255, int(p * 1.1))),
                                    a.filter(ImageFilter.GaussianBlur(max(1, size * 0.03))).point(lambda p: int(p * 0.7)))
            base = Image.composite(Image.new("RGBA", im.size, (2, 6, 20, 255)), base, sh)
        if glow:
            g = a.filter(ImageFilter.GaussianBlur(size * 0.22)).point(lambda p: int(p * 0.55))
            base = Image.alpha_composite(base, Image.composite(Image.new("RGBA", im.size, glow + (255,)),
                                                               Image.new("RGBA", im.size, (0, 0, 0, 0)), g))
        im = Image.alpha_composite(base, im)
    _TXT[key] = im
    return im


def fit_text(s, weight, size, max_w=900, **kw):
    """text_img, shrinking the font until the glyphs fit `max_w` pixels."""
    while size > 20:
        im = text_img(s, weight, size, **kw)
        if im.width - 2 * int(size * 0.6) <= max_w:
            return im
        size = int(size * 0.94)
    return text_img(s, weight, size, **kw)


def put(frame, timg, cx, cy, alpha=1.0, scale=1.0, dy=0.0, blur=0.0):
    """Composite an RGBA text image centred at (cx, cy) onto a uint8 frame (in place)."""
    if alpha <= 0.003:
        return
    im = timg
    if abs(scale - 1) > 1e-3:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BICUBIC)
    if blur > 0.3:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    x = int(cx - im.width / 2)
    y = int(cy + dy - im.height / 2)
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + im.width), min(H, y + im.height)
    if x1 <= x0 or y1 <= y0:
        return
    a = np.asarray(im).astype(np.float32)[y0 - y:y1 - y, x0 - x:x1 - x]
    al = a[..., 3:4] / 255 * alpha
    region = frame[y0:y1, x0:x1].astype(np.float32)
    frame[y0:y1, x0:x1] = (region * (1 - al) + a[..., :3] * al + 0.5).astype(np.uint8)


def reveal(t, t0, dur=0.35, out_t=None, out_dur=0.3):
    """Standard text in/out envelope -> (alpha, dy, scale, blur)."""
    a = ease_out(seg(t, t0, t0 + dur))
    if out_t is not None:
        a *= 1 - ease(seg(t, out_t, out_t + out_dur))
    return float(a), float((1 - a) * 40), float(0.94 + 0.06 * a), float((1 - a) * 6)
