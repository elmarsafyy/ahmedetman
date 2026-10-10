"""Low-altitude perspective flyovers (ground-plane projection with mip-mapped textures).

* water cycle (31.3 - 39.3 s): over the sea, clouds build, follow them inland
  where they thin out and the rain fails.
* desert -> winter (43.3 - 50.1 s): cracked interior under an oppressive sun,
  then the same ground frozen in a blizzard.
"""
import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree
import core as C
from core import seg, ease, ease_io, lerp, smoothstep

W, H = C.W, C.H
GW, GH = 2048, 4096
COAST = 1300.0


def _noise(h, w, beta, seed):
    r = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1
    a = f ** (-beta / 2)
    a[0, 0] = 0
    n = np.fft.irfft2(a * np.exp(1j * r.uniform(0, 6.283, a.shape)), s=(h, w))
    return ((n - n.mean()) / n.std()).astype(np.float32)


def _build():
    yy, xx = np.mgrid[0:GH, 0:GW].astype(np.float32)
    hN = _noise(GH, GW, 3.0, 31)
    dN = _noise(GH, GW, 2.2, 32)
    coast = COAST + 70 * _noise(1, GW, 3.2, 33)[0]
    dy = yy - coast[None, :]

    # relief: rolling hills near the coast, dunes and pans deep inland
    dunes = np.sin(xx * 0.045 + yy * 0.012 + hN * 2.5) * smoothstep(1300, 2200, dy)
    hgt = hN * 14 + dunes * 4 + dN * 1.2
    gy, gx = np.gradient(hgt)
    shade = np.clip(1.0 + (-gx * 0.55 - gy * 0.35) * 0.9, 0.55, 1.45)

    ks = np.array([0, 25, 60, 260, 650, 1100, 1700, 2600], np.float32)
    cs = np.array([(0.85, 0.78, 0.60), (0.80, 0.72, 0.52), (0.24, 0.40, 0.16), (0.30, 0.42, 0.18),
                   (0.55, 0.50, 0.30), (0.74, 0.60, 0.38), (0.80, 0.55, 0.32), (0.72, 0.42, 0.24)], np.float32)
    var = dy + dN * 12
    col = np.stack([np.interp(var, ks, cs[:, i]) for i in range(3)], -1)
    col *= (0.88 + 0.12 * np.clip(hN, -2, 2)[..., None] * 0.5)

    # river channels running to the sea: wet near the coast, dry beds inland
    q = xx * 0.0035 + hN * 0.55 + dN * 0.05
    fr = np.abs(((q + 0.5) % 1.0) - 0.5)
    wid = 0.004 + 0.002 * smoothstep(0, 1500, dy)
    river = (fr < wid) & (dy > 10) & (dy < 2400)
    wet = smoothstep(900, 500, dy)
    rcol = (np.array([0.10, 0.32, 0.45], np.float32) * wet[..., None]
            + np.array([0.86, 0.78, 0.64], np.float32) * (1 - wet[..., None]))
    col = np.where(river[..., None], rcol, col)

    # cracked mud in the deep interior (Voronoi edges)
    y0 = 2300
    r = np.random.default_rng(34)
    pts = np.stack([r.uniform(0, GW, 26000), r.uniform(y0 - 50, GH + 50, 26000)], 1)
    pts = np.concatenate([pts, pts + [GW, 0], pts - [GW, 0]])
    tree = cKDTree(pts)
    sub = np.stack([xx[y0:].ravel(), yy[y0:].ravel()], 1)
    dd, _ = tree.query(sub, k=2, workers=-1)
    edge = (dd[:, 1] - dd[:, 0]).reshape(GH - y0, GW)
    crack = np.zeros((GH, GW), np.float32)
    crack[y0:] = smoothstep(1.6, 0.4, edge) * smoothstep(y0, y0 + 500, yy[y0:])
    col = col * (1 - 0.55 * crack[..., None])
    col = col * shade[..., None]
    col[dy < 0] = 0
    sea = (dy < 0).astype(np.float32)

    levels = [col]
    for s in (1.2, 3.0, 7.0):
        levels.append(ndimage.gaussian_filter(col, (s, s, 0), mode=("nearest", "wrap", "nearest")))
    mip = np.stack(levels).astype(np.float32)
    return mip, sea, coast, crack


MIP, SEA, COASTLINE, CRACK = _build()
CT = (smoothstep(-0.2, 1.6, _noise(1024, 1024, 3.2, 41)) ** 1.2).astype(np.float32)
CT_B = ndimage.gaussian_filter(CT, 5, mode="wrap")
WN = _noise(512, 512, 1.5, 42)


def _sample_mip(x, y, lev):
    """Bilinear sample from mip level `lev` (int array), x wraps, y clamps."""
    x = x % GW - 0.5
    y = np.clip(y - 0.5, 0, GH - 1.001)
    x0 = np.floor(x)
    y0 = np.floor(y)
    fx = (x - x0)[..., None].astype(np.float32)
    fy = (y - y0)[..., None].astype(np.float32)
    x0 = x0.astype(np.int64) % GW
    y0 = y0.astype(np.int64)
    x1 = (x0 + 1) % GW
    y1 = np.minimum(y0 + 1, GH - 1)
    base = lev.astype(np.int64) * GH * GW
    flat = MIP.reshape(-1, 3)
    a = flat[base + y0 * GW + x0]
    b = flat[base + y0 * GW + x1]
    c = flat[base + y1 * GW + x0]
    d = flat[base + y1 * GW + x1]
    ab = a + (b - a) * fx
    cd = c + (d - c) * fx
    return ab + (cd - ab) * fy


def _tex(tex, x, y):
    h, w = tex.shape
    return C.sample(tex, x / w, (y / h) % 1.0)


def moisture(y):
    return np.where(y < COAST, 1.0, np.exp(-np.maximum(y - COAST, 0) / 650.0))


def _hermite(t, keys):
    ts = np.array([k[0] for k in keys])
    ys = np.array([k[1] for k in keys], np.float64)
    m = np.gradient(ys, ts)
    i = int(np.clip(np.searchsorted(ts, t) - 1, 0, len(ts) - 2))
    h = ts[i + 1] - ts[i]
    s = np.clip((t - ts[i]) / h, 0, 1)
    h00, h10, h01, h11 = 2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2
    return float(h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1])


def render_plane(t, xcam, ycam, h, f, hy, sky_fn, ground_post=None, hc=None, cloud_fn=None, haze=(0.75, 0.8, 0.9),
                 haze_k=3500.0, shimmer=0.0, yaw=0.0):
    img = np.zeros((H, W, 3), np.float32)
    rows = np.arange(H, dtype=np.float32)
    cols = np.arange(W, dtype=np.float32) - W / 2
    hz = np.asarray(haze, np.float32)

    g0 = int(np.floor(hy)) + 1
    r = rows[g0:][:, None]
    z = h * f / np.maximum(r - hy, 0.35)
    z = np.minimum(z, 40000)
    if shimmer > 0:
        near_h = np.exp(-(r - hy) / 90.0)
        cols_g = cols[None, :] + np.sin(r * 0.33 + t * 9.0 + cols[None, :] * 0.01) * shimmer * near_h
    else:
        cols_g = np.broadcast_to(cols[None, :], (r.size, W))
    wx = xcam + cols_g * z / f + yaw * z
    wy = ycam + z
    lev = np.clip(np.log2(np.maximum(z / f, 1e-3) * 1.5), 0, 3)
    lo = np.floor(lev).astype(np.int32)
    hi = np.minimum(lo + 1, 3)
    fr = (lev - lo)[..., None]
    lo_b = np.broadcast_to(lo, wx.shape)
    hi_b = np.broadcast_to(hi, wx.shape)
    gcol = _sample_mip(wx, wy, lo_b) * (1 - fr) + _sample_mip(wx, wy, hi_b) * fr
    sea = _tex(SEA, wx, np.clip(wy, 0, GH - 1)) if False else (wy < np.interp(wx % GW, np.arange(GW), COASTLINE))
    if ground_post is not None:
        gcol = ground_post(gcol, wx, wy, z, sea, r)
    fog = (1 - np.exp(-z / haze_k))[..., None]
    gcol = gcol * (1 - fog) + hz * fog
    img[g0:] = gcol

    # sky + clouds
    sky = sky_fn(rows[:g0])
    img[:g0] = sky
    if cloud_fn is not None and hc is not None:
        rs = rows[:g0][:, None]
        zc = hc * f / np.maximum(hy - rs, 0.35)
        zc = np.minimum(zc, 40000)
        cx = xcam + cols[None, :] * zc / f + yaw * zc
        cy = ycam + zc
        dens, ccol = cloud_fn(cx, cy, zc)
        a = (dens * np.exp(-zc / 14000.0))[..., None]
        img[:g0] = img[:g0] * (1 - a) + ccol * a
    return img, g0


# ------------------------------------------------------------------ water cycle
def _sea_post(t, sun_col):
    def post(gcol, wx, wy, z, sea, r):
        n = _tex(WN, wx * 0.6 + t * 12, wy * 0.6 - t * 6) + 0.5 * _tex(WN, wx * 1.7 - t * 20, wy * 1.7)
        fres = smoothstep(200, 4000, z)[..., None]
        deep = np.array([0.03, 0.20, 0.38], np.float32)
        shallow = np.array([0.08, 0.45, 0.55], np.float32)
        dist_coast = np.interp(wx % GW, np.arange(GW), COASTLINE) - wy
        wcol = deep + (shallow - deep) * smoothstep(120, 0, dist_coast)[..., None]
        wcol = wcol * (0.9 + 0.08 * n[..., None])
        sky_ref = np.array([0.55, 0.70, 0.88], np.float32)
        wcol = wcol * (1 - fres * 0.6) + sky_ref * fres * 0.6
        glint = np.maximum(n - 1.6, 0) ** 2 * 0.9
        cxs = np.arange(W, dtype=np.float32)[None, :]
        lane = np.exp(-((cxs - W * 0.66) / 260) ** 2)
        wcol = wcol + (glint * lane)[..., None] * sun_col
        return np.where(sea[..., None], wcol, gcol)
    return post


def water_cycle(t):
    ycam = _hermite(t, [(31.0, -500), (33.0, -100), (36.3, 1150), (39.4, 2750)])
    xcam = 900 + 40 * np.sin(t * 0.3)
    h, f = 95.0, 900.0
    hy = 690 + 8 * np.sin(t * 0.7)
    form = smoothstep(31.6, 34.6, t)
    sun = np.array([1.0, 0.92, 0.75], np.float32)

    def sky(rows):
        k = smoothstep(0, 690, 690 - rows)[:, None, None] * np.ones((1, W, 1), np.float32)
        top = np.array([0.18, 0.42, 0.85], np.float32)
        hor = np.array([0.80, 0.86, 0.93], np.float32)
        s = hor * (1 - k) + top * k
        xs = np.arange(W, dtype=np.float32)[None, :, None]
        rr = np.sqrt((xs - W * 0.66) ** 2 + (rows[:, None, None] - 300) ** 2)
        s = s + np.exp(-rr / 70) * 1.4 + np.exp(-rr / 300) * 0.25 * np.array([1.0, 0.9, 0.7], np.float32)
        return s

    def clouds(cx, cy, zc):
        m = moisture(cy) * form
        d1 = _tex(CT, cx / 2.2 + t * 6, cy / 2.2)
        d2 = _tex(CT_B, cx / 2.2 + t * 6, cy / 2.2)
        dens = smoothstep(0.05, 0.33, d1 * (0.35 + 0.65 * m)) * smoothstep(0.02, 0.5, m)
        shade = 0.45 + 0.6 * d2 + 0.25 * smoothstep(0.3, 0.8, d1)
        col = np.array([0.97, 0.98, 1.0], np.float32) * shade[..., None]
        return np.clip(dens * 1.3, 0, 0.97), col

    def post(gcol, wx, wy, z, sea, r):
        gcol = _sea_post(t, sun)(gcol, wx, wy, z, sea, r)
        m = moisture(wy) * form
        sh = smoothstep(0.12, 0.45, _tex(CT, (wx - 150) / 2.2 + t * 6, (wy - 300) / 2.2)) * smoothstep(0.02, 0.5, m)
        return gcol * (1 - 0.35 * sh[..., None])

    img, g0 = render_plane(t, xcam, ycam, h, f, hy, sky, post, hc=240.0, cloud_fn=clouds, haze=(0.78, 0.84, 0.92))

    # evaporation wisps rising off the water
    ev = smoothstep(32.2, 33.0, t) * (1 - smoothstep(35.8, 36.6, t))
    if ev > 0:
        rng = np.random.default_rng(51)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        acc = np.zeros((H, W), np.float32)
        for i in range(70):
            wy = rng.uniform(ycam + 450, ycam + 1800)
            if wy > COAST:
                continue
            wx = xcam + rng.uniform(-1, 1) * (wy - ycam) * 0.6
            ph = (t * 0.45 + rng.uniform(0, 1)) % 1.0
            rise = ph * 150
            z = wy - ycam
            sx = W / 2 + (wx - xcam) * f / z
            sy = hy + (h - rise) * f / z
            rad = (7 + ph * 16) * f / z
            if sx < -rad or sx > W + rad:
                continue
            x0, x1 = int(max(0, sx - 3 * rad)), int(min(W, sx + 3 * rad))
            y0, y1 = int(max(0, sy - 3 * rad)), int(min(H, sy + 3 * rad))
            if x1 <= x0 or y1 <= y0:
                continue
            g = np.exp(-(((xx[y0:y1, x0:x1] - sx) ** 2 + (yy[y0:y1, x0:x1] - sy) ** 2) / (rad * rad)))
            acc[y0:y1, x0:x1] += g * (np.sin(np.pi * ph) * 0.16)
        img += (acc * ev)[..., None] * np.array([0.9, 0.95, 1.0], np.float32)

    # rain streaks while the clouds still hold water
    rain = smoothstep(33.4, 34.6, t) * float(moisture(np.array([ycam + 600.0]))[0])
    if rain > 0.02:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        s = _tex(WN, xx * 0.9 + yy * 0.12, yy * 0.06 - t * 90)
        streak = smoothstep(1.4, 2.4, s) * rain * 0.35
        img = img * (1 - streak[..., None] * 0.4) + streak[..., None] * np.array([0.8, 0.85, 0.9], np.float32)
    return img, None


# ------------------------------------------------------------------ desert -> winter
def desert_winter(t):
    w = ease(seg(t, 47.75, 48.35))
    ycam = 2950 + 38 * (t - 43.3)
    xcam = 400 - 12 * (t - 43.3)
    h, f = 16.0, 1000.0
    hy = 830.0
    sun = np.array([1.0, 0.85, 0.55], np.float32)

    def sky(rows):
        k = smoothstep(0, hy, hy - rows)[:, None, None] * np.ones((1, W, 1), np.float32)
        hot_t, hot_h = np.array([0.55, 0.62, 0.78], np.float32), np.array([1.0, 0.86, 0.62], np.float32)
        cold_t, cold_h = np.array([0.36, 0.44, 0.56], np.float32), np.array([0.78, 0.82, 0.88], np.float32)
        s_hot = hot_h * (1 - k) + hot_t * k
        s_cold = cold_h * (1 - k) + cold_t * k
        xs = np.arange(W, dtype=np.float32)[None, :, None]
        rr = np.sqrt((xs - W * 0.60) ** 2 + (rows[:, None, None] - 360) ** 2)
        s_hot = s_hot + (np.exp(-rr / 85) * 3.0 + np.exp(-rr / 420) * 0.55) * sun
        s_cold = s_cold + np.exp(-rr / 120) * 0.25
        return s_hot * (1 - w) + s_cold * w

    def post(gcol, wx, wy, z, sea, r):
        if w <= 0:
            return gcol * 1.12
        lum = gcol @ np.array([0.3, 0.6, 0.1], np.float32)
        cr = _tex(CRACK, wx, np.clip(wy, 0, GH - 1))
        ice = np.array([0.78, 0.86, 0.96], np.float32) * (0.55 + 0.6 * lum[..., None])
        ice = ice * (1 - 0.45 * cr[..., None]) + np.array([0.0, 0.02, 0.05], np.float32) * cr[..., None]
        drift = smoothstep(0.2, 1.5, _tex(WN, wx * 0.5 - t * 40, wy * 0.5))
        ice = ice + drift[..., None] * 0.18
        return gcol * 1.12 * (1 - w) + ice * w

    haze = tuple(np.array([0.95, 0.78, 0.55]) * (1 - w) + np.array([0.80, 0.84, 0.90]) * w)
    img, g0 = render_plane(t, xcam, ycam, h, f, hy, sky, post, haze=haze, haze_k=2600 - 1500 * w,
                           shimmer=9.0 * (1 - w), yaw=0.0)

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    if w < 1:   # blowing dust
        dn = _tex(WN, xx * 0.25 - t * 160, yy * 0.9)
        dust = smoothstep(0.5, 2.2, dn) * smoothstep(hy - 120, hy + 500, yy) * 0.30 * (1 - w)
        img = img * (1 - dust[..., None]) + dust[..., None] * np.array([0.95, 0.72, 0.45], np.float32)
    if w > 0:   # blizzard: two layers of wind-driven snow + whiteout
        for sc, sp, a in ((0.55, 900, 0.95), (1.0, 700, 0.8), (1.6, 520, 0.6)):
            u = xx * sc * 0.08 + yy * sc * 0.03 - t * sp * 0.08
            v = yy * sc * 0.5 - xx * sc * 0.2 - t * sp * 0.6
            s = _tex(WN, u * 6, v * 0.35)
            flake = smoothstep(1.3, 2.2, s) * a * w
            img = img * (1 - flake[..., None]) + flake[..., None] * np.array([0.95, 0.97, 1.0], np.float32)
        white = 0.30 * w * (0.8 + 0.2 * np.sin(t * 3.0))
        img = img * (1 - white) + white * np.array([0.85, 0.89, 0.95], np.float32)
    grade = ((1.0 + 0.06 * (1 - w) - 0.06 * w, 1.0 - 0.01 * w, 1.0 - 0.10 * (1 - w) + 0.08 * w), (0, 0, 0))
    return img, grade
