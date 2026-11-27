# Swing Time

Swing Time — a pocket handbell choir. Every phone is a handbell with four notes; swing it to ring.
A shared screen (iPad, laptop, or a TV through AirPlay) shows a scrolling lane score, one colored
lane per phone. Each phone joins by scanning a QR code. Plain HTML/CSS/JS, no build step, no server.

Part of the [A Reflection of You](https://github.com/AReflectionOfYou) collection — tools and games that reflect the people who use them.

Play it at <https://areflectionofyou.github.io/SwingTimeGame/>.

## Pages

- `index.html` — home: Demo (with a song picker), Host a game, Toddler mode, Ring on this phone
- `host.html` — shared screen: song → number of phones → QR codes → Start → lane score
- `play.html` — the phone (configured by the QR link: `?song=…&size=…&player=…`, or `?song=…&mode=toddler`)
- `demo.html` — self-playing, looping demo on one phone; `demo.html?song=<id>` plays any song
  (the id is its file name in `songs/`, without `.json`)
- `debug.html` — live sensor readout and threshold sliders

## Editing

- App name and QR base address: `js/config.js` (the name also appears in `manifest.json`)
- Songs: `songs/*.json`, listed in order in `songs/index.json` (the first is the default Demo song).
  A part is a string of notes, one beat each by default; `Sol/0.75` gives a note its own
  length in beats, `-` is a rest and `|` a bar line. An arrangement's `"alternate": ["Mi"]`
  makes phones that share a note take turns instead of ringing together. Parts that have the
  same note at the same moment ring one bell. The format is described at the top of `js/songs.js`.
- To hear a song while editing it, open `demo.html?song=<id>`. It plays the song's largest arrangement.
- Default note layouts for 1–4 phones: `data/default-layouts.json`
- After changing any file in `css/` or `js/`, bump the `?v=` number on its links in every `.html` page
  (for example `?v=2` → `?v=3`) so browsers fetch the new copy instead of a cached one.

### Printed QR codes

Every QR code links to the address in `baseUrl` (`js/config.js`), currently
`https://areflectionofyou.github.io/SwingTimeGame/`. **If the repository is renamed or moved,
printed codes stop working** — GitHub Pages does not redirect the old address. After a move,
update `baseUrl` and reprint. Codes shown on the shared screen are generated fresh each time,
so they follow `baseUrl` automatically.

To test locally: `python3 -m http.server` in this folder, then open <http://localhost:8000/>. Codes still point at the live site; to have phones
load your local copy, temporarily set `baseUrl` to `''` and open the host page via your
computer's network address.

## Third-party code

Includes [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT), in `js/vendor/qrcode.js`.

## Third-party sounds

The bell sounds are the "Hand Bells, Singles" pack by InspectorJ (www.jshaw.co.uk) of
Freesound.org, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). They are
not covered by the license notices below. Sources, links and the changes made are in
[sounds/CREDITS.md](sounds/CREDITS.md). To rebuild the app's sound files from
`sounds/source/`, run `python3 tools/prepare-sounds.py` on a Mac (about a minute), then bump
`SOUNDS_VERSION` in `js/audio.js`. The script also retunes each bell, because the recordings'
overtones clash in chords. For a brighter or mellower sound, change `OVERTONE_DB` and `REST_DB`
at the top of the script.

## Music sources

The tunes are traditional or in the public domain. Several were checked against scores from the
[Open Hymnal Project](https://github.com/mzealey/openhymnal) and the
[Mutopia Project](https://www.mutopiaproject.org/). Where a song file has an `_about` note, it gives
that song's source and anything simplified to fit the bells.

## Analytics

Every page except `debug.html` counts visits with [GoatCounter](https://www.goatcounter.com/), which uses no cookies. If you
publish your own copy, remove its script from those pages or point it at your own account.

## Versions and problem reports

The game's version is set once, in the `version` meta tag in [index.html](index.html), and appears in the
About panel. Bump it with each release. About also has a **Having problems?** link that offers to open a
new GitHub issue for this game with the version and browser filled in; it notes that reporting an issue
needs a GitHub account.

## License

Code is under the [MIT License](LICENSE). Documents, written content, images, audio, and video are under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); see [LICENSE-CONTENT](LICENSE-CONTENT). © 2026 Michael A. Heroux.

## Image policy

No photos or likenesses of any real person, living or dead, appear in this repo or on anything built from it. All images are created together with Claude, so Michael A. Heroux owns them and they are licensed CC BY 4.0. The only exception is Michael himself: his standard professional portrait and an occasional informal photo. Any other exception needs Michael's explicit approval for that specific case. Future contributors, including AI coding sessions, must follow this policy.
