# What If Oceans and Continents Swapped Places? Production Package

**Channel:** Brain Loop · **Format:** YouTube Shorts / Reels / TikTok, 9:16, 1080 × 1920, 30 fps · **Runtime:** 75.0 s (voice-over 74.48 s + 0.5 s end-card tail)

This folder has two things:

1. **A finished, fully synced render**: `output/what_if_oceans_and_continents_swapped.mp4`. It was produced procedurally (NumPy ray-casting over NASA/NOAA public-domain Earth data, synthesized score and SFX). Its look is cinematic and stylized-realistic. It is *not* a Hollywood path-traced render: there are no volumetric cloud simulations, fluid sims or photographic landscapes. Every visual, label and sound cue is locked to the narration.
2. **This production package** for upgrading to a photoreal version in Blender, After Effects or AI video tools. The same timestamps drive both.

---

## 1. Voice-over analysis

| Property | Value |
|---|---|
| File | `audio/voiceover.wav` (supplied, unmodified) |
| Format | PCM 16-bit, 24 kHz, mono |
| Duration | **74.48 s** (speech 0.26 s → 74.20 s) |
| Loudness | −18.6 LUFS integrated, LRA 3.9 LU |
| Word timing | `storyboard/words.json` (197 words, ±0.08 s, Parakeet-TDT ASR) |
| Captions | `storyboard/captions.srt` (upload as platform captions if wanted) |

The narration is never sped up, cut or re-ordered. The final mix only resamples it (24 → 48 kHz) and applies one uniform loudness gain for delivery (−14 LUFS, −1.5 dBTP limiter ceiling).

### Timed script

| Start | Line | Key emphasis words (s) |
|---:|---|---|
| 0.00 | Flip the map. | Flip 0.00 |
| 1.28 | Every ocean becomes land and every continent becomes ocean. | ocean 1.60 · land 2.56 · continent 3.52 · ocean 4.48 |
| 5.36 | Sounds cool, right? | |
| 6.72 | It would be a nightmare. | nightmare 7.44 |
| 8.64 | Right now, water covers 71% of Earth. | 71% 9.84 |
| 11.60 | Flip it and we're living on a giant dry rock with just a few lonely seas. | dry rock 13.52 · lonely seas 15.20 |
| 16.64 | And the oceans are deep. | deep 17.68 |
| 18.48 | The average seafloor sits 3.7 kilometers down. | 3.7 19.84 |
| 22.00 | Average land, less than one kilometer up. | land 22.48 · one kilometer 23.60 |
| 25.12 | Drop Mount Everest into the Mariana Trench and its peak is still two kilometers underwater. | Everest 25.76 · Trench 27.20 · two kilometers 28.80 |
| 30.80 | Here's the scary part. | |
| 32.32 | About 86% of the water that becomes rain evaporates from the ocean. | 86% 32.56 · evaporates 34.88 |
| 36.56 | Shrink the oceans and the rain disappears. | disappears 38.24 |
| 39.12 | The center of these megacontinents would be thousands of kilometers from any coast. | thousands 41.20 |
| 43.36 | Picture deserts that make the Sahara look like a lawn, with summers like an oven and winters worse than Siberia. | deserts 43.76 · oven 47.28 · winters 47.92 |
| 50.00 | Oceans also absorb over 90% of the extra heat we trap. | 90% 51.52 |
| 54.00 | And tiny ocean plankton make about half the oxygen you're breathing right now. | plankton 54.88 · half 55.92 |
| 58.48 | Fewer oceans means fewer plankton and less air. | fewer plankton 59.92 |
| 62.32 | Earth already tested this. | |
| 64.00 | The supercontinent Pangea had a scorched, bone-dry heart. | Pangea 64.88 · scorched 65.76 |
| 67.84 | So the blue on the map isn't empty space. | empty space 69.28 |
| 70.16 | It's Earth's life support. | life support 70.88 |
| 72.00 | Follow Brain Loop. | |
| 73.28 | Keep your brain looping. | |

Natural pauses (> 0.5 s), used for transition beats: 4.9, 6.2, 7.9, 16.1, 24.6, 30.2, 31.8, 36.1, 38.7, 49.5, 53.4, 58.0, 61.7, 67.4, 71.4.

---

## 2. Science review and flags

The narration was **not changed**. Where a line oversimplifies, the visuals and labels use the defensible version.

| # | Line | Verdict | Visual / label treatment used |
|---|---|---|---|
| 1 | "Every ocean becomes land and every continent becomes ocean" | **Hypothetical, flagged.** If you literally inverted the topography, the ocean's water (≈1.34 billion km³) would not fit in former-continent basins averaging under 1 km deep (≈0.13 billion km³). It would overflow into a near-water world. | The swap is shown as an impossible **map swap** (the land/sea areas exchange, with a glowing sweep front), never as a physical process. The flipped seas are the exact modern continent outlines. |
| 2 | "water covers 71% of Earth" | ✅ ≈70.8 % | "71% OF EARTH'S SURFACE IS WATER", which counts down to "29% WATER IN A FLIPPED WORLD" (consistent with an area swap). |
| 3 | "average seafloor sits 3.7 km down" | ✅ mean ocean depth ≈3,682 m | Dashed reference line at −3.7 km, true vertical scale. |
| 4 | "Average land, less than one kilometer up" | ✅ mean land elevation ≈840 m | Dashed line at +0.84 km, labeled "0.8 KM". |
| 5 | Everest into the Mariana Trench, peak 2 km underwater | ✅ Everest 8,849 m; Challenger Deep ≈10,935 m (published estimates 10,920–10,994 m), so the peak sits ≈2.1 km down | **Vertical axis is true to scale. The horizontal axis is compressed** so it fits 9:16. Everest's real base (tens of km wide) wouldn't fit the trench floor; the shot compares heights only. |
| 6 | "86% of the water that becomes rain evaporates from the ocean" | ✅ ≈86 % of global evaporation is oceanic, and global evaporation ≈ global precipitation | Label: "86% OF EVAPORATION COMES FROM THE OCEAN" (the standard wording). |
| 7 | "Shrink the oceans and the rain disappears" | ⚠️ **Overstated.** Rain would fall sharply and concentrate near the remaining seas; it would not vanish. | Clouds thin out and rain fades as the camera moves inland, but the planet never goes cloudless. Label: "LESS OCEAN = LESS RAIN". Optional re-record: *"…and most of the rain goes with them."* |
| 8 | "thousands of kilometers from any coast" | ✅ On the swapped map, the most landlocked point is today's Point Nemo, **2,688 km** from the nearest land (which would now be sea). Our own distance field computes ≈2,700 km. | Distance-to-sea contours every 500 km plus the "2,688 KM" callout. |
| 9 | Sahara/"oven" summers/winters "worse than Siberia" | ✅ as rhetoric. Extreme continental climate in giant-continent interiors is well supported (e.g. Pangaea climate models). | Shown visually (heat haze versus blizzard); no invented temperatures on screen. |
| 10 | "Oceans absorb over 90% of the extra heat we trap" | ✅ IPCC AR6: ≈91 % of the energy accumulated 1971–2018 went into the ocean | "90%+ OF THE EXTRA HEAT WE TRAP GOES INTO THE OCEAN". The current filaments are stylized, not a current model. |
| 11 | "plankton make about half the oxygen you're breathing" | ⚠️ **Simplified.** About half of Earth's oxygen *production* is marine (NOAA ≈50 %), but most of it is used up again by ocean life. The air's O₂ is a huge reservoir built over geologic time. | Label: "~50% OF EARTH'S OXYGEN IS MADE IN THE OCEAN" (production, not "what you breathe"). |
| 12 | "Fewer oceans means fewer plankton and less air" | ⚠️ **Misleading if read literally.** Atmospheric O₂ would not drop quickly. | Per the brief, **no "oxygen disappearing" visual.** Plankton thin out and the scene desaturates to show ecological vulnerability. Optional re-record: *"…fewer plankton, and a weaker engine behind the air we breathe."* |
| 13 | "Pangea had a scorched, bone-dry heart" | ✅ (assembled ≈335–175 Ma; ≈250 Ma shown). Caveat: Pangaea still had a world ocean, Panthalassa, covering about 70 % of the planet, so it's an analogue for a dry *interior*, not a flipped Earth. | Panthalassa stays visible. No dinosaurs. On-screen spelling is "PANGAEA" (the narration's "Pangea" is the common US spelling; both are correct). The reconstruction is approximate (see §8). |
| 14 | "the blue on the map isn't empty space. It's Earth's life support" | ✅ | Closing cards from the brief: "THE OCEAN ISN'T EMPTY SPACE." / "IT'S EARTH'S LIFE SUPPORT SYSTEM." |

Sources for the figures: NOAA/NCEI (ETOPO ocean depth, ≈50 % ocean O₂ production), USGS/NASA water-cycle budget (≈86 % ocean evaporation), IPCC AR6 WG1 (≈91 % ocean heat uptake), 2020 China–Nepal Everest survey (8,848.86 m), Challenger Deep sonar surveys (≈10,935 m), Point Nemo (2,688 km, Lukatela 1992).

---

## 3. Visual system

**Look:** premium science documentary. Photoreal-leaning planet, data-true geography, warm/cold contrast storytelling, and never a monotonous black frame (space shots always have violet/indigo nebula and a lit planet).

| Role | Color | Hex |
|---|---|---|
| Deep ocean | deep blue | `#06305E` |
| Shallow water / accent text | turquoise | `#5EEAE6` |
| Healthy land | emerald | `#2E8B57` |
| Sunlight / stats | golden | `#FFCC66` |
| Heat / warning accents | ember orange | `#FF9646` |
| Space | indigo · violet · navy | `#1B1446` · `#4B2A7B` · `#0A1030` |
| Dry interior | burnt orange · ochre · red-brown | `#C0612B` · `#C8913A` · `#8A3B1E` |
| Winter | icy blue · silver | `#C7DBF2` · `#D9E1EA` |
| Plankton / oxygen | chlorophyll green | `#BEF578` |

**Typography:** Inter Display Black (headlines and numbers), ExtraBold (secondary lines), Bold with +3 tracking (labels). All caps. Soft dark drop shadow for legibility, no outlines or gimmick fonts.
- Headlines: 90–118 px. Stat numbers: 170–200 px. Labels: 42–44 px (all ≥ 38 px, so they're readable on phones).
- **Safe zones:** all text sits between y ≈ 190 px and y ≈ 1,250 px and within x 90–990 px. That clears the platform top bar (0–150 px), the caption/CTA stack (bottom ~22 %) and the right-hand action rail. The planet rests at y ≈ 1,140 px so headlines never cover it.

---

## 4. Timestamped storyboard

Times are seconds on the voice-over. "→" marks a transition into the next shot.

| # | Time | Narration | Visual | Camera | On-screen text | Sound |
|---|---|---|---|---|---|---|
| 1 | 0.00–1.55 | "Flip the map." | Photoreal Earth (NASA Blue Marble, bathymetry, swirling clouds, blue atmospheric rim) against a violet/indigo nebula. Atlantic and Africa face camera, with a warm terminator on the right. | Fast push-in (R 360→465 px), spin starts to accelerate unnaturally. | **WHAT IF EARTH FLIPPED?** (0.22 s, rises and un-blurs) | Sub impact at 0.05; low D-minor pad. |
| 2 | 1.55–2.95 | "Every ocean becomes land…" | Oceans rise into rugged ochre land: real mid-ocean ridges and fracture zones become mountain belts. A **golden sweep front** crosses left→right. | Spin accelerates (≈110° over 4 s). | **OCEANS BECOME LAND.** (gold, 1.62 s) | Whoosh 1.25; impact 1.58. |
| 3 | 3.35–4.75 | "…every continent becomes ocean." | Continents flood into turquoise-to-deep seas; a **turquoise sweep front** runs right→left. | Spin settles on the Pacific side. | **CONTINENTS BECOME WATER.** (turquoise, 3.52 s) | Reverse whoosh 3.05; impact 3.4. |
| 4 | 4.75–8.45 | "Sounds cool, right? It would be a nightmare." | The flipped planet: a 71 % land world with burnt-orange interiors, salt pans, polar ice caps and very few clouds inland. | Slow orbit. On "nightmare" (7.44) the sun swings to the side (half the planet in shadow), push-in, cooler/darker grade. | (clean frame, a calm beat) | Low boom 7.44. |
| 5 | 8.45–11.6 | "Right now, water covers 71% of Earth." | Snap back to the real blue Pacific. | Slight pull-back, sun returns. | **71%** counter (0→71) + "OF EARTH'S SURFACE IS WATER" (9.84) | Whoosh 8.3. |
| 6 | 11.6–16.6 | "Flip it… giant dry rock… lonely seas." | Fast re-flip; the Pacific becomes one continuous desert. On "lonely seas" (15.2) the remaining seas pulse turquoise. | Slow drift, slight push. | Counter **71% → 29%** (turns ember) + "WATER IN A FLIPPED WORLD" | Whoosh 11.35; impact 11.6. |
| 7 | 16.6–18.45 | "And the oceans are deep." | Back to the real Earth. The camera swings to the Western Pacific and **plunges into the Mariana Trench region**. | Accelerating dolly-in with growing perspective (R 480→3,200 px). → Crossfade with an aqua flash into the cross-section. | (none) | Long rising whoosh 16.9–18.45. |
| 8 | 18.45–21.9 | "The average seafloor sits 3.7 kilometers down." | **Scientific cross-section**: sky, sunlit water with god rays, continental shelf and slope, abyssal plain with a seamount, layered seafloor rock. Vertical scale is true. | Descends from the surface to the abyss. | **3.7 KM** + "AVERAGE OCEAN DEPTH" riding a gold dashed line at −3.7 km (19.84) | Underwater bed, bubbles. |
| 9 | 22.0–24.9 | "Average land, less than one kilometer up." | Pan back to the coast: a green land profile with a dashed line at +0.84 km. Both lines are visible, showing the contrast. | Pan left and pull back slightly. | **0.8 KM** + "AVERAGE LAND HEIGHT" (22.48) | |
| 10 | 25.1–30.7 | "Drop Mount Everest into the Mariana Trench… still two kilometers underwater." | Wide trench view (to −11 km). **Everest falls from the sky (25.6), splashes in (26.15)** and sinks, trailing bubbles, until its base sits on the trench floor (27.8). A bracket marks the 2 km of water above the peak. | Locked wide (true vertical scale). | **MOUNT EVEREST** / "8.8 KM TALL" (25.76) · MARIANA TRENCH / **~11 KM** (27.2) · **PEAK STILL** / "2 KM UNDERWATER" (28.8) | Splash + impact 26.15; bubble burst. |
| 11 | 30.8–32.3 | "Here's the scary part." | Calm beat: the camera rises up through the water toward the bright surface. → Crossfade to the sea. | Rising crane. | (none) | Sub drop 30.8; music thins. |
| 12 | 32.3–36.5 | "About 86% of the water that becomes rain evaporates from the ocean." | Low flyover of open sea with sun glints. **Vapor wisps rise and clouds build overhead**, then rain streaks begin (33.5). | Forward flight toward a distant coastline. | **86%** + "OF EVAPORATION / COMES FROM THE OCEAN" (32.56) | Sea swell bed, light rain. |
| 13 | 36.5–39.0 | "Shrink the oceans and the rain disappears." | Cross the coast: a green coastal belt, then steppe, then desert. **Clouds thin out and the rain stops** as moisture runs out inland; rivers go from wet to dry beds. | Flight speeds up inland. | **LESS OCEAN = LESS RAIN** (36.9) | Rain fades; wind rises. |
| 14 | 39.0–43.45 | "…megacontinents… thousands of kilometers from any coast." | The flipped globe over the old Pacific. **Distance-to-sea contours** (every 500 km) spread out from the coasts and the interior glows ember. A marker pulses at the most landlocked point. | Slow orbit and push. | **2,688 KM** + "TO THE NEAREST SEA" + "FROM POINT NEMO, FLIPPED" (41.2) | Impact 39.05. |
| 15 | 43.45–47.9 | "Picture deserts that make the Sahara look like a lawn, with summers like an oven…" | Ground level: endless **cracked mud and dry riverbeds**, an oppressive white sun, heat-haze shimmer and blowing dust. Warm ochre/burnt-orange grade. | Low, slow dolly forward. | (none: the image carries it) | Desert wind gusts, distant storm rumble. |
| 16 | 47.9–50.1 | "…and winters worse than Siberia." | **Match cut on the same ground**: it freezes into icy silver-blue plates in a howling blizzard with whiteout. Cold grade. | Same dolly (continuity). | (none) | Blizzard howl. |
| 17 | 50.1–54.0 | "Oceans also absorb over 90% of the extra heat we trap." | Real Earth (Indian Ocean). **Golden sunlight streams in from the left**, and the oceans light up with **glowing gold/orange current filaments** carrying heat. | Slow orbit, push-in. | **EARTH'S HEAT REGULATOR** (50.15) · **90%+** "OF THE EXTRA HEAT WE TRAP / GOES INTO THE OCEAN" (51.52) | Restrained shimmer riser. |
| 18 | 54.0–58.4 | "And tiny ocean plankton make about half the oxygen…" | → Aqua flash into the **sunlit upper ocean**: shafts of light, caustics, and drifting phytoplankton (centric and pennate diatoms, diatom chains, dinoflagellates) plus marine snow, all with depth of field. | Slow push forward through the particles. | **~50%** + "OF EARTH'S OXYGEN / IS MADE IN THE OCEAN" (55.92, chlorophyll green) | Underwater bed, music lifts. |
| 19 | 58.4–61.6 | "Fewer oceans means fewer plankton and less air." | Pull back: the **plankton thin out** (about 70 % fade away), light dims, and the frame desaturates. This shows vulnerability without depicting air vanishing. → Crossfade to the globe. | Dolly-out. | (none) | |
| 20 | 61.6–63.15 | "Earth already tested this." | Real Earth facing Africa, then a **rewind spin** (one full reverse revolution, motion-blurred). | Fast reverse spin. | **250 MILLION YEARS AGO** (62.72) | Reverse whoosh 62.25; impact 63.1. |
| 21 | 63.0–64.9 | "The supercontinent…" | **Continents physically drift together into Pangaea**: the Atlantic closes, Gondwana assembles, and the oceans become one Panthalassa. | Slight pull-back to frame the whole supercontinent. | | |
| 22 | 64.9–67.8 | "…Pangea had a scorched, bone-dry heart." | Pangaea with green coasts, an ochre band and a **red-orange interior**; heat shimmer rises on "scorched" (65.76). | Push in on the heart. | **PANGAEA** (64.88, ember) + "~250 MILLION YEARS AGO" | Impact 64.88. |
| 23 | 67.8–71.9 | "So the blue on the map isn't empty space. It's Earth's life support." | The continents drift back to today, then the **vibrant modern Earth** in full sun. | Slow pull-back. | **THE OCEAN ISN'T EMPTY SPACE.** (68.88) · **IT'S EARTH'S LIFE SUPPORT SYSTEM.** (70.16, turquoise) | Final swell, uplifting F-major resolution. |
| 24 | 72.0–75.0 | "Follow Brain Loop. Keep your brain looping." | End card: the planet with a **glowing turquoise orbit loop** and a light comet tracing it (the back half is hidden behind the planet). | Gentle settle. | **FOLLOW BRAIN LOOP** (72.0) · **KEEP YOUR BRAIN LOOPING.** (73.28) | Soft chimes 72.0 and 73.28; music resolves and fades. |

A new visual development lands every 1.5–4 s. Calm beats come before the big reveals: before "nightmare", at "Here's the scary part" and at "Earth already tested this".

---

## 5. Sound design and music cue sheet (as rendered)

All sound except the narration is synthesized in `render/audio.py`, so there are no third-party samples or licensing issues. The bed sits ≈13 dB under the voice, with sidechain ducking on every word.

- **Score:** cinematic pad (detuned additive voices plus a sub drone) in D minor: Dm, Bb–F (the 71 % beat), Dm–Gm–Eb (descent into the deep), Dm–Bb–Gm–A (water cycle into desert/winter tension), Bb–F–C (heat and plankton lift), Gm–A (Pangaea) and Bb–**F major** (resolution on "life support"). A soft plucked ostinato enters at 31 s and builds gradually, with no trailer percussion.
- **Impacts** (pitch-dropping sub + transient, reverb): 0.05, 1.58, 3.4, 7.44, 11.6, 26.15, 30.8, 39.05, 43.36, 50.0, 63.1, 64.88, 67.84, 72.0.
- **Whooshes** (swept band-pass noise, panned): 1.25, 3.05, 8.3, 11.35, 16.9 (long dive riser), 31.0, 38.5, 42.95, 49.6, 53.6, 61.0, 62.25 (rewind), 67.6.
- **Beds:** underwater rumble and bubbles (18–31.4 s, 54–61.5 s); Everest splash and bubble burst (26.1 s); sea swell (31.4–39.2 s); light rain fading inland (33.5–37.6 s); desert wind gusts and distant storm (43.3–48.2 s); blizzard howl (47.8–50.1 s); heat shimmer riser (50–54 s); end chimes (72.0 s, 73.28 s).
- **Delivery:** AAC 256 kb/s, 48 kHz stereo, ≈−14 LUFS integrated, limiter ceiling −1.5 dBFS.

---

## 6. Tools

**Used for the included render (all free and scriptable):**
- Python, NumPy, SciPy and Pillow: a custom planet ray-caster (atmospheric rim and halo, sun glint, cloud layer with shadows, terminator warmth), a cross-section renderer, a ground-plane flyover renderer with mip-mapped textures, and a particle/sprite system for the plankton.
- Data: NASA Blue Marble Next Generation, NOAA ETOPO1 and the GSHHS land mask, all public domain (via the `basemap-data` package).
- Pangaea: rigid rotations of modern plates (Bullard 1965 South Atlantic fit, a central-Atlantic closure pole and two-point Gondwana fits). It's a visualization, not a plate model.
- Parakeet-TDT (sherpa-onnx) for word-level timing; FFmpeg/x264 for encoding.

**Photoreal upgrade path (recommended):**
- **Blender 4.x (Cycles):** a planet shader from NASA Blue Marble, ETOPO displacement, NASA cloud maps and Nishita sky/atmosphere. Build the flip by driving the land/sea masks with the same timings (§4). Do the cross-section in Geometry Nodes with real ETOPO profiles.
- **GPlates + EarthByte rotation models (Müller et al.)** for a published Pangaea reconstruction.
- **Houdini / EmberGen** for volumetric clouds, dust and blizzard; **Blender ocean modifier / Houdini FLIP** for the Everest splash.
- **AI video generators** (Google Veo, Runway Gen-4, Kling, Sora) for ground-level B-roll and the plankton macro world. **Don't** use them for the globe, the maps or the to-scale cross-section: they can't guarantee correct geography or scale.
- **Finishing:** DaVinci Resolve (grade and Fairlight mix) or After Effects + Premiere. Reuse `storyboard/words.json` for keyframe timing and `captions.srt` for captions.

---

## 7. AI video prompts (for the photoreal B-roll)

Generate at 9:16, at least 1080 × 1920, 24–30 fps. These are written for Veo / Runway / Kling-style models. Use the same shared negative prompt on every shot:

> *Negative: cartoon, illustration, low-poly, text, captions, watermark, logo, UI, lens flare overload, oversaturated neon, shaky handheld, fisheye, dinosaurs, people, animals, cities.*

1. **Opening planet (0–4.8 s):** "Photorealistic Earth floating in space, NASA Blue Marble detail, deep-blue oceans, green and tan continents, swirling white cloud bands, thin glowing blue atmosphere, warm sunlight from the left with a golden terminator, rich violet and indigo nebula with stars behind. Slow cinematic push-in while the planet's rotation accelerates unnaturally. IMAX documentary look, 35 mm, high dynamic range." (Composite the land/sea swap on top with the masks; don't ask the model to invent geography.)
2. **Dry planet (4.8–8.4 s):** "Photorealistic alien-looking Earth that is 70 percent desert: rust-orange and ochre continents with long mountain ridges and canyon systems, a few isolated dark-blue inland seas, sparse clouds, white polar caps. Orbital camera drifting sideways, sunlight sliding to a dramatic half-lit angle, sense of emptiness and enormous scale."
3. **Underwater descent (16.6–18.5 s):** "First-person plunge from the ocean surface into deep blue water above a deep-sea trench, sun shafts fading into darkness, particles of marine snow streaming past the lens, smooth accelerating dolly down, documentary realism."
4. **Clouds over the sea (32.3–36.5 s):** "Low cinematic drone flight over an open turquoise ocean at mid-morning, sun glitter on waves, thin vapor rising off the water, cumulus clouds building overhead and the first curtains of rain falling in the distance, 4K nature-documentary grade."
5. **Clouds dying inland (36.5–39 s):** "Drone flight continuing from a coastline over a narrow green coastal strip into dry steppe and then desert; clouds above thin out and break apart, dry riverbeds snake toward the coast, harsh clear sky ahead, smooth forward motion."
6. **Interior desert (43.4–47.9 s):** "Ground-level cinematic dolly over endless cracked dry mud and dry riverbeds to the horizon, oppressive white sun high in a hazy sky, strong heat-haze shimmer, wind-blown dust streaming across the frame, burnt orange and ochre palette, 8K documentary realism."
7. **Brutal winter (47.9–50 s, match cut):** "The exact same flat cracked plain now frozen solid: silver-blue ice plates and wind-packed snow, a howling blizzard driving snow sideways, whiteout fog, weak pale sun, cold steel-blue grade, same low dolly move."
8. **Sunlight and ocean heat (50–54 s):** "Photoreal Earth from orbit over the Indian Ocean, golden sunlight streaming in, the ocean surface subtly glowing with warm orange-gold heat currents that flow along the gyres, deep-blue water, thin atmosphere. Elegant scientific-visualization style, slow orbit."
9. **Phytoplankton world (54–61.6 s):** "Macro underwater shot inside sunlit ocean water: translucent diatoms (round centric and long pennate), diatom chains and dinoflagellates drifting, glowing green-gold chloroplasts, silica shells catching light, god rays from the surface above, shallow depth of field, slow forward drift, then a gentle pull-back as the particles thin out. Scientific realism, not fantasy."
10. **Pangaea (63–67.8 s):** "Photorealistic ancient Earth 250 million years ago: the single supercontinent Pangaea surrounded by the vast Panthalassa ocean, green coastal margins, a red-orange bone-dry interior with salt flats, dramatic clouds only along the coasts. Orbital camera pushing toward the scorched interior, heat shimmer." (Replace the continent shapes with a GPlates reconstruction for accuracy.)
11. **Finale (67.8–75 s):** "The vibrant modern blue Earth in full sunlight, brilliant ocean glint, swirling white clouds, glowing blue atmosphere, slow majestic pull-back into a violet starfield, uplifting and clean, final frame with negative space above the planet for titles."

---

## 8. Known approximations in the included render

- **Pangaea:** continents are moved by rigid rotations of modern outlines, so shelf geometry, terranes and Asia's blocks are simplified. Treat the shot as "scientifically inspired"; swap in a GPlates reconstruction for publication-grade accuracy.
- **Cross-section:** the horizontal axis is compressed (heights are true to scale).
- **Ocean-heat filaments:** stylized flow, not a circulation model.
- **Flipped-world terrain:** relief comes from real seafloor bathymetry; colors follow distance from the nearest sea (greener coasts, burnt interior), which is a reasonable but illustrative climate proxy.

---

## 9. Re-render

```bash
pip install -r oceans-flip/render/requirements.txt          # + ffmpeg on PATH
pip download --no-deps basemap-data -d dl && python -m zipfile -e dl/basemap_data-*.whl dl/x
python oceans-flip/render/prep.py dl/x/mpl_toolkits/basemap_data cache      # ~1 min, builds textures
OF_CACHE=cache python oceans-flip/render/render.py out oceans-flip/audio/voiceover.wav --workers 4
# re-render one segment (indices in SEGMENTS, render.py) and re-mux:
OF_CACHE=cache python oceans-flip/render/render.py out oceans-flip/audio/voiceover.wav --segments 2
```
