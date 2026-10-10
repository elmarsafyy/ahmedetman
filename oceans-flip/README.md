# What If Oceans and Continents Swapped Places? (Brain Loop Short)

Vertical (9:16, 1080×1920, 30 fps, 75 s) science short built on the supplied voice-over.

| Path | What it is |
|---|---|
| `output/what_if_oceans_and_continents_swapped.mp4` | Finished render: picture, synthesized score and SFX, untouched narration |
| `PRODUCTION_PACKAGE.md` | Timestamped storyboard, science review/flags, palette, typography, sound cue sheet, tools, AI-video prompts for a photoreal upgrade |
| `storyboard/words.json` · `transcript.txt` · `captions.srt` | Word-level timing of the narration, plain transcript, platform captions |
| `audio/voiceover.wav` | The supplied narration (unchanged) |
| `render/` | Procedural renderer (NumPy ray-caster + FFmpeg) and audio synthesis; see §9 of the package to re-render |

Earth imagery: NASA Blue Marble Next Generation, NOAA ETOPO1 and the GSHHS land mask (public domain). Score and sound effects are synthesized in `render/audio.py`. Font: Inter (SIL Open Font License).
