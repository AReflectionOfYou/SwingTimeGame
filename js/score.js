(function () {
  const SONG_KEY = 'handbell-score-song';

  const picker = document.getElementById('song-picker');
  const stage = document.getElementById('score-stage');

  let songs = [];
  let currentIndex = 0;
  let activePlayer = null;

  function songCard(song) {
    const card = document.createElement('section');
    card.className = 'panel score-panel';

    const heading = document.createElement('div');
    heading.className = 'score-heading';
    const title = document.createElement('h2');
    title.className = 'score-title';
    title.textContent = song.title;
    const meta = document.createElement('span');
    meta.className = 'score-meta';
    meta.textContent = song.beatsPerMeasure + '/4 time';
    heading.appendChild(title);
    heading.appendChild(meta);

    const grid = document.createElement('div');
    grid.className = 'score-grid-wrap';

    const handle = renderScore(song, grid);
    const player = createScorePlayer(song, handle);

    card.appendChild(heading);
    card.appendChild(player.element);
    card.appendChild(grid);

    return { element: card, player: player };
  }

  function renderPicker() {
    picker.innerHTML = '';
    songs.forEach((song, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'song-picker-btn';
      btn.classList.toggle('active', i === currentIndex);
      btn.textContent = song.title;
      btn.addEventListener('click', () => selectSong(i));
      picker.appendChild(btn);
    });
  }

  function renderStage() {
    if (activePlayer) activePlayer.dispose();
    stage.innerHTML = '';
    const card = songCard(songs[currentIndex]);
    activePlayer = card.player;
    stage.appendChild(card.element);
  }

  function selectSong(index) {
    currentIndex = index;
    localStorage.setItem(SONG_KEY, String(index));
    renderPicker();
    renderStage();
  }

  loadSongs()
    .then((loadedSongs) => {
      songs = loadedSongs;
      const saved = Number(localStorage.getItem(SONG_KEY));
      currentIndex = Number.isInteger(saved) && saved >= 0 && saved < songs.length ? saved : 0;
      renderPicker();
      renderStage();
    })
    .catch((err) => {
      stage.textContent = 'Could not load songs: ' + err.message;
    });
})();
