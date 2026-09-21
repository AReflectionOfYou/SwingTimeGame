// Registry of song JSON files to load. Phase 1 hard-codes the Tier 1 test
// songs; a song picker (Phase 3) will replace this fixed list.
const SONG_FILES = [
  'songs/hot-cross-buns.json',
  'songs/au-clair-de-la-lune.json',
];

function loadSongs() {
  return Promise.all(
    SONG_FILES.map((path) => fetch(path).then((res) => res.json()))
  );
}
