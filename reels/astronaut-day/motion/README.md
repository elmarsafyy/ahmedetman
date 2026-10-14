# Motion graphics: "A day on the ISS"

A 9:16 (1080×1920, 30 fps) reel, about 101 s long, rendered from code with three.js in headless Chromium.

- `engine.js`: two render layers. The Earth (NASA-based textures, atmosphere, stars) sits in the background and the station, interior and astronaut sit in the foreground. Bloom and a film grade (ACES, grain, vignette) go on top.
- `assets.js`: loads NASA's ISS (`International Space Station (ISS) (D) (IGOAL)`) and `Astronaut` models from github.com/nasa/NASA-3D-Resources, smooths the suit, relaxes the T-pose and adds a reflective gold visor.
- `models.js`: procedural module interior and textures. `props.js` holds the cupola, water sphere, toothbrush, tortilla, bottles, plant chamber and hologram bone/spine.
- `main.js`: the 17 shots, timed to the voiceover. `overlay.js` holds the English keywords and HUD.
- `audio/mix.py`: space pad, cabin fan hum, alarm beeps, flyby, scan sweeps and heartbeat, with music ducked under the voice.

## Build
1. Put the NASA models in `glb/` as `issD.glb` and `astronaut.glb`. They are not committed because of their size.
2. Copy the textures from `reels/moon-hits-earth/motion/fetch-assets.sh` into `tex/`.
3. Install dependencies: `npm i three@0.160.0 three-subdivide@1.1.5 @fontsource/inter @fontsource/jetbrains-mono`.
4. Serve this folder and render: `PAGE=index.html node render.mjs video out.mp4 0 3036` (`render.mjs` expects the server on port 8766).
