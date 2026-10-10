"""Time-warp that re-fits the edit (authored on the English VO) to the Egyptian Arabic VO.

Each anchor pairs a moment in the Arabic narration (new time) with the matching
beat of the original timeline (old time): sentence starts and the key words
that trigger a number or event on screen. Between anchors time is linear.
Arabic timings come from silence detection + per-chunk Whisper transcription
(../storyboard/ar_chunks.json).
"""
import numpy as np

DUR_NEW = 81.5
ANCHORS = [  # (arabic VO seconds, original timeline seconds)
    (0.00, 0.00), (1.85, 1.28), (3.61, 3.45), (5.83, 5.36), (7.60, 7.44), (8.91, 8.64),
    (10.80, 9.84), (12.99, 11.60), (15.00, 13.50), (17.20, 15.30), (18.50, 16.64), (20.67, 18.48),
    (22.40, 19.84), (24.10, 22.00), (24.90, 22.48), (27.78, 25.12), (28.50, 25.76), (29.30, 27.20),
    (32.20, 28.80), (33.80, 30.80), (35.46, 32.32), (35.90, 32.56), (39.63, 36.56), (42.74, 39.12),
    (44.90, 41.20), (47.22, 43.36), (50.48, 46.48), (51.86, 47.92), (53.87, 50.00), (55.30, 51.52),
    (58.59, 54.00), (60.60, 55.92), (62.84, 58.48), (64.14, 59.90), (67.59, 62.32), (69.58, 64.00),
    (70.60, 64.88), (71.90, 65.76), (73.35, 67.84), (74.90, 69.28), (76.04, 70.16), (78.21, 72.00),
    (79.60, 73.28), (80.96, 74.48), (81.50, 75.00),
]
_N = np.array([a for a, _ in ANCHORS])
_O = np.array([b for _, b in ANCHORS])
assert np.all(np.diff(_N) > 0) and np.all(np.diff(_O) > 0)


def new_to_old(t):
    return float(np.interp(t, _N, _O))


def old_to_new(t):
    return np.interp(t, _O, _N)
