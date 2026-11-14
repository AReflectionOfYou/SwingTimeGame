// Loads song data and resolves an arrangement into what the screens need:
// which phones exist, what each phone's gestures play, and a time-ordered
// list of cues { phone, gesture, note, beat }.
//
// Song file shape (see songs/*.json):
//   title, bpm, beatsPerMeasure
//   parts:        { name: beat-grid string | [{ note, beat }] }
//   arrangements: { "1".."4": { layout: {A:{forward,back,left,right},…} | "default",
//                               parts: [part names],
//                               alternate: [note names] (optional),
//                               notes: [{ phone, gesture, beat }] (optional, explicit) } }
//   melody:       [note names] — optional; enables Toddler mode
//
// A part note is rung by every phone whose layout holds that note (so a note
// placed on two phones is deliberately doubled), unless the note is listed in
// "alternate", in which case its holders take turns.

const SONG_SIZES = ['1', '2', '3', '4'];

let _defaultLayoutsPromise = null;
let _songIndexPromise = null;
const _songCache = {};

function fetchJson(path) {
  return fetch(path, { cache: 'no-cache' }).then((res) => {
    if (!res.ok) throw new Error('Could not load ' + path + ' (' + res.status + ')');
    return res.json();
  });
}

function loadDefaultLayouts() {
  if (!_defaultLayoutsPromise) _defaultLayoutsPromise = fetchJson('data/default-layouts.json');
  return _defaultLayoutsPromise;
}

function loadSongIndex() {
  if (!_songIndexPromise) _songIndexPromise = fetchJson('songs/index.json').then((d) => d.songs);
  return _songIndexPromise;
}

function loadSong(id) {
  if (!/^[a-z0-9-]+$/.test(id || '')) return Promise.reject(new Error('Unknown song'));
  if (!_songCache[id]) {
    _songCache[id] = fetchJson('songs/' + id + '.json').then((song) => {
      song.id = id;
      return song;
    });
  }
  return _songCache[id];
}

function loadAllSongs() {
  return loadSongIndex().then((ids) => Promise.all(ids.map(loadSong)));
}

// Beat grid → [{ note, beat }]. One token per beat by default:
//   "Mi Re Do - | Mi …"            ('-' is a rest, '|' a bar line, ignored)
// A token may give its own length in beats after a slash, for dotted and
// short notes:
//   "Sol/0.75 La/0.25 Sol/0.5 Mi/1.5 | -/0.5 …"
function parseGrid(grid) {
  const events = [];
  let beat = 0;
  grid
    .split(/\s+/)
    .filter(Boolean)
    .forEach((tok) => {
      if (tok === '|') return;
      const [name, len] = tok.split('/');
      if (name !== '-' && name !== '.') events.push({ note: name, beat: Math.round(beat * 1000) / 1000 });
      beat += len === undefined ? 1 : Number(len);
    });
  return events;
}

function partEvents(part) {
  if (typeof part === 'string') return parseGrid(part);
  if (Array.isArray(part)) return part;
  return [];
}

function stripComments(obj) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    if (!k.startsWith('_')) out[k] = obj[k];
  });
  return out;
}

function validateLayout(layout, warnings, where) {
  Object.keys(layout).forEach((phone) => {
    if (!laneByLetter(phone)) warnings.push(where + ': unknown phone "' + phone + '"');
    const slots = layout[phone];
    const seen = new Set();
    GESTURES.forEach((g) => {
      const note = slots[g];
      if (!isNoteName(note)) warnings.push(where + ' ' + phone + '.' + g + ': "' + note + '" is not a note');
      if (seen.has(note)) warnings.push(where + ' ' + phone + ': "' + note + '" appears twice');
      seen.add(note);
    });
  });
}

// Returns { size, phones: ['A',…], layout, cues: [...], lastBeat, warnings }
// or null when the song has no arrangement for that size.
function resolveArrangement(song, size, defaultLayouts) {
  const key = String(size);
  const arr = song.arrangements && song.arrangements[key];
  if (!arr) return null;
  const warnings = [];
  const where = song.title + ' [' + key + ' phone' + (key === '1' ? '' : 's') + ']';

  let layout = arr.layout;
  if (layout === 'default' || !layout) layout = defaultLayouts && defaultLayouts[key];
  layout = stripComments(layout);
  validateLayout(layout, warnings, where);

  const phones = LANES.map((l) => l.letter).slice(0, Number(key));
  phones.forEach((p) => {
    if (!layout[p]) warnings.push(where + ': no layout for phone ' + p);
  });

  // note → [{ phone, gesture }]
  const holders = {};
  phones.forEach((phone) => {
    GESTURES.forEach((gesture) => {
      const note = layout[phone] && layout[phone][gesture];
      if (!note) return;
      (holders[note] = holders[note] || []).push({ phone, gesture });
    });
  });

  // A note held by two or more phones normally rings on all of them
  // (doubling). Notes listed in "alternate" instead go to one holder: one
  // that is free at that beat (not already ringing another note of the
  // chord), and of those the one idle longest, so a run of fast repeated
  // notes is shared out.
  const alternate = new Set(arr.alternate || []);
  const isShared = (note) => alternate.has(note) && (holders[note] || []).length > 1;
  const lastCueBeat = {};
  const events = [];
  (arr.parts || []).forEach((partName) => {
    const part = song.parts && song.parts[partName];
    if (!part) {
      warnings.push(where + ': missing part "' + partName + '"');
      return;
    }
    partEvents(part).forEach((ev) => events.push({ ...ev, part: partName }));
  });
  events.sort((a, b) => a.beat - b.beat);
  const byBeat = new Map();
  events.forEach((ev) => {
    if (!byBeat.has(ev.beat)) byBeat.set(ev.beat, []);
    byBeat.get(ev.beat).push(ev);
  });

  const cues = [];
  const ring = (h, ev) => {
    cues.push({ phone: h.phone, gesture: h.gesture, note: ev.note, beat: ev.beat, part: ev.part });
    lastCueBeat[h.phone] = ev.beat;
  };
  byBeat.forEach((evs, beat) => {
    const busy = new Set();
    const shared = [];
    evs.forEach((ev) => {
      const hs = holders[ev.note];
      if (!hs) {
        warnings.push(where + ': ' + ev.note + ' at beat ' + beat + ' (' + ev.part + ') is not on any phone');
      } else if (!isShared(ev.note)) {
        hs.forEach((h) => {
          ring(h, ev);
          busy.add(h.phone);
        });
      } else if (!shared.some((s) => s.note === ev.note)) {
        shared.push(ev); // the same note in two parts at once rings once
      }
    });
    if (!shared.length) return;
    // Give each shared note a different free phone if at all possible
    // (a tiny search; a chord has at most a handful of notes), trying the
    // longest-idle holders first.
    const idle = (h) => (lastCueBeat[h.phone] === undefined ? -Infinity : lastCueBeat[h.phone]);
    const options = shared.map((ev) => holders[ev.note].slice().sort((a, b) => idle(a) - idle(b)));
    let best = null;
    const pick = [];
    const search = (i, clashes) => {
      if (best && clashes >= best.clashes) return;
      if (i === shared.length) {
        best = { clashes, pick: pick.slice() };
        return;
      }
      options[i].forEach((h) => {
        const clash = busy.has(h.phone) || pick.some((p) => p.phone === h.phone);
        pick.push(h);
        search(i + 1, clashes + (clash ? 1 : 0));
        pick.pop();
      });
    };
    search(0, 0);
    best.pick.forEach((h, i) => ring(h, shared[i]));
  });
  (arr.notes || []).forEach((n) => {
    const note = layout[n.phone] && layout[n.phone][n.gesture];
    if (!note) {
      warnings.push(where + ': explicit note ' + n.phone + '.' + n.gesture + ' has no note');
      return;
    }
    cues.push({ phone: n.phone, gesture: n.gesture, note, beat: n.beat, part: 'notes' });
  });

  // Drop exact duplicates; flag a phone asked to make two different swings
  // at the same moment.
  const seen = new Map();
  const unique = [];
  cues.forEach((c) => {
    const k = c.phone + '@' + c.beat;
    const prev = seen.get(k);
    if (prev) {
      if (prev.gesture !== c.gesture) {
        warnings.push(where + ': phone ' + c.phone + ' has two notes at beat ' + c.beat + ' (' + prev.note + ', ' + c.note + ')');
      }
      return;
    }
    seen.set(k, c);
    unique.push(c);
  });
  unique.sort((a, b) => a.beat - b.beat || a.phone.localeCompare(b.phone));

  const lastBeat = unique.length ? unique[unique.length - 1].beat : 0;
  warnings.forEach((w) => console.warn('[songs] ' + w));
  return { size: Number(key), phones, layout, cues: unique, lastBeat, warnings };
}

function availableSizes(song) {
  return SONG_SIZES.filter((s) => song.arrangements && song.arrangements[s]).map(Number);
}

function hasToddler(song) {
  return Array.isArray(song.melody) && song.melody.length > 0;
}

// --- Links carried by QR codes ---------------------------------------------

function playerLink(songId, size, playerNumber) {
  const url = new URL('play.html', appBaseUrl());
  url.searchParams.set('song', songId);
  url.searchParams.set('size', String(size));
  url.searchParams.set('player', String(playerNumber));
  return url.href;
}

function toddlerLink(songId) {
  const url = new URL('play.html', appBaseUrl());
  url.searchParams.set('song', songId);
  url.searchParams.set('mode', 'toddler');
  return url.href;
}
