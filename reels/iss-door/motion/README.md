# Motion graphics: "What if you opened the ISS door?"

A 9:16 (1080×1920, 30 fps) reel, about 91 s long. It uses the same two-layer three.js engine as `reels/astronaut-day/motion`, with NASA's ISS and astronaut models plus:

- `door.js`: the CBM-style hatch with a turning handle and latch lights, a cylindrical airlock with an EVA hatch that blows out onto Earth, cabin fog, an air stream, the 1966 vacuum test chamber, and tea leaves with a hairline leak.
- `main.js`: 16 shots timed word by word to the voiceover (`audio/word-timings.json`, forced alignment).
- `overlay.js`: keywords plus HUD (pressure arrows, 35,000 LB counter, cabin temperature, sound wave, PSI gauge, 15-second countdown, ±250°F, 1:30 timer).
- `audio/mix.py`: alarm, handle clunks, a decompression roar that fades into total silence, heartbeat, boiling, an old film projector, a leak whistle, and the hatch locking.

Build as in `reels/astronaut-day/motion/README.md`. This one also needs `glb/glove.glb` from NASA-3D-Resources. Serve the folder on port 8767.
