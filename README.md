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

To test locally: `python3 -m http.server` in this folder, then open <http://localhost:8000/>.

## License

MIT. See [LICENSE](LICENSE). Includes [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT), in `js/vendor/qrcode.js`.
