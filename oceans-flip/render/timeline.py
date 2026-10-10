"""Edit decision list: which shot renders when, transitions, and on-screen typography.

All times are seconds on the supplied voice-over (74.48 s), from the word-level
transcript in ../storyboard/words.json.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import core as C
from core import seg, ease, ease_io, ease_out, lerp, smoothstep, reveal, put, fit_text, text_img
import globes as G
import xsection as X
import ground as GR
import underwater as U
import pangaea as P

DURATION = 75.0
# "full": headlines + labels + end card (English cut). "keywords": numbers / single keywords only,
# no sentences and no channel branding (Egyptian Arabic cut).
TEXT_MODE = C.os.environ.get("OF_TEXT", "full")
WHITE = (255, 255, 255)
GOLD = (255, 204, 102)
TURQ = (94, 234, 230)
GREEN = (150, 255, 175)
EMBER = (255, 150, 70)
CHL = (190, 245, 120)


# ------------------------------------------------------------------ shots
def _shot(t):
    """Return (float image, grade, extra) for one instant, before post."""
    if t < 8.6:
        img, gr = G.shot_hook(t)
        return img, gr, None
    if t < 16.6:
        img, gr = G.shot_71(t)
        return img, gr, None
    if t < 18.45:
        img, gr = G.shot_dive(t)
        if t > 17.95:
            k = ease(seg(t, 17.95, 18.45))
            xi, cam = X.render(18.0 + (t - 17.95) * 0.0)
            img = img * (1 - k) + xi * k
            img += np.exp(-((t - 18.15) / 0.10) ** 2) * np.array([0.10, 0.25, 0.3], np.float32)
            return img, None, ("xs", cam, k)
        return img, gr, None
    if t < 31.6:
        xi, cam = X.render(t)
        if t > 31.2:
            k = ease(seg(t, 31.2, 31.6))
            wi, _ = GR.water_cycle(31.6)
            xi = xi * (1 - k) + wi * k
        return xi, None, ("xs", cam, 1.0)
    if t < 39.0:
        img, gr = GR.water_cycle(t)
        if t > 38.65:
            k = ease(seg(t, 38.65, 39.0))
            di, _, ex = G.shot_distance(39.0)
            img = img * (1 - k) + di * k
            img += np.exp(-((t - 38.85) / 0.1) ** 2) * 0.5
        return img, gr, None
    if t < 43.45:
        img, gr, ex = G.shot_distance(t)
        if t > 43.1:
            k = ease(seg(t, 43.1, 43.45))
            di, dg = GR.desert_winter(43.45)
            img = img * (1 - k) + di * k
        return img, gr, ("dist", ex)
    if t < 50.1:
        img, gr = GR.desert_winter(t)
        if t > 49.8:
            k = ease(seg(t, 49.8, 50.1))
            hi, _ = G.shot_heat(50.1)
            img = img * (1 - k) + hi * k
            gr = None if k > 0.5 else gr
        return img, gr, None
    if t < 54.1:
        img, gr = G.shot_heat(t)
        if t > 53.75:
            k = ease(seg(t, 53.75, 54.1))
            ui, _ = U.render(54.1)
            img = img * (1 - k) + ui * k
            img += np.exp(-((t - 53.95) / 0.1) ** 2) * np.array([0.2, 0.45, 0.5], np.float32)
        return img, gr, None
    if t < 61.6:
        img, gr = U.render(t)
        if t > 61.15:
            k = ease(seg(t, 61.15, 61.6))
            pi, _ = G.shot_pangaea(61.6, P)
            img = img * (1 - k) + pi * k
        return img, gr, None
    if t < 68.85:
        img, gr = G.shot_pangaea(t, P)
        return img, gr, None
    img, gr, ex = G.shot_finale(t)
    return img, gr, ("fin", ex)


def render_frame(t):
    if 62.3 < t < 63.2:            # fast rewind spin: 3-sample motion blur
        acc = None
        for dt in (-1 / 90, 0.0, 1 / 90):
            img, gr, ex = _shot(t + dt)
            acc = img if acc is None else acc + img
        img = acc / 3
    else:
        img, gr, ex = _shot(t)
    fr = C.finish(img, t, grade=gr)
    if ex is not None and ex[0] == "xs":
        fr = X.overlay(fr, t, ex[1])
    fr = overlay(fr, t, ex) if TEXT_MODE == "full" else overlay_keywords(fr, t, ex)
    return fr


# ------------------------------------------------------------------ typography
def headline(fr, t, s, t0, t_out, y, weight="black", size=104, color=WHITE, max_w=900, glow=None):
    a, dy, sc, bl = reveal(t, t0, 0.4, t_out, 0.35)
    if a > 0:
        put(fr, fit_text(s, weight, size, max_w, color=color, glow=glow), C.W / 2, y, a, sc, dy, bl)


def stat(fr, t, num, label, t0, t_out, y, color, label2=None, num_size=190):
    a, dy, sc, bl = reveal(t, t0, 0.35, t_out, 0.35)
    if a <= 0:
        return
    put(fr, fit_text(num, "black", num_size, 900, color=color), C.W / 2, y, a, 0.9 + 0.1 * a, dy, bl)
    a2, dy2, sc2, bl2 = reveal(t, t0 + 0.18, 0.35, t_out, 0.35)
    put(fr, fit_text(label, "bold", 44, 880, track=3), C.W / 2, y + num_size * 0.62, a2, 1.0, dy2, bl2)
    if label2:
        put(fr, fit_text(label2, "bold", 44, 880, track=3), C.W / 2, y + num_size * 0.62 + 58, a2, 1.0, dy2, bl2)


def overlay(fr, t, ex):
    # 1. hook
    headline(fr, t, "WHAT IF EARTH FLIPPED?", 0.22, 5.05, 330)
    headline(fr, t, "OCEANS BECOME LAND.", 1.62, 5.05, 470, "xbold", 62, GOLD)
    headline(fr, t, "CONTINENTS BECOME WATER.", 3.52, 5.05, 548, "xbold", 62, TURQ)

    # 2. 71% -> 29%
    if 9.7 < t < 16.4:
        if t < 11.65:
            v = int(round(71 * ease_out(seg(t, 9.75, 10.35))))
        else:
            v = int(round(lerp(71, 29, ease_io(seg(t, 11.65, 12.8)))))
        a, dy, sc, bl = reveal(t, 9.75, 0.3, 16.0, 0.35)
        col = TURQ if t < 12.2 else EMBER
        put(fr, text_img(f"{v}%", "black", 200, color=col), C.W / 2, 395, a, 0.9 + 0.1 * a, dy, bl)
        la = ease(seg(t, 9.95, 10.3)) * (1 - ease(seg(t, 11.65, 11.9)))
        lb = ease(seg(t, 12.0, 12.35)) * (1 - ease(seg(t, 16.0, 16.35)))
        put(fr, fit_text("OF EARTH'S SURFACE IS WATER", "bold", 44, 880, track=3), C.W / 2, 525, la)
        put(fr, fit_text("WATER IN A FLIPPED WORLD", "bold", 44, 880, track=3), C.W / 2, 525, lb)

    # 3. depth cross-section (labels ride the reference lines)
    if ex is not None and ex[0] == "xs":
        cam = ex[1]
        y_sea = X.zy(X.AVG_SEA, cam)
        a, dy, sc, bl = reveal(t, 19.84, 0.35, 24.9, 0.35)
        if a > 0:
            put(fr, text_img("3.7 KM", "black", 130, color=GOLD), C.W / 2, y_sea - 150, a, sc, dy, bl)
            put(fr, fit_text("AVERAGE OCEAN DEPTH", "bold", 42, 880, track=3), C.W / 2, y_sea - 62, a, 1, dy, bl)
        y_land = X.zy(X.AVG_LAND, cam)
        a, dy, sc, bl = reveal(t, 22.48, 0.35, 24.9, 0.35)
        if a > 0:
            put(fr, text_img("0.8 KM", "black", 110, color=GREEN), C.W / 2, y_land - 135, a, sc, dy, bl)
            put(fr, fit_text("AVERAGE LAND HEIGHT", "bold", 42, 880, track=3), C.W / 2, y_land - 58, a, 1, dy, bl)
        headline(fr, t, "MOUNT EVEREST", 25.76, 28.55, 200, "black", 92)
        headline(fr, t, "8.8 KM TALL", 26.0, 28.55, 290, "xbold", 58, GOLD)
        a, dy, sc, bl = reveal(t, 27.2, 0.35, 30.6, 0.35)
        if a > 0:
            put(fr, text_img("MARIANA", "xbold", 50), 165, 1110, a, 1, dy, bl)
            put(fr, text_img("TRENCH", "xbold", 50), 165, 1168, a, 1, dy, bl)
            put(fr, text_img("~11 KM", "black", 64, color=GOLD), 165, 1240, a, 1, dy, bl)
        headline(fr, t, "PEAK STILL", 28.8, 30.65, 200, "black", 92)
        headline(fr, t, "2 KM UNDERWATER", 28.95, 30.65, 290, "xbold", 62, TURQ)

    # 4. water cycle
    stat(fr, t, "86%", "OF EVAPORATION", 32.56, 36.2, 330, WHITE, "COMES FROM THE OCEAN", 200)
    headline(fr, t, "LESS OCEAN = LESS RAIN", 36.9, 38.75, 360, "black", 80, EMBER)

    # 5. distance to sea (Point Nemo, flipped)
    if ex is not None and ex[0] == "dist":
        rotm, R = ex[1]
        x, y, vis = G.project(rotm, G.NEMO[0], G.NEMO[1], R)
        a = ease(seg(t, 40.9, 41.3)) * (1 - ease(seg(t, 43.0, 43.3)))
        if vis and a > 0:
            im = Image.fromarray(fr)
            d = ImageDraw.Draw(im, "RGBA")
            for k in range(3):
                ph = ((t - 40.9) * 0.8 + k / 3) % 1.0
                rr = 14 + ph * 70
                d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(255, 214, 120, int(220 * (1 - ph) * a)), width=4)
            d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=(255, 230, 160, int(255 * a)))
            fr[:] = np.asarray(im)
    stat(fr, t, "2,688 KM", "TO THE NEAREST SEA", 41.2, 43.1, 330, GOLD, None, 170)
    headline(fr, t, "FROM POINT NEMO, FLIPPED", 41.45, 43.1, 520, "semi", 38, (210, 225, 240))

    # 6. heat, plankton
    headline(fr, t, "EARTH'S HEAT REGULATOR", 50.15, 53.7, 260, "black", 84, GOLD)
    stat(fr, t, "90%+", "OF THE EXTRA HEAT WE TRAP", 51.52, 53.7, 420, WHITE, "GOES INTO THE OCEAN", 170)
    stat(fr, t, "~50%", "OF EARTH'S OXYGEN", 55.92, 58.4, 360, CHL, "IS MADE IN THE OCEAN", 200)

    # 7. Pangaea
    headline(fr, t, "250 MILLION YEARS AGO", 62.72, 64.6, 330, "xbold", 64, WHITE)
    headline(fr, t, "PANGAEA", 64.88, 67.55, 320, "black", 150, EMBER)
    headline(fr, t, "~250 MILLION YEARS AGO", 65.1, 67.55, 445, "semi", 40, (230, 220, 210))

    # 8. finale + end card
    headline(fr, t, "THE OCEAN ISN'T EMPTY SPACE.", 68.88, 71.75, 320, "black", 90)
    headline(fr, t, "IT'S EARTH'S LIFE SUPPORT SYSTEM.", 70.16, 71.75, 430, "xbold", 60, TURQ)
    if t > 71.9 and ex is not None and ex[0] == "fin":
        R, cy = ex[1]
        _loop_ring(fr, t, R, cy)
    headline(fr, t, "FOLLOW BRAIN LOOP", 72.0, None, 320, "black", 118)
    headline(fr, t, "KEEP YOUR BRAIN LOOPING.", 73.28, None, 440, "xbold", 58, TURQ)
    return fr


def keyword(fr, t, s, t0, t_out, y, size=170, color=WHITE, weight="black", x=None):
    a, dy, sc, bl = reveal(t, t0, 0.35, t_out, 0.35)
    if a > 0:
        put(fr, fit_text(s, weight, size, 900, color=color), C.W / 2 if x is None else x, y, a, 0.9 + 0.1 * a, dy, bl)


def overlay_keywords(fr, t, ex):
    """Keyword-only typography: big numbers and single terms, no sentences, no branding."""
    if 9.7 < t < 16.4:
        if t < 11.65:
            v = int(round(71 * ease_out(seg(t, 9.75, 10.35))))
        else:
            v = int(round(lerp(71, 29, ease_io(seg(t, 11.65, 12.8)))))
        a, dy, sc, bl = reveal(t, 9.75, 0.3, 16.0, 0.35)
        put(fr, text_img(f"{v}%", "black", 210, color=TURQ if t < 12.2 else EMBER), C.W / 2, 420, a, 0.9 + 0.1 * a, dy, bl)
    if ex is not None and ex[0] == "xs":
        cam = ex[1]
        y_sea = X.zy(X.AVG_SEA, cam)
        a, dy, sc, bl = reveal(t, 19.84, 0.35, 24.9, 0.35)
        if a > 0:
            put(fr, text_img("3.7 KM", "black", 140, color=GOLD), C.W / 2, y_sea - 110, a, sc, dy, bl)
        y_land = X.zy(X.AVG_LAND, cam)
        a, dy, sc, bl = reveal(t, 22.48, 0.35, 24.9, 0.35)
        if a > 0:
            put(fr, text_img("0.8 KM", "black", 120, color=GREEN), C.W / 2, y_land - 100, a, sc, dy, bl)
        keyword(fr, t, "EVEREST", 25.76, 28.55, 200, 100)
        keyword(fr, t, "8.8 KM", 26.0, 28.55, 300, 70, GOLD, "xbold")
        a, dy, sc, bl = reveal(t, 27.2, 0.35, 30.6, 0.35)
        if a > 0:
            put(fr, text_img("MARIANA", "xbold", 50), 165, 1110, a, 1, dy, bl)
            put(fr, text_img("TRENCH", "xbold", 50), 165, 1168, a, 1, dy, bl)
            put(fr, text_img("~11 KM", "black", 64, color=GOLD), 165, 1240, a, 1, dy, bl)
        keyword(fr, t, "2 KM", 28.8, 30.65, 230, 130, TURQ)
    keyword(fr, t, "86%", 32.56, 36.2, 360, 210)
    if ex is not None and ex[0] == "dist":
        rotm, R = ex[1]
        x, y, vis = G.project(rotm, G.NEMO[0], G.NEMO[1], R)
        a = ease(seg(t, 40.9, 41.3)) * (1 - ease(seg(t, 43.0, 43.3)))
        if vis and a > 0:
            im = Image.fromarray(fr)
            d = ImageDraw.Draw(im, "RGBA")
            for k in range(3):
                ph = ((t - 40.9) * 0.8 + k / 3) % 1.0
                rr = 14 + ph * 70
                d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(255, 214, 120, int(220 * (1 - ph) * a)), width=4)
            d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=(255, 230, 160, int(255 * a)))
            fr[:] = np.asarray(im)
    keyword(fr, t, "2,688 KM", 41.2, 43.1, 360, 170, GOLD)
    keyword(fr, t, "90%+", 51.52, 53.7, 400, 200)
    keyword(fr, t, "~50%", 55.92, 58.4, 400, 210, CHL)
    keyword(fr, t, "O₂", 56.2, 58.4, 560, 90, WHITE, "xbold")
    keyword(fr, t, "250M YEARS AGO", 62.72, 64.6, 330, 72, WHITE, "xbold")
    keyword(fr, t, "PANGAEA", 64.88, 67.55, 330, 150, EMBER)
    return fr


def _loop_ring(fr, t, R, cy):
    """Glowing orbit loop around the planet for the end card (back half occluded)."""
    a = ease(seg(t, 71.9, 72.6))
    im = Image.new("RGBA", (C.W, C.H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = G.GX
    rx, ry, tilt = R * 1.42, R * 0.30, np.radians(-14)
    th = np.linspace(0, 2 * np.pi, 720)
    xs = rx * np.cos(th)
    ys = ry * np.sin(th)
    px = cx + xs * np.cos(tilt) - ys * np.sin(tilt)
    py = cy + xs * np.sin(tilt) + ys * np.cos(tilt)
    front = np.sin(th) > 0
    inside = (px - cx) ** 2 + (py - cy) ** 2 < (R * 1.01) ** 2
    draw = draw_mask = front | ~inside
    head = (t - 71.9) * 1.6 % (2 * np.pi)
    for i in range(719):
        if not draw[i] or not draw[i + 1]:
            continue
        dd = (th[i] - head) % (2 * np.pi)
        trail = np.exp(-dd / 1.2)
        al = int(255 * a * (0.30 + 0.70 * trail))
        d.line([(px[i], py[i]), (px[i + 1], py[i + 1])], fill=(120, 240, 235, al), width=5)
    glow = im.filter(ImageFilter.GaussianBlur(10))
    k = int(np.argmin(np.abs(((th - head) + np.pi) % (2 * np.pi) - np.pi)))
    if draw[k]:
        d.ellipse([px[k] - 9, py[k] - 9, px[k] + 9, py[k] + 9], fill=(255, 255, 255, int(255 * a)))
    comp = Image.alpha_composite(glow, im)
    base = Image.fromarray(fr).convert("RGBA")
    fr[:] = np.asarray(Image.alpha_composite(base, comp).convert("RGB"))
