"""Builds the planetary texture cache used by render.py.

Sources (public domain): NASA Blue Marble Next Generation (bmng.jpg), NOAA
ETOPO1 colour relief (etopo1.jpg) and the GSHHS-derived 2.5' land/sea mask,
all shipped in the `basemap-data` PyPI package.
"""
import gzip, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

W, H = 4096, 2048
SRC = sys.argv[1]          # .../mpl_toolkits/basemap_data
OUT = sys.argv[2]          # cache dir
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def load(name):
    return np.asarray(Image.open(os.path.join(SRC, name)).convert("RGB").resize((W, H), Image.LANCZOS))


def spectral_noise(h, w, beta, seed):
    """Tileable fBm-like noise via FFT power-law synthesis, normalised to 0..1."""
    r = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1
    amp = f ** (-beta / 2)
    amp[0, 0] = 0
    ph = r.uniform(0, 2 * np.pi, amp.shape)
    n = np.fft.irfft2(amp * np.exp(1j * ph), s=(h, w))
    n -= n.min()
    return (n / n.max()).astype(np.float32)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


lat = np.linspace(90, -90, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
coslat = np.cos(np.radians(lat))
KM_PER_PX = 40075.0 / W

# --- land mask --------------------------------------------------------------
raw = np.frombuffer(gzip.open(os.path.join(SRC, "lsmask_2.5min_h.bin"), "rb").read(), np.uint8)
m = raw.reshape(4320, 8640)[::-1]
land_hi = (m >= 1).astype(np.float32)          # lakes count as land for the swap
land = np.asarray(Image.fromarray((land_hi * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)) / 255.0
land = land.astype(np.float32)
landb = land > 0.5

bm = load("bmng.jpg")
et = load("etopo1.jpg").astype(np.float32) / 255.0

# --- bathymetry proxy: ETOPO1 ocean ramp lightness -> 0 (deep) .. 1 (shelf) ---
light = et.max(axis=2) * 0.5 + et.min(axis=2) * 0.5
bathy = np.where(landb, 1.0, light)
bathy = ndimage.gaussian_filter(bathy, 1.2)
lo, hi = np.percentile(bathy[~landb], [2, 99.5])
bathy = np.clip((bathy - lo) / (hi - lo), 0, 1).astype(np.float32)


def dist_km(mask):
    """Approximate great-circle-ish distance (km) from each pixel to `mask`, wrap-aware."""
    pad = W // 4
    mm = np.concatenate([mask[:, -pad:], mask, mask[:, :pad]], axis=1)
    d = ndimage.distance_transform_edt(~mm, sampling=(1.0, 1.0))
    d = d[:, pad:pad + W]
    # horizontal pixels shrink with latitude; use a blended correction
    return (d * KM_PER_PX * (0.35 + 0.65 * coslat)).astype(np.float32)


dist_to_sea_flip = dist_km(landb)      # flipped world: old land == new sea
dist_to_land_flip = dist_km(~landb)

# --- flipped-world colour --------------------------------------------------
n1 = spectral_noise(H, W, 3.2, 1)
n2 = spectral_noise(H, W, 2.2, 2)
relief = ndimage.gaussian_filter(bathy, 3.5)
gy, gx = np.gradient(relief)
shade = np.clip(0.75 + (-gx * 0.8 + gy * 0.6) * 38, 0.45, 1.35)[..., None]

d = dist_to_sea_flip
pal = [  # (km, rgb) — coast green to burnt interior
    (0, (0.38, 0.47, 0.25)), (120, (0.55, 0.52, 0.30)), (400, (0.72, 0.58, 0.36)),
    (900, (0.78, 0.52, 0.27)), (1600, (0.70, 0.36, 0.18)), (2600, (0.58, 0.25, 0.13)),
]
col = np.zeros((H, W, 3), np.float32)
ks = np.array([p[0] for p in pal], np.float32)
cs = np.array([p[1] for p in pal], np.float32)
for c in range(3):
    col[..., c] = np.interp(d, ks, cs[:, c])
col *= (0.85 + 0.3 * n1)[..., None]
# ancient ridges read paler (exposed rock), trenches darker
col = col * (0.75 + 0.45 * relief[..., None])
# salt flats / dry lake beds dotted through the interior
salt = smoothstep(0.78, 0.86, n2) * smoothstep(700, 1400, d)
col = col * (1 - salt[..., None]) + np.array([0.86, 0.80, 0.70], np.float32) * salt[..., None]
col *= shade
# polar caps on the new land
ice = smoothstep(62, 74, np.abs(lat) + (n1 - 0.5) * 10)
col = col * (1 - ice[..., None]) + np.array([0.90, 0.93, 0.97], np.float32) * ice[..., None] * shade * 0.95

sea_d = dist_to_land_flip
deep = np.array([0.02, 0.10, 0.28], np.float32)
shallow = np.array([0.06, 0.48, 0.58], np.float32)
t = smoothstep(0, 260, sea_d)[..., None]
seacol = shallow * (1 - t) + deep * t
seacol *= (0.9 + 0.2 * n2[..., None])
flip = np.where(landb[..., None], seacol, col)
flip = np.clip(flip, 0, 1)

# flipped-world cloud moisture: plenty over the seas, almost none deep inland
moist_flip = np.where(landb, 1.0, 0.12 + 0.88 * np.exp(-dist_to_sea_flip / 650.0)).astype(np.float32)
moist_flip = ndimage.gaussian_filter(moist_flip, 6)

# --- clouds (tileable, zonally stretched, with a few cyclone swirls) -------
def aniso_noise(h, w, beta, seed, stretch):
    r = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    f = np.sqrt((fx * stretch) ** 2 + fy ** 2)
    f[0, 0] = 1
    amp = f ** (-beta / 2)
    amp[0, 0] = 0
    n = np.fft.irfft2(amp * np.exp(1j * r.uniform(0, 2 * np.pi, amp.shape)), s=(h, w))
    return ((n - n.mean()) / n.std()).astype(np.float32)


cl = aniso_noise(H, W, 3.1, 11, 2.0) * 0.8 + aniso_noise(H, W, 2.3, 12, 1.5) * 0.35
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
wx = np.zeros((H, W), np.float32)
wy = np.zeros((H, W), np.float32)
for cx, cy, rad, s in [(0.12, 0.27, 140, 1), (0.38, 0.22, 170, 1), (0.71, 0.25, 150, 1), (0.93, 0.3, 120, 1),
                       (0.2, 0.74, 170, -1), (0.52, 0.78, 190, -1), (0.83, 0.72, 160, -1), (0.6, 0.36, 90, 1)]:
    dx = (xx - cx * W + W / 2) % W - W / 2
    dy = yy - cy * H
    rr = np.sqrt(dx ** 2 + dy ** 2) + 1e-3
    ang = s * 1.9 * np.exp(-(rr / rad) ** 2) * (rr / rad) ** 0.3
    ca, sa = np.cos(ang), np.sin(ang)
    wx += dx * ca - dy * sa - dx
    wy += dx * sa + dy * ca - dy
cl = ndimage.map_coordinates(cl, [np.clip(yy + wy, 0, H - 1), (xx + wx) % W], order=1, mode="wrap")
band = (0.7 * np.exp(-((lat - 4) / 7) ** 2) + 0.8 * np.exp(-((np.abs(lat) - 55) / 13) ** 2)
        - 0.9 * np.exp(-((np.abs(lat) - 24) / 9) ** 2) - 0.3)
clouds = smoothstep(-0.25, 1.5, cl + band) ** 1.2
clouds = clouds.astype(np.float32)

np.savez(os.path.join(OUT, "earth.npz"),
         bm=bm, flip=(flip * 255).astype(np.uint8), land=land.astype(np.float32),
         bathy=bathy, clouds=clouds, moist_flip=moist_flip.astype(np.float32),
         dsea_flip=dist_to_sea_flip, n1=n1)
for k, a in {"flip": flip, "clouds": clouds, "moist": moist_flip}.items():
    a = np.asarray(a)
    img = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(img).resize((1024, 512)).save(os.path.join(OUT, f"prev_{k}.png"))
print("max inland distance (km, approx):", float(dist_to_sea_flip.max()))
