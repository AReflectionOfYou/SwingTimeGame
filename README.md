# Swing Time

Swing Time — a pocket handbell choir. Every phone is a handbell with four notes; swing it to ring.
A shared screen (iPad, laptop, or a TV through AirPlay) shows a scrolling lane score, one colored
lane per phone. Each phone joins by scanning a QR code. Plain HTML/CSS/JS, no build step, no server.

Part of the [A Reflection of You](https://github.com/AReflectionOfYou) collection — tools and games that reflect the people who use them.

Play it at <https://areflectionofyou.github.io/SwingTimeGame/>.

## Pages

- `index.html` — home: Demo, Host a game, Toddler mode, Ring on this phone
- `host.html` — shared screen: song → number of phones → QR codes → Start → lane score
- `play.html` — the phone (configured by the QR link: `?song=…&size=…&player=…`, or `?song=…&mode=toddler`)
- `demo.html` — self-playing, looping demo on one phone
- `debug.html` — live sensor readout and threshold sliders

## Editing

- App name and QR base address: `js/config.js` (the name also appears in `manifest.json`)
- Songs: `songs/*.json`, listed in order in `songs/index.json` (the first is the Demo song)
- Default note layouts for 1–4 phones: `data/default-layouts.json`

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

## License

Code is under the [MIT License](LICENSE). Documents, written content, images, audio, and video are under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); see [LICENSE-CONTENT](LICENSE-CONTENT). © 2026 Michael A. Heroux.

## Image policy

No photos or likenesses of any real person, living or dead, appear in this repo or on anything built from it. All images are created together with Claude, so Michael A. Heroux owns them and they are licensed CC BY 4.0. The only exception is Michael himself: his standard professional portrait and an occasional informal photo. Any other exception needs Michael's explicit approval for that specific case. Future contributors, including AI coding sessions, must follow this policy.
