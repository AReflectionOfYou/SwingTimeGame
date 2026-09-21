(function () {
  const scoreList = document.getElementById('score-list');

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
    meta.textContent = song.bpm + ' BPM · ' + song.beatsPerMeasure + '/4';
    heading.appendChild(title);
    heading.appendChild(meta);

    const grid = document.createElement('div');
    grid.className = 'score-grid-wrap';

    card.appendChild(heading);
    card.appendChild(grid);
    renderScore(song, grid);
    return card;
  }

  loadSongs()
    .then((songs) => {
      songs.forEach((song) => scoreList.appendChild(songCard(song)));
    })
    .catch((err) => {
      scoreList.textContent = 'Could not load songs: ' + err.message;
    });
})();
