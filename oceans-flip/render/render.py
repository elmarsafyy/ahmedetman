"""Render the short: python render.py OUT_DIR VOICEOVER.wav [--segments 0,3] [--workers 4] [--mux-only]

Frames are rendered in parallel (fork) and piped to x264 per segment, so any
segment can be re-rendered on its own. Segments are then concatenated and
muxed with the score/SFX mix (voice-over untouched, -14 LUFS delivery).
"""
import argparse
import multiprocessing as mp
import os
import subprocess
import sys
import time

FPS = 30
SEGMENTS = [(0.0, 8.6), (8.6, 18.45), (18.45, 31.6), (31.6, 39.0), (39.0, 43.45), (43.45, 50.1),
            (50.1, 54.1), (54.1, 61.6), (61.6, 68.85), (68.85, 75.0)]

_T = None
_WARP = None          # new-time -> old-time mapping for a re-timed voice-over


def _init():
    pass


def _work(i):
    t = i / FPS
    if _WARP is not None:
        t = _WARP(t)
    return _T.render_frame(t).tobytes()


def render_segment(k, out_dir, workers, segments=SEGMENTS):
    t0, t1 = segments[k]
    f0, f1 = int(round(t0 * FPS)), int(round(t1 * FPS))
    path = os.path.join(out_dir, f"seg_{k:02d}.mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920",
           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
           "-profile:v", "high", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-g", "60", path]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    st = time.time()
    with mp.get_context("fork").Pool(workers, _init) as pool:
        for n, buf in enumerate(pool.imap(_work, range(f0, f1), chunksize=2)):
            enc.stdin.write(buf)
            if n % 30 == 0:
                print(f"seg {k} frame {f0 + n}/{f1} ({time.time() - st:.0f}s)", flush=True)
    enc.stdin.close()
    enc.wait()
    print(f"seg {k} done in {time.time() - st:.0f}s", flush=True)


def mux(out_dir, vo, final, nseg=len(SEGMENTS), audio_args=()):
    lst = os.path.join(out_dir, "segments.txt")
    with open(lst, "w") as f:
        for k in range(nseg):
            f.write(f"file 'seg_{k:02d}.mp4'\n")
    video = os.path.join(out_dir, "video_only.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video],
                   check=True)
    mix = os.path.join(out_dir, "mix.wav")
    here = os.path.dirname(os.path.abspath(__file__))
    subprocess.run([sys.executable, os.path.join(here, "audio.py"), vo, mix, *audio_args], check=True)
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", mix, "-af", "ebur128", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    lufs = float(meas.rsplit("I:", 1)[1].split("LUFS")[0])
    gain = -14.0 - lufs                       # deliver at -14 LUFS, limiter ceiling -1.5 dBFS
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", mix,
                    "-af", f"volume={gain:.2f}dB,alimiter=limit=0.84:level=false:attack=2:release=60",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
                    "-movflags", "+faststart", "-shortest", final], check=True)
    print("wrote", final)


def main():
    global _T
    ap = argparse.ArgumentParser()
    ap.add_argument("out_dir")
    ap.add_argument("vo")
    ap.add_argument("--segments", default=None)
    ap.add_argument("--workers", type=int, default=os.cpu_count())
    ap.add_argument("--mux-only", action="store_true")
    ap.add_argument("--final", default=None)
    ap.add_argument("--timemap", action="store_true", help="re-time the edit with timemap.py (Arabic VO)")
    a = ap.parse_args()
    global _WARP
    segments = SEGMENTS
    audio_args = ()
    if a.timemap:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import timemap as TMAP
        _WARP = TMAP.new_to_old
        bounds = [float(TMAP.old_to_new(s)) for s, _ in SEGMENTS] + [TMAP.DUR_NEW]
        segments = list(zip(bounds[:-1], bounds[1:]))
        audio_args = ("--timemap",)
    os.makedirs(a.out_dir, exist_ok=True)
    final = a.final or os.path.join(a.out_dir, "what_if_oceans_and_continents_swapped.mp4")
    if not a.mux_only:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import timeline as T
        import core as C
        import pangaea as P
        C.space(0)            # build shared caches before forking
        P.paleo_colour()
        _T = T
        segs = range(len(segments)) if a.segments is None else [int(s) for s in a.segments.split(",")]
        for k in segs:
            render_segment(k, a.out_dir, a.workers, segments)
    mux(a.out_dir, a.vo, final, len(segments), audio_args)


if __name__ == "__main__":
    main()
