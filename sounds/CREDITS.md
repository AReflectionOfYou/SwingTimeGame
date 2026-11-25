# Sound credits

The bell sounds are **not** covered by this project's MIT or CC BY 4.0 notices for
Michael A. Heroux's own work. They are third-party recordings, used under their own license.

## Hand Bells, Singles — InspectorJ

"Hand Bells, Singles" pack by InspectorJ (www.jshaw.co.uk) of Freesound.org

- Author: InspectorJ (Jonathan Shaw), <https://www.jshaw.co.uk>
- Pack: <https://freesound.org/people/InspectorJ/packs/19255/>
- License: [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

| File in `sounds/source/` | Freesound sound |
| --- | --- |
| `339815 - Hand Bells, Low-C, Single (preview).mp3` | <https://freesound.org/people/InspectorJ/sounds/339815/> |
| `339813 - Hand Bells, D, Single (preview).mp3` | <https://freesound.org/people/InspectorJ/sounds/339813/> |
| `339812 - Hand Bells, E, Single (preview).mp3` | <https://freesound.org/people/InspectorJ/sounds/339812/> |
| `339816 - Hand Bells, F, Single (preview).mp3` | <https://freesound.org/people/InspectorJ/sounds/339816/> |
| `339818 - Hand Bells, G, Single (preview).mp3` | <https://freesound.org/people/InspectorJ/sounds/339818/> |
| `339810 - Hand Bells, A, Single (preview).mp3` | <https://freesound.org/people/InspectorJ/sounds/339810/> |
| `339809 - Hand Bells, B, Single (preview).mp3` | <https://freesound.org/people/InspectorJ/sounds/339809/> |
| `339820 - Hand Bells, High-C, Single (preview).mp3` | <https://freesound.org/people/InspectorJ/sounds/339820/> |

The source files are Freesound's 128 kbps MP3 previews of the original recordings.

**Changes made:** `tools/prepare-sounds.py` trims the silence before each strike, shortens
each recording to 3 seconds with a fade-out, retunes each bell (the note to exact pitch,
its main overtone to a twelfth above and quieter, its other overtones quieter), adjusts
levels so the notes match, and re-encodes them as `sounds/c6.m4a` … `sounds/c7.m4a`. The app's lower octave plays the
same recordings at half speed, one octave lower (marked `"shifted"` in
`sounds/manifest.json`).
