"""Approximate ~250 Ma Pangaea assembly by rigid rotation of modern continents.

Africa is held fixed. South America uses the classic Bullard et al. (1965)
fit pole; North America / Eurasia close the Atlantic; the Gondwana blocks
(Antarctica, India, Australia, Madagascar) are placed with simple
two-point fits against Africa. It is a visualisation, not a plate model.
"""
import numpy as np
from scipy.spatial.transform import Rotation as Rot, Slerp
from scipy import ndimage

import core as C

MW, MH = 2048, 1024
_lon = (np.arange(MW, dtype=np.float32) + 0.5) / MW * 360 - 180
_lat = 90 - (np.arange(MH, dtype=np.float32) + 0.5) / MH * 180
LON, LAT = np.meshgrid(_lon, _lat)
_TV = np.stack([np.cos(np.radians(LAT)) * np.sin(np.radians(LON)), np.sin(np.radians(LAT)),
                np.cos(np.radians(LAT)) * np.cos(np.radians(LON))], -1).reshape(-1, 3).astype(np.float32)


def _resize(a):
    from PIL import Image
    if a.ndim == 2:
        return np.asarray(Image.fromarray(a.astype(np.float32)).resize((MW, MH), Image.BILINEAR))
    return np.stack([_resize(a[..., i]) for i in range(a.shape[2])], -1)


BMS = _resize(C.BM).astype(np.float32)
LANDS = _resize(C.LAND)
BATHY = _resize(np.asarray(np.load(C.os.path.join(C.CACHE, "earth.npz"))["bathy"], np.float32))
CRUST = (LANDS > 0.5) | (BATHY > 0.86)          # land + continental shelf
CRUST = ndimage.binary_opening(CRUST, iterations=2) | (LANDS > 0.5)

AF, SA, NA, EU, AN, IN, AU, MA = range(1, 9)


def _plates():
    # jitter the cut lines so plate edges read as coastlines, not rulers
    nz = _resize(C.N1)
    lo = LON + (nz - 0.5) * 7
    la = LAT + (np.roll(nz, MW // 3, 1) - 0.5) * 7
    p = np.full(LON.shape, EU, np.int8)
    na = (lo < -30) & (lo > -169) & (la > 7)
    na |= (lo < -10) & (lo > -75) & (la > 59)
    p[na] = NA
    sa = (la < 12.5) & (lo > -82) & (lo < -30) & ((la < 8.5) | (lo > -77.5))
    p[sa] = SA
    af = (lo > -20) & (lo < 60) & (la > -38) & (la < 36)
    af |= (lo > 7) & (lo < 12) & (la < 37.6) & (la > 30)
    af &= ~((lo >= 34) & (la > 30))
    af &= ~((lo > 48) & (la > 24.5))
    p[af] = AF
    p[(lo > 41.5) & (lo < 51.5) & (la > -26.5) & (la < -11)] = MA
    ind = (lo > 66) & (lo < 92.5) & (la > 4) & (la < np.where(lo < 80, 29.5, 27.0))
    p[ind] = IN
    au = (lo > 110) & (lo < 180) & (la > -50) & (la < -9.5)
    au |= (lo > 130) & (lo < 152) & (la > -11) & (la < 0)
    p[au] = AU
    p[la < -58] = AN
    p[~CRUST] = 0
    return p


PLATES = _plates()


def pole(lat, lon, ang):
    return Rot.from_rotvec(C.lonlat_to_vec(lon, lat) * np.radians(ang))


def fit2(src, dst):
    """Rotation mapping two (lon, lat) points onto two targets (least squares)."""
    a = np.array([C.lonlat_to_vec(*s) for s in src])
    b = np.array([C.lonlat_to_vec(*d) for d in dst])
    r, _ = Rot.align_vectors(b, a)
    return r


R_SA = pole(44.0, -30.6, 57.0)
R_NA = pole(66.95, -12.02, 75.55)              # Klitgord & Schouten-style central Atlantic closure
R_EU = fit2([(-3.7, 40.4), (116.4, 39.9)], [(2.0, 39.0), (104.0, 50.0)])
R_MA = fit2([(49.3, -12.0), (45.1, -25.6)], [(43.0, 0.5), (40.0, -11.5)])
R_IN = fit2([(75.0, 34.0), (77.5, 8.1)], [(56.0, 4.0), (53.0, -22.0)])
R_AN = fit2([(15.0, -70.0), (-60.0, -75.0)], [(36.0, -33.0), (-6.0, -50.0)])
R_AU = R_AN * fit2([(117.0, -35.0), (146.0, -39.0)], [(112.0, -66.5), (145.0, -68.5)])
FINAL = {AF: Rot.identity(), SA: R_SA, NA: R_NA, EU: R_EU, MA: R_MA, IN: R_IN, AN: R_AN, AU: R_AU}
ORDER = [EU, NA, SA, AN, AU, IN, MA, AF]
_SLERP = {k: Slerp([0, 1], Rot.concatenate([Rot.identity(), r])) for k, r in FINAL.items()}


def _vec_to_uv(v):
    lon = np.arctan2(v[:, 0], v[:, 2])
    lat = np.arcsin(np.clip(v[:, 1], -1, 1))
    return lon / (2 * np.pi) + 0.5, 0.5 - lat / np.pi


def assemble(f):
    """Return (rgb map, land mask) with each plate rotated by fraction f of its fit."""
    col = BMS.reshape(-1, 3).copy()
    land = np.zeros(MW * MH, np.float32)
    oc_mix = float(C.smoothstep(0.0, 0.35, f))
    if oc_mix > 0:
        n = C.sample(C.N1, *_vec_to_uv(_TV))
        ocean = np.array([0.02, 0.09, 0.27], np.float32) * (0.85 + 0.3 * n)[:, None]
        col = col * (1 - oc_mix) + ocean * oc_mix
    for k in ORDER:
        r = _SLERP[k](f) if f > 0 else Rot.identity()
        src = r.inv().apply(_TV).astype(np.float32)
        u, v = _vec_to_uv(src)
        xi = np.clip((u * MW).astype(np.int32), 0, MW - 1)
        yi = np.clip((v * MH).astype(np.int32), 0, MH - 1)
        hit = PLATES[yi, xi] == k
        if not hit.any():
            continue
        cu, cv = u[hit], v[hit]
        col[hit] = C.sample(BMS, cu, cv)
        land[hit] = np.maximum(land[hit], C.sample(LANDS, cu, cv))
    return col.reshape(MH, MW, 3), land.reshape(MH, MW)


_PALEO = None


def paleo_colour():
    """Arid Pangaea palette, keyed on distance to the Panthalassa / Tethys coast."""
    global _PALEO
    if _PALEO is None:
        _, land = assemble(1.0)
        lb = land > 0.35
        lb = ndimage.binary_closing(np.pad(lb, 16, mode='wrap'), iterations=10)[16:-16, 16:-16]
        lb = ndimage.binary_fill_holes(lb)
        d = ndimage.distance_transform_edt(lb) * (40075.0 / MW)
        ks = np.array([0, 150, 500, 1100, 1900, 2800], np.float32)
        cs = np.array([(0.30, 0.42, 0.20), (0.48, 0.48, 0.26), (0.70, 0.55, 0.32), (0.80, 0.50, 0.25),
                       (0.74, 0.36, 0.17), (0.62, 0.24, 0.12)], np.float32)
        col = np.stack([np.interp(d, ks, cs[:, i]) for i in range(3)], -1).astype(np.float32)
        n = _resize(C.N1)
        col *= (0.85 + 0.3 * n)[..., None]
        _PALEO = (col, lb.astype(np.float32), d.astype(np.float32))
    return _PALEO


def surface_map(f):
    col, land = assemble(f)
    g = float(C.smoothstep(0.55, 1.0, f))
    if g > 0:
        pc, plb, _ = paleo_colour()
        lm = np.maximum(land, plb * g)[..., None]
        ocean_col = np.array([0.02, 0.09, 0.27], np.float32)
        col = col * (1 - g) + (pc * lm + ocean_col * (1 - lm)) * g
        land = land * (1 - g) + plb * g
    return col.astype(np.float32), land.astype(np.float32)
