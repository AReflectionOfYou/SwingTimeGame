(function () {
  const settings = loadSettings();
  const gestureLog = [];
  const MAX_LOG_ENTRIES = 20;

  const enableButton = document.getElementById('enable-motion');
  const statusLine = document.getElementById('status-line');
  const readouts = {
    x: document.getElementById('readout-x'),
    y: document.getElementById('readout-y'),
    z: document.getElementById('readout-z'),
    magnitude: document.getElementById('readout-magnitude'),
    gamma: document.getElementById('readout-gamma'),
  };
  const logList = document.getElementById('gesture-log');
  const resetButton = document.getElementById('reset-settings');

  const sliderConfigs = [
    { key: 'triggerThreshold', id: 'slider-trigger', suffix: ' m/s²' },
    { key: 'refractoryMs', id: 'slider-refractory', suffix: ' ms' },
    { key: 'twistThreshold', id: 'slider-twist', suffix: ' deg/s' },
  ];

  function formatNum(n) {
    return n.toFixed(2);
  }

  function renderReadout(sample) {
    readouts.x.textContent = formatNum(sample.x);
    readouts.y.textContent = formatNum(sample.y);
    readouts.z.textContent = formatNum(sample.z);
    readouts.magnitude.textContent = formatNum(sample.magnitude);
    readouts.gamma.textContent = formatNum(sample.gammaRate);
  }

  function renderLog() {
    logList.innerHTML = '';
    gestureLog.forEach((entry) => {
      const li = document.createElement('li');
      const ageSec = ((performance.now() - entry.time) / 1000).toFixed(2);
      li.innerHTML =
        '<span class="gesture-name">' +
        entry.gesture +
        '</span><span class="ago">' +
        ageSec +
        's ago</span>';
      logList.appendChild(li);
    });
  }

  function handleGesture(gesture) {
    gestureLog.push({ gesture, time: performance.now() });
    if (gestureLog.length > MAX_LOG_ENTRIES) gestureLog.shift();
    renderLog();
  }

  const detector = new GestureDetector({
    settings,
    onGesture: handleGesture,
    onSample: renderReadout,
  });

  setInterval(renderLog, 250);

  let motionActive = false;
  let permissionGranted = false;

  async function startMotion() {
    enableButton.disabled = true;
    if (!permissionGranted) {
      statusLine.textContent = 'Requesting permission…';
      try {
        const granted = await GestureDetector.requestPermission();
        if (!granted) {
          statusLine.textContent = 'Motion permission denied. Reload to try again.';
          enableButton.disabled = false;
          return;
        }
        permissionGranted = true;
      } catch (err) {
        statusLine.textContent = 'Could not enable motion: ' + err.message;
        enableButton.disabled = false;
        return;
      }
    }
    detector.start();
    motionActive = true;
    enableButton.textContent = 'Stop Motion';
    enableButton.disabled = false;
    statusLine.textContent = 'Motion enabled — live readout below.';
  }

  function stopMotion() {
    detector.stop();
    motionActive = false;
    enableButton.textContent = 'Enable Motion';
    statusLine.textContent = 'Motion stopped.';
  }

  enableButton.addEventListener('click', () => {
    if (motionActive) {
      stopMotion();
    } else {
      startMotion();
    }
  });

  function bindSlider({ key, id, suffix }) {
    const input = document.getElementById(id);
    const valueLabel = document.querySelector('label[for="' + id + '"] .value');
    const limits = SETTINGS_LIMITS[key];
    input.min = limits.min;
    input.max = limits.max;
    input.step = limits.step;
    input.value = settings[key];
    valueLabel.textContent = settings[key] + suffix;

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      settings[key] = val;
      valueLabel.textContent = val + suffix;
      detector.updateSettings(settings);
      saveSettings(settings);
    });
  }

  sliderConfigs.forEach(bindSlider);

  resetButton.addEventListener('click', () => {
    Object.assign(settings, SETTINGS_DEFAULTS);
    saveSettings(settings);
    detector.updateSettings(settings);
    sliderConfigs.forEach(({ key, id, suffix }) => {
      const input = document.getElementById(id);
      const valueLabel = document.querySelector('label[for="' + id + '"] .value');
      input.value = settings[key];
      valueLabel.textContent = settings[key] + suffix;
    });
  });
})();
