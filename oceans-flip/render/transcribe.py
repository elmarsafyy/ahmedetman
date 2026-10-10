"""Word-level transcription used to time the edit.

Model: NVIDIA Parakeet TDT 0.6B v2 (int8) run through sherpa-onnx, from
https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
usage: python transcribe.py MODEL_DIR voiceover.wav words.json
"""
import json
import sys

import numpy as np
import sherpa_onnx
import soundfile as sf

d = sys.argv[1]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{d}/encoder.int8.onnx", decoder=f"{d}/decoder.int8.onnx", joiner=f"{d}/joiner.int8.onnx",
    tokens=f"{d}/tokens.txt", model_type="nemo_transducer", num_threads=4)
a, sr = sf.read(sys.argv[2], dtype="float32")
if a.ndim > 1:
    a = a.mean(1)
n = int(len(a) * 16000 / sr)
a16 = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)
s = rec.create_stream()
s.accept_waveform(16000, a16)
rec.decode_stream(s)
r = s.result

words, cur = [], None
for tok, t in zip(r.tokens, r.timestamps):
    if tok.startswith((" ", "▁")) or cur is None:
        if cur:
            words.append(cur)
        cur = {"w": tok.replace("▁", "").strip(), "s": round(t, 2)}
    else:
        cur["w"] += tok
if cur:
    words.append(cur)
print(r.text)
json.dump(words, open(sys.argv[3], "w"))
