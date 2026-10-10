"""Planet-scale shots: the flip, 71%, dive, distance-to-sea, ocean heat, Pangaea, finale."""
import numpy as np
import core as C
from core import seg, ease, ease_io, ease_out, lerp, smoothstep, sample

GX, GY = 540, 1140            # resting globe centre (text lives above it)
SUN = C.norm([-0.75, 0.30, -0.55])
GOLD = np.array([1.0, 0.62, 0.18], np.float32)
TURQ = np.array([0.15, 0.95, 0.95], np.float32)
NEMO = (-123.39, -48.88)
MARIANA = (142.2, 11.35)


def view_axis_world(rotm, axis=(1, 0, 0)):
    return (rotm.T @ np.asarray(axis, np.float32)).astype(np.float32)


def swap_surface(p1, p2, rotm, sea_glow=0.0):
    """Blend real Earth -> flipped Earth. p1: oceans rise to land (sweeps left->right),
    p2: continents flood (sweeps right->left). Glowing fronts mark the change."""
    ax = view_axis_world(rotm)
    g1 = np.sin(np.pi * np.clip(p1, 0, 1))
    g2 = np.sin(np.pi * np.clip(p2, 0, 1))
    e1 = lerp(-1.35, 1.35, p1)
    e2 = lerp(1.35, -1.35, p2)

    def kfac(u, v, nw):
        land = sample(C.LAND, u, v)
        nz = sample(C.N1, u, v) - 0.5
        s = nw @ ax
        d1 = e1 - (s + nz * 0.55)
        d2 = (s - nz * 0.55) - e2
        k1 = smoothstep(-0.02, 0.10, d1)
        k2 = smoothstep(-0.02, 0.10, d2)
        return land, d1, d2, k1, k2

    def surf(u, v, nw):
        land, d1, d2, k1, k2 = kfac(u, v, nw)
        ow = 1 - land
        kk = ow * k1 + land * k2
        if p1 <= 0 and p2 <= 0:
            rgb = sample(C.BM, u, v)
        elif p1 >= 1 and p2 >= 1:
            rgb = sample(C.FLIP, u, v)
        else:
            rgb = sample(C.BM, u, v) * (1 - kk)[:, None] + sample(C.FLIP, u, v) * kk[:, None]
        emis = None
        if g1 > 0.01 or g2 > 0.01 or sea_glow > 0.01:
            e = (np.exp(-(d1 / 0.035) ** 2) * ow * g1 * 1.8)[:, None] * GOLD
            e = e + (np.exp(-(d2 / 0.035) ** 2) * land * g2 * 1.8)[:, None] * TURQ
            if sea_glow > 0.01:
                e = e + (land * k2 * sea_glow * 0.35)[:, None] * TURQ
            emis = e
        oc = ow * (1 - k1) + land * k2
        return rgb, oc, emis

    def cmod(u, v, nw):
        if p1 <= 0 and p2 <= 0:
            return 1.0
        land, d1, d2, k1, k2 = kfac(u, v, nw)
        kk = (1 - land) * k1 + land * k2
        return 1 + (sample(C.MOIST_FLIP, u, v) - 1) * kk

    return surf, cmod


def draw_globe(img, t, lon, lat, R, p1=0.0, p2=0.0, sun=SUN, cx=GX, cy=GY, dist=3.6, sea_glow=0.0,
               cloud_amt=0.85, surface=None, cmod=None, atmo=1.0):
    rotm = C.face_rotation(lon, lat)
    if surface is None:
        surface, cmod = swap_surface(p1, p2, rotm, sea_glow)
    C.globe(img, R, cx, cy, rotm, sun, surface, dist=dist, cloud_amt=cloud_amt,
            cloud_shift=t * 0.0016, cloud_mod=cmod, atmo=atmo)
    return rotm


def project(rotm, lon, lat, R, cx=GX, cy=GY, dist=3.6):
    """Screen position of a surface point and whether it faces the camera."""
    p = rotm @ C.lonlat_to_vec(lon, lat)
    f = R * np.sqrt(dist ** 2 - 1)
    z = p[2] + dist
    return cx + p[0] / z * f, cy - p[1] / z * f, p[2] < -0.05


# ------------------------------------------------------------------ shots
def shot_hook(t):
    """0 - 8.6 s: Earth, unnatural spin, oceans <-> continents swap, then the dry planet."""
    img = C.space(t)
    spin = ease_io(seg(t, 1.0, 5.2))
    lon = -28 - 4 * t - 112 * spin
    lat = 14 - 10 * seg(t, 0, 8.6)
    R = 360 + 105 * ease_out(seg(t, 0, 2.4)) + 25 * seg(t, 2.4, 8.6) + 30 * ease(seg(t, 7.3, 8.3))
    p1 = ease_io(seg(t, 1.55, 2.95))
    p2 = ease_io(seg(t, 3.35, 4.75))
    nm = ease(seg(t, 7.2, 8.1))
    sun = C.norm(lerp(SUN, C.norm([-0.97, 0.22, 0.10]), nm))
    if t > 8.45:   # snap back for "Right now..."
        k = ease(seg(t, 8.45, 8.95))
        p1 = p2 = 1 - k
    draw_globe(img, t, lon, lat, R, p1, p2, sun=sun)
    flash = 0.10 * (np.exp(-((t - 1.6) / 0.12) ** 2) + np.exp(-((t - 3.4) / 0.12) ** 2))
    img += flash * np.array([0.6, 0.8, 1.0], np.float32)
    grade = ((1.0 - 0.10 * nm, 1.0 - 0.14 * nm, 1.0 - 0.2 * nm), (0.0, 0.0, 0.0))
    return img, grade


def shot_71(t):
    """8.6 - 16.7 s: real Earth (71% water), flip again, lonely seas."""
    img = C.space(t)
    lon = -174.4 - 3.5 * (t - 8.6)
    lat = 4
    R = 520 - 75 * ease_io(seg(t, 8.6, 9.8)) + 35 * seg(t, 9.8, 16.6)
    sun = C.norm(lerp(C.norm([-0.97, 0.22, 0.10]), SUN, ease_io(seg(t, 8.6, 9.4))))
    if t < 8.95:
        p1 = p2 = 1 - ease(seg(t, 8.45, 8.95))
    else:
        p1 = ease_io(seg(t, 11.6, 12.45))
        p2 = ease_io(seg(t, 11.95, 12.85))
    if t > 16.45:
        k = ease(seg(t, 16.45, 16.9))
        p1 = p2 = 1 - k
    glow = np.exp(-((t - 15.55) / 0.45) ** 2)
    draw_globe(img, t, lon, lat, R, p1, p2, sun=sun, sea_glow=glow)
    return img, None


def shot_dive(t):
    """16.6 - 18.45 s: real Earth again, swing to the Mariana Trench and plunge in."""
    img = C.space(t)
    a = ease_io(seg(t, 16.6, 17.9))
    lon = lerp(-174.4 - 3.5 * 8.0, MARIANA[0] - 360, a)
    lat = lerp(4, MARIANA[1], a)
    z = seg(t, 16.9, 18.45) ** 2.2
    R = 480 * (1 - z) + 3200 * z
    dist = lerp(3.6, 1.25, z)
    cy = lerp(GY, 960, ease(seg(t, 16.9, 18.0)))
    p = 1 - ease(seg(t, 16.45, 16.9))
    draw_globe(img, t, lon, lat, R, p, p, cy=cy, dist=dist, cloud_amt=0.85 * (1 - 0.9 * z))
    return img, None


def shot_distance(t):
    """39 - 43.5 s: flipped supercontinent, distance-to-sea contours, Point Nemo."""
    img = C.space(t)
    lon = NEMO[0] + 25 - 12 * ease_io(seg(t, 39.0, 43.5))
    lat = -32
    R = 470 + 40 * seg(t, 39, 43.5)
    rotm = C.face_rotation(lon, lat)
    reveal = 3000 * ease_io(seg(t, 39.6, 41.6))

    def surf(u, v, nw):
        rgb = sample(C.FLIP, u, v)
        land = sample(C.LAND, u, v)
        d = sample(C.DSEA_FLIP, u, v)
        fr = (d / 500.0) % 1.0
        ring = (np.exp(-(fr / 0.035) ** 2) + np.exp(-((1 - fr) / 0.035) ** 2)) * (d > 60) * (d < reveal)
        heat = smoothstep(900, 2700, d) * smoothstep(0, 800, reveal - d)
        e = ring[:, None] * GOLD * 0.55 + (heat * 0.28)[:, None] * np.array([1.0, 0.28, 0.06], np.float32)
        return rgb, land, e

    cm = lambda u, v, nw: sample(C.MOIST_FLIP, u, v)
    C.globe(img, R, GX, GY, rotm, SUN, surf, cloud_amt=0.8, cloud_shift=t * 0.0016, cloud_mod=cm)
    return img, None, (rotm, R)


def _flow_vel(u, v):
    lon = (u - 0.5) * 2 * np.pi
    lat = (0.5 - v) * np.pi
    # basin-scale gyres + a circumpolar band: stylised, not a current model
    du = np.cos(3 * lat) * np.cos(lat) * 0.6 + 0.35 * np.exp(-((lat + 0.95) / 0.12) ** 2)
    dv = 0.35 * np.sin(2 * lon + 0.6) * np.cos(lat) ** 2 * np.sin(3 * lat)
    return du * 0.004, dv * 0.004


def shot_heat(t):
    """50 - 54 s: sunlight in, the ocean soaks it up and moves it around."""
    img = C.space(t)
    lon = 70 - 3 * (t - 50)
    lat = 6
    R = 450 + 30 * seg(t, 50, 54)
    sun = C.norm([-0.85, 0.25, -0.45])
    rotm = C.face_rotation(lon, lat)
    on = ease(seg(t, 50.3, 51.4))

    def surf(u, v, nw):
        rgb = sample(C.BM, u, v)
        land = sample(C.LAND, u, v)
        ocean = 1 - land
        du, dv = _flow_vel(u, v)
        e = np.zeros_like(rgb)
        for ph_off in (0.0, 0.5):
            ph = (t * 0.22 + ph_off) % 1.0
            w = 1 - abs(2 * ph - 1)
            n = sample(C.N1, (u - du * ph * 60) * 2.0, ((v - dv * ph * 60) * 1.0) % 1.0)
            n2 = sample(C.N1, (u - du * ph * 60) * 5.0 + 0.3, ((v - dv * ph * 60) * 2.0 + 0.2) % 1.0)
            fil = np.exp(-((((n * 9.0) % 1.0) - 0.5) / 0.09) ** 2)      # contour filaments
            tr = fil * smoothstep(0.35, 0.65, n2) * w
            e = e + tr[:, None]
        lat = (0.5 - v) * 180
        warm = np.exp(-(lat / 28) ** 2)
        col = GOLD * 0.55 + np.array([1.0, 0.35, 0.08], np.float32) * 0.25
        emis = (e * (0.35 + 0.65 * warm[:, None]) * ocean[:, None] * on * 0.75) * col
        emis = emis + (warm * ocean * on * 0.10)[:, None] * np.array([1.0, 0.5, 0.15], np.float32)
        return rgb, ocean, emis

    C.globe(img, R, GX, GY, rotm, sun, surf, cloud_amt=0.55, cloud_shift=t * 0.0016)
    # incoming sunlight: soft golden streaks from the left
    a = ease(seg(t, 49.9, 50.8)) * (1 - 0.5 * ease(seg(t, 52.5, 54)))
    if a > 0:
        ys = np.arange(C.H, dtype=np.float32)[:, None]
        xs = np.arange(C.W, dtype=np.float32)[None, :]
        k = ys + xs * 0.32
        streak = np.sin(k * 0.045) * np.sin(k * 0.013 + 1.3) * np.sin(k * 0.0071 + 2.1)
        streak = smoothstep(0.25, 0.9, streak)
        flow = 0.5 + 0.5 * np.sin(xs * 0.018 - t * 7.0 + k * 0.002)
        fade = smoothstep(GX + 200, 0, xs) * a
        rr = np.sqrt((xs - GX) ** 2 + (ys - GY) ** 2)
        outside = smoothstep(R * 0.98, R * 1.08, rr)
        img += (streak * flow * fade * outside * 0.22)[..., None] * np.array([1.0, 0.78, 0.4], np.float32)
    return img, None


def shot_pangaea(t, P):
    """61.3 - 68.9 s: rewind, continents drift into Pangaea, scorched heart, drift back."""
    img = C.space(t)
    sp = ease_io(seg(t, 62.3, 63.15))
    lon = 15 + 360 * sp - 5 * seg(t, 61.3, 62.3) - 28 * ease_io(seg(t, 63.0, 65.0))
    lat = 8
    R = 420 - 50 * ease_io(seg(t, 63.0, 64.9))
    cy = GY
    f = ease_io(seg(t, 63.0, 64.85))
    if t > 67.75:
        f = 1 - ease_io(seg(t, 67.75, 68.85))
    zin = ease_io(seg(t, 65.5, 67.6)) * (1 - ease(seg(t, 67.75, 68.6)))
    R = R + 150 * zin + 50 * ease_io(seg(t, 67.75, 68.85))
    lat = lat + 6 * zin
    lon = lon + 30 * zin
    if t > 67.75:
        lon = lon - 2 * ease_io(seg(t, 67.75, 68.9))
    if f <= 0.0005:
        surf = C.earth_surface
        cmod = None
    else:
        col, land = P.surface_map(f)
        pc, plb, dist = P.paleo_colour()
        heat_on = smoothstep(0.9, 1.0, f) * ease(seg(t, 65.3, 66.3))

        def surf(u, v, nw, col=col, land=land):
            rgb = sample(col, u, v)
            lm = sample(land, u, v)
            e = None
            if heat_on > 0:
                d = sample(dist, u, v)
                sh = 0.75 + 0.25 * np.sin(t * 5 + sample(C.N1, u * 3, v) * 20)
                e = (smoothstep(1300, 2600, d) * heat_on * sh * 0.30)[:, None] * np.array([1.0, 0.30, 0.06], np.float32)
            return rgb, 1 - lm, e

        g = smoothstep(0.5, 1.0, f)

        def cmod(u, v, nw, land=land):
            d = sample(dist, u, v)
            return 1 - g * smoothstep(300, 1200, d) * 0.9

    rotm = C.face_rotation(lon, lat)
    C.globe(img, R, GX, cy, rotm, SUN, surf, cloud_amt=0.8 * (1 - 0.3 * f), cloud_shift=t * 0.0016, cloud_mod=cmod)
    warm = smoothstep(0.6, 1.0, f) * 0.6
    grade = ((1 + 0.06 * warm, 1 - 0.01 * warm, 1 - 0.08 * warm), (0, 0, 0))
    return img, grade


def shot_finale(t):
    """68.8 - 75 s: the blue planet, pulling away; end card with an orbit loop."""
    img = C.space(t)
    lon = -20 - 4.5 * (t - 68.8)
    lat = 8 + 4 * seg(t, 68.8, 75)
    R = 420 - 60 * ease_out(seg(t, 68.8, 72.5), 2) - 20 * seg(t, 72.5, 75)
    cy = GY + 40 * ease(seg(t, 71.5, 72.8))
    rotm = C.face_rotation(lon, lat)
    C.globe(img, R, GX, cy, rotm, C.norm([-0.7, 0.35, -0.6]), C.earth_surface, cloud_amt=0.85,
            cloud_shift=t * 0.0016, atmo=1.15)
    return img, None, (R, cy)
