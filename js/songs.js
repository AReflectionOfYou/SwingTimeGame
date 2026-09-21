// Registry of song JSON files to load, in tier order.
const SONG_FILES = [
  'songs/hot-cross-buns.json',
  'songs/au-clair-de-la-lune.json',
  'songs/mary-had-a-little-lamb.json',
  'songs/merrily-we-roll-along.json',
  'songs/twinkle-twinkle-little-star.json',
  'songs/row-row-row-your-boat.json',
  'songs/ode-to-joy.json',
];

function loadSongs() {
  return Promise.all(
    SONG_FILES.map((path) => fetch(path).then((res) => res.json()))
  );
}
