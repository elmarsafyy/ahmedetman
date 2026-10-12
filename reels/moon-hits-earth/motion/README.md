# Motion graphics: "What if the Moon hit Earth?"

A 9:16 (1080×1920, 30 fps) reel, about 97 s long, rendered from code. It uses a three.js scene with realistic Earth and Moon shaders, a DOM layer for the text and HUD, and a synthesized sound bed.

## Files
- `main.js`: the 3D scenes and timeline (19 shots, each synced to the voiceover word timings)
- `shaders.js`: Earth (day/night, clouds, ocean glint, floods, volcanoes, impacts, magma), atmosphere, Moon (bump, cracks), points, final grade (ACES, grain, vignette, chromatic aberration)
- `overlay.js`: keyword typography and HUD (distance counter, markers, Roche limit, force arrows, seismograph)
- `render.mjs`: renders frames deterministically in headless Chromium and pipes them to ffmpeg
- `audio/word-timings.json`: word timings from forced alignment of the voiceover (`audio/align.py`, pocketsphinx)
- `audio/mix.py`: drone, impacts, risers and whooshes, with music ducked under the voice

## Build
```bash
./fetch-assets.sh                 # textures from the three.js examples (MIT) + flood mask
npm install
python3 -m http.server 8765 &     # serve this folder
node render.mjs stills ../stills 1.5 50.4 86.6    # preview frames
node render.mjs video part.mp4 0 2910             # full video (frames 0..2910)
python3 audio/mix.py                              # expects audio/voice48.wav
```
`render.mjs` imports Playwright from the global install path; change the import if yours is somewhere else.
