(() => {
  'use strict';

  const STORAGE_KEY = 'multitv:v1';
  const LAYOUT_VERSION = 2;
  const MAX_TILES = 12;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const dom = {
    app: $('#app'),
    grid: $('#grid'),
    stage: $('#stage'),
    empty: $('#empty'),
    sidebar: $('#sidebar'),
    sidebarToggle: $('#sidebar-toggle'),
    channelList: $('#channel-list'),
    channelCount: $('#channel-count'),
    search: $('#search'),
    clock: $('#clock'),
    columns: $('#columns'),
    muteAll: $('#mute-all'),
    pauseAll: $('#pause-all'),
    addChannel: $('#add-channel'),
    importM3u: $('#import-m3u'),
    exitSolo: $('#exit-solo'),
    status: $('#status'),
    toast: $('#toast'),
    catalogError: $('#catalog-error'),
    catalogErrorDetail: $('#catalog-error-detail'),
    dialogChannel: $('#dialog-channel'),
    formChannel: $('#form-channel'),
    dialogImport: $('#dialog-import'),
    formImport: $('#form-import'),
    importFile: $('#m3u-file'),
    importHint: $('#import-hint'),
    installApp: $('#install-app'),
    dialogInstall: $('#dialog-install'),
    installSteps: $('#install-steps'),
    tileTemplate: $('#tile-template')
  };

  const saved = readSaved();

  const state = {
    catalog: { channels: [], groups: [], defaults: [] },
    channels: new Map(),
    groups: [],
    layout: [],
    activeId: null,
    solo: null,
    columns: saved.layoutVersion === LAYOUT_VERSION &&
      (saved.columns === 'auto' || [2, 3, 4].includes(saved.columns))
      ? saved.columns
      : 'auto',
    volume: Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.8,
    query: '',
    custom: [],
    players: new Map()
  };

  let toastTimer = null;
  let saveTimer = null;
  let layoutFrame = 0;
  let searchTimer = 0;

  function readSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          layout: state.layout,
          custom: state.custom,
          columns: state.columns,
          layoutVersion: LAYOUT_VERSION,
          volume: state.volume,
          sidebarCollapsed: dom.app.classList.contains('sidebar-collapsed')
        }));
      } catch {
        toast('No se pudo guardar la configuración en el navegador', 'error');
      }
    }, 200);
  }

  function toast(message, kind = 'info') {
    dom.toast.textContent = message;
    dom.toast.className = `toast is-visible${kind === 'error' ? ' is-error' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove('is-visible'), 3400);
  }

  let deferredInstallPrompt = null;

  function showInstallSteps({ isIos, isAndroid }) {
    const steps = isIos ? [
      'Abre esta página en Safari.',
      'Toca el botón Compartir (el cuadrado con la flecha).',
      'Elige «Añadir a pantalla de inicio».'
    ] : isAndroid ? [
      'Abre esta página en Chrome.',
      'Toca el menú ⋮ de la esquina superior derecha.',
      'Elige «Instalar aplicación» o «Añadir a pantalla de inicio».'
    ] : [
      'Abre esta página en Chrome o Edge.',
      'Pulsa el icono de instalar de la barra de direcciones.',
      'O usa el menú ⋮ → «Instalar MultiTV».'
    ];
    dom.installSteps.textContent = '';
    for (const step of steps) {
      const item = document.createElement('li');
      item.textContent = step;
      dom.installSteps.append(item);
    }
    dom.dialogInstall.showModal();
  }

  function setupPwa() {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
          .then((registration) => {
            registration.update()
              .then(() => {
                if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING');
              })
              .catch(() => { /* sin conexión */ });
            if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING');
            registration.addEventListener('updatefound', () => {
              const worker = registration.installing;
              worker?.addEventListener('statechange', () => {
                if (worker.state === 'installed') worker.postMessage('SKIP_WAITING');
              });
            });
          })
          .catch(() => { /* sin service worker */ });
      });
    }

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isIos) dom.installApp.hidden = false;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      dom.installApp.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      dom.installApp.hidden = true;
      toast('MultiTV instalada en tu dispositivo');
    });

    dom.installApp.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        const prompt = deferredInstallPrompt;
        deferredInstallPrompt = null;
        dom.installApp.hidden = true;
        prompt.prompt();
        try { await prompt.userChoice; } catch { /* ignore */ }
        return;
      }
      showInstallSteps({ isIos, isAndroid });
    });
  }

  function normalize(value) {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function initials(name) {
    const words = String(name).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return 'TV';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function hue(name) {
    let value = 0;
    for (const char of String(name)) value = (value * 31 + char.charCodeAt(0)) % 360;
    return value;
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function isOfficialExternalUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' &&
        (url.hostname === 'mediasetinfinity.es' || url.hostname.endsWith('.mediasetinfinity.es'));
    } catch {
      return false;
    }
  }

  function isPlayableChannel(channel) {
    return Boolean(channel) && !isOfficialExternalUrl(channel.externalUrl);
  }

  function updateChannelCount() {
    let external = 0;
    for (const channel of state.channels.values()) {
      if (isOfficialExternalUrl(channel.externalUrl)) external += 1;
    }
    const playable = state.channels.size - external;
    dom.channelCount.textContent = external ? `${playable}+${external}` : String(playable);
    dom.channelCount.title = external
      ? `${playable} canales en directo y ${external} accesos oficiales`
      : `${playable} canales`;
  }

  function openExternalChannel(channel) {
    const link = document.createElement('a');
    link.href = channel.externalUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
    toast(`${channel.name}: se abre en Mediaset Infinity. Usa Picture-in-Picture para mantenerlo visible.`);
  }

  function normalizeCustom(raw) {
    if (!raw || typeof raw.id !== 'string' || !raw.id.startsWith('custom:')) return null;
    const urls = Array.isArray(raw.urls) ? raw.urls.filter(isHttpUrl) : [];
    if (!urls.length || typeof raw.name !== 'string') return null;
    return {
      id: raw.id,
      name: raw.name.slice(0, 60),
      group: typeof raw.group === 'string' && raw.group.trim() ? raw.group.trim().slice(0, 40) : 'Mis canales',
      logo: typeof raw.logo === 'string' && isHttpUrl(raw.logo) ? raw.logo : '',
      urls,
      headers: raw.headers && typeof raw.headers === 'object' ? raw.headers : undefined,
      custom: true
    };
  }

  function base64url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function buildStreamUrl(channel, rawUrl) {
    let result = `/stream?u=${base64url(rawUrl)}&ch=${encodeURIComponent(channel.id)}`;
    const headers = channel.headers || {};
    const extra = {};
    if (typeof headers.referer === 'string' && headers.referer) extra.referer = headers.referer;
    if (typeof headers['user-agent'] === 'string' && headers['user-agent']) extra['user-agent'] = headers['user-agent'];
    if (typeof headers.origin === 'string' && headers.origin) extra.origin = headers.origin;
    if (Object.keys(extra).length) result += `&h=${base64url(JSON.stringify(extra))}`;
    return result;
  }

  function tileFor(id) {
    return [...dom.grid.children].find((element) => element.dataset.id === id) || null;
  }

  function playerFor(id) {
    return state.players.get(id) || null;
  }

  function collectGroups() {
    const groups = [...state.groups];
    for (const channel of state.channels.values()) {
      if (!groups.includes(channel.group)) groups.push(channel.group);
    }
    return groups;
  }

  /* ---------- playback ---------- */

  function createPlayer(channel, tile) {
    const video = $('video', tile);
    const player = {
      id: channel.id,
      channel,
      tile,
      video,
      hls: null,
      signalIndex: 0,
      attempts: 0,
      mediaRecoveries: 0,
      muted: true,
      destroyed: false,
      hasPlayed: false,
      pausedByUser: false,
      timer: null,
      startToken: 0,
      forceRefresh: false
    };

    video.muted = true;
    video.volume = state.volume;
    state.players.set(channel.id, player);

    const markReady = () => {
      player.attempts = 0;
      player.mediaRecoveries = 0;
      tile.classList.add('is-ready');
      tile.classList.remove('is-loading', 'has-error');
      $('.tile-error', tile).hidden = true;
      updateStatus();
    };

    const showError = (message) => {
      clearTimeout(player.timer);
      tile.classList.remove('is-ready', 'is-loading');
      tile.classList.add('has-error');
      const box = $('.tile-error', tile);
      box.hidden = false;
      $('.tile-error-detail', tile).textContent = message;
      updateStatus();
    };

    const schedule = (fn, delay) => {
      clearTimeout(player.timer);
      player.timer = setTimeout(fn, delay);
    };

    const handleFailure = (data = {}) => {
      if (player.destroyed) return;
      if (data.type === 'media' && player.mediaRecoveries < 2 && player.hls) {
        player.mediaRecoveries += 1;
        try { player.hls.recoverMediaError(); return; } catch { /* continue */ }
      }
      if (player.channel.resolver) {
        player.attempts += 1;
        if (player.attempts <= 4) {
          schedule(start, 1200 * player.attempts);
          return;
        }
        const status = data.response?.code ? `HTTP ${data.response.code}` : (data.details || 'error de red');
        showError(`No se puede reproducir ahora mismo (${status}).`);
        return;
      }
      if (player.signalIndex < player.channel.urls.length - 1) {
        player.signalIndex += 1;
        player.attempts = 0;
        schedule(start, 600);
        return;
      }
      player.attempts += 1;
      if (player.attempts <= 3) {
        schedule(start, 1200 * player.attempts);
        return;
      }
      const status = data.response?.code ? `HTTP ${data.response.code}` : (data.details || 'error de red');
      showError(`No se puede reproducir ahora mismo (${status}).`);
    };

    const start = async () => {
      if (player.destroyed) return;
      clearTimeout(player.timer);
      const token = ++player.startToken;
      tile.classList.remove('is-ready', 'has-error', 'is-paused');
      tile.classList.add('is-loading');
      $('.tile-error', tile).hidden = true;
      $('.tile-loading-text', tile).textContent = player.attempts > 0 ? 'Reconectando…' : 'Conectando…';

      let signal;
      if (player.channel.resolver) {
        try {
          const refresh = player.attempts > 0 || player.forceRefresh ? '&refresh=1' : '';
          player.forceRefresh = false;
          const response = await fetch(`/api/resolve?ch=${encodeURIComponent(player.channel.id)}${refresh}`, { cache: 'no-store' });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.url) throw new Error(data.error || `HTTP ${response.status}`);
          if (player.destroyed || token !== player.startToken) return;
          signal = data.url;
        } catch (error) {
          if (player.destroyed || token !== player.startToken) return;
          player.attempts += 1;
          if (player.attempts <= 4) {
            schedule(start, 1200 * player.attempts);
          } else {
            showError(`No se pudo obtener la señal (${error.message}).`);
          }
          return;
        }
      } else {
        signal = player.channel.urls[player.signalIndex];
        if (!signal) {
          showError('Este canal no tiene ninguna señal disponible.');
          return;
        }
      }

      if (player.destroyed || token !== player.startToken) return;

      if (player.hls) {
        try { player.hls.destroy(); } catch { /* ignore */ }
        player.hls = null;
      }

      const source = buildStreamUrl(player.channel, signal);

      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 12,
          maxMaxBufferLength: 24,
          capLevelToPlayerSize: true,
          manifestLoadingTimeOut: 15000,
          manifestLoadingMaxRetry: 2,
          manifestLoadingRetryDelay: 800,
          levelLoadingTimeOut: 15000,
          levelLoadingMaxRetry: 3,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 4,
          fragLoadingRetryDelay: 800
        });
        player.hls = hls;
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          if (player.pausedByUser) tile.classList.add('is-paused');
          else video.play().catch(() => { /* el navegador puede bloquear el autoplay */ });
        });
        hls.on(window.Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) handleFailure(data);
        });
        hls.loadSource(source);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source;
        const onMetadata = () => {
          video.removeEventListener('loadedmetadata', onMetadata);
          if (player.pausedByUser) tile.classList.add('is-paused');
          else video.play().catch(() => { /* ignore */ });
        };
        video.addEventListener('loadedmetadata', onMetadata);
        video.addEventListener('error', () => handleFailure({ type: 'network', details: 'nativeError' }), { once: true });
      } else {
        showError('Este navegador no puede reproducir HLS.');
      }
    };

    video.addEventListener('playing', () => {
      player.hasPlayed = true;
      markReady();
      updatePlayButton(player);
      updateStatus();
    });

    video.addEventListener('pause', () => {
      if (player.hasPlayed) tile.classList.add('is-paused');
      updatePlayButton(player);
      updateStatus();
    });

    video.addEventListener('play', () => {
      player.hasPlayed = true;
      tile.classList.remove('is-paused');
      updatePlayButton(player);
      if (player.hls && Number.isFinite(player.hls.liveSyncPosition) &&
          player.hls.liveSyncPosition - video.currentTime > 8) {
        try { video.currentTime = player.hls.liveSyncPosition; } catch { /* ignore */ }
      }
      updateStatus();
    });

    video.addEventListener('waiting', () => {
      if (!player.destroyed && player.hasPlayed && video.readyState < 3) {
        tile.classList.add('is-loading');
      }
    });

    video.addEventListener('canplay', () => {
      if (player.destroyed) return;
      tile.classList.remove('is-loading');
      if (!tile.classList.contains('has-error')) markReady();
    });

    video.addEventListener('volumechange', () => {
      const slider = $('.tile-volume', tile);
      if (slider && Math.abs(Number(slider.value) - video.volume) > 0.01) slider.value = String(video.volume);
    });

    player.start = start;
    player.retry = () => {
      player.signalIndex = 0;
      player.attempts = 0;
      player.mediaRecoveries = 0;
      player.forceRefresh = Boolean(player.channel.resolver);
      start();
    };
    player.destroy = () => {
      player.destroyed = true;
      clearTimeout(player.timer);
      if (player.hls) {
        try { player.hls.destroy(); } catch { /* ignore */ }
        player.hls = null;
      }
      try { video.pause(); } catch { /* ignore */ }
      video.removeAttribute('src');
      try { video.load(); } catch { /* ignore */ }
      state.players.delete(channel.id);
    };

    updatePlayButton(player);
    updateAudioVisuals(player);
    start();
    return player;
  }

  function updatePlayButton(player) {
    const button = $(`[data-action="play"] use`, player.tile);
    if (button) button.setAttribute('href', player.video.paused ? '#i-play' : '#i-pause');
  }

  function updateAudioVisuals(player) {
    const muteUse = $('[data-action="mute"] use', player.tile);
    const muteButton = $('[data-action="mute"]', player.tile);
    if (muteUse) muteUse.setAttribute('href', player.muted ? '#i-muted' : '#i-volume');
    if (muteButton) muteButton.classList.toggle('is-on', !player.muted);
    const badge = $('.tile-audio', player.tile);
    if (badge) badge.hidden = player.muted;
    player.tile.classList.toggle('is-listening', !player.muted);
  }

  function setMuted(player, muted) {
    player.muted = Boolean(muted);
    player.video.muted = player.muted;
    updateAudioVisuals(player);
  }

  function listenTo(id, { toggle = true } = {}) {
    const player = playerFor(id);
    if (!player) return;
    if (toggle && state.activeId === id && !player.muted) {
      setMuted(player, true);
      state.activeId = null;
    } else {
      for (const [otherId, other] of state.players) {
        if (otherId !== id && !other.muted) setMuted(other, true);
      }
      setMuted(player, false);
      state.activeId = id;
      player.pausedByUser = false;
      player.tile.classList.remove('is-paused');
      if (player.video.paused) player.video.play().catch(() => { /* ignore */ });
    }
    updateActiveTiles();
    updateStatus();
    save();
  }

  function updateActiveTiles() {
    for (const [id, player] of state.players) {
      player.tile.classList.toggle('is-active', id === state.activeId);
      updateAudioVisuals(player);
    }
    for (const item of dom.channelList.querySelectorAll('.channel-item')) {
      item.classList.toggle('is-audible', item.dataset.id === state.activeId);
    }
    const active = state.activeId ? state.channels.get(state.activeId) : null;
    document.title = active ? `${active.name} · MultiTV` : 'MultiTV — Todas las teles en directo';
    updateStatus();
  }

  function togglePlayback(id) {
    const player = playerFor(id);
    if (!player) return;
    if (player.video.paused) {
      player.pausedByUser = false;
      player.video.play().catch(() => { /* ignore */ });
    } else {
      player.pausedByUser = true;
      player.video.pause();
      player.tile.classList.add('is-paused');
    }
    updateStatus();
  }

  function toggleSolo(id) {
    state.solo = state.solo === id ? null : id;
    applySolo();
    if (state.solo) {
      const player = playerFor(id);
      if (player) {
        updateActiveTiles();
      }
    }
  }

  function applySolo() {
    dom.grid.classList.toggle('is-solo', Boolean(state.solo));
    for (const [id, player] of state.players) {
      player.tile.classList.toggle('is-solo', state.solo === id);
    }
    dom.exitSolo.hidden = !state.solo;
    if (state.solo) {
      const tile = tileFor(state.solo);
      tile?.focus({ preventScroll: true });
    }
    scheduleGridLayout();
  }

  async function toggleFullscreen(id) {
    const tile = tileFor(id);
    if (!tile) return;
    const player = playerFor(id);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (tile.requestFullscreen) {
        await tile.requestFullscreen();
      } else if (player?.video.webkitEnterFullscreen) {
        player.video.webkitEnterFullscreen();
      } else {
        throw new Error('sin soporte');
      }
    } catch {
      toast('El navegador no permite pantalla completa aquí', 'error');
    }
  }

  function updatePauseAllButton() {
    const players = [...state.players.values()];
    const anyPlaying = players.some((player) => !player.video.paused);
    const span = $('span', dom.pauseAll);
    const use = $('use', dom.pauseAll);
    if (span) span.textContent = anyPlaying ? 'Pausar' : 'Reanudar';
    if (use) use.setAttribute('href', anyPlaying ? '#i-pause' : '#i-play');
  }

  function updateStatus() {
    const tiles = state.layout.length;
    const players = [...state.players.values()];
    const playing = players.filter((player) => !player.video.paused && player.video.readyState >= 2).length;
    const active = state.activeId ? state.channels.get(state.activeId) : null;
    const activePlayer = state.activeId ? state.players.get(state.activeId) : null;
    const noSignal = activePlayer?.tile.classList.contains('has-error') ? ' (sin señal)' : '';
    dom.status.textContent = `${tiles} ${tiles === 1 ? 'TV' : 'TVs'} en parrilla · ${playing} en directo · ${active ? `Audio: ${active.name}${noSignal}` : 'Todo silenciado'}`;
    updateChannelCount();
    updatePauseAllButton();
  }

  /* ---------- grid ---------- */

  function createTile(channel) {
    const fragment = dom.tileTemplate.content.cloneNode(true);
    const tile = fragment.firstElementChild;
    tile.dataset.id = channel.id;
    tile.setAttribute('aria-label', channel.name);
    tile.draggable = true;

    const logoWrap = $('.tile-logo-wrap', tile);
    const logo = $('.tile-logo', tile);
    const initialsEl = $('.tile-initials', tile);
    const showInitials = () => {
      logoWrap.classList.add('is-missing');
      initialsEl.textContent = initials(channel.name);
      logoWrap.style.setProperty('--hue', hue(channel.name));
    };
    if (channel.logo) {
      logo.alt = channel.name;
      logo.addEventListener('error', showInitials, { once: true });
      logo.src = channel.logo;
    } else {
      showInitials();
    }
    $('.tile-name', tile).textContent = channel.name;
    $('.tile-close', tile).setAttribute('aria-label', `Quitar ${channel.name} de la parrilla`);

    const player = createPlayer(channel, tile);

    let clickTimer = null;
    tile.addEventListener('click', (event) => {
      if (event.target.closest('[data-action]') || event.target.closest('input')) return;
      if (event.detail > 1) {
        clearTimeout(clickTimer);
        return;
      }
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => listenTo(channel.id), 180);
    });

    tile.addEventListener('dblclick', (event) => {
      if (event.target.closest('[data-action]') || event.target.closest('input')) return;
      clearTimeout(clickTimer);
      toggleFullscreen(channel.id);
    });

    tile.addEventListener('keydown', (event) => {
      if (event.target !== tile) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        listenTo(channel.id);
      }
    });

    tile.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', channel.id);
      tile.classList.add('dragging');
    });
    tile.addEventListener('dragend', () => tile.classList.remove('dragging'));
    tile.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      tile.classList.add('drag-over');
    });
    tile.addEventListener('dragleave', () => tile.classList.remove('drag-over'));
    tile.addEventListener('drop', (event) => {
      event.preventDefault();
      tile.classList.remove('drag-over');
      const from = event.dataTransfer.getData('text/plain');
      reorderTiles(from, channel.id);
    });

    $$('[data-action]', tile).forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const action = button.dataset.action;
        if (action === 'mute') {
          const muted = !player.muted;
          if (!muted) {
            for (const [otherId, other] of state.players) {
              if (otherId !== channel.id) setMuted(other, true);
            }
            setMuted(player, false);
            state.activeId = channel.id;
            if (player.video.paused) player.video.play().catch(() => { /* ignore */ });
          } else {
            setMuted(player, true);
            if (state.activeId === channel.id) state.activeId = null;
          }
          updateActiveTiles();
          save();
        } else if (action === 'play') {
          togglePlayback(channel.id);
        } else if (action === 'solo') {
          toggleSolo(channel.id);
        } else if (action === 'fullscreen') {
          toggleFullscreen(channel.id);
        } else if (action === 'remove') {
          removeChannel(channel.id);
        } else if (action === 'retry') {
          player.retry();
        }
      });
    });

    const volume = $('.tile-volume', tile);
    volume.value = String(state.volume);
    volume.addEventListener('input', () => {
      state.volume = Number(volume.value);
      for (const other of state.players.values()) other.video.volume = state.volume;
      save();
    });
    volume.addEventListener('click', (event) => event.stopPropagation());
    volume.addEventListener('pointerdown', (event) => event.stopPropagation());

    return tile;
  }

  function reorderTiles(fromId, toId) {
    if (!fromId || fromId === toId) return;
    if (!state.layout.includes(fromId) || !state.layout.includes(toId)) return;
    const next = state.layout.filter((id) => id !== fromId);
    const index = next.indexOf(toId);
    next.splice(index, 0, fromId);
    state.layout = next;
    applyGridOrder();
    save();
  }

  function applyGridOrder() {
    for (const id of state.layout) {
      const tile = tileFor(id);
      if (tile) dom.grid.appendChild(tile);
    }
  }

  function renderGrid() {
    const ids = new Set(state.layout);
    for (const [id, player] of [...state.players]) {
      if (!ids.has(id)) {
        player.destroy();
        player.tile.remove();
      }
    }
    for (const id of state.layout) {
      if (tileFor(id)) continue;
      const channel = state.channels.get(id);
      if (channel) dom.grid.appendChild(createTile(channel));
    }
    applyGridOrder();
    const hasTiles = state.layout.length > 0;
    dom.empty.hidden = hasTiles;
    dom.grid.hidden = !hasTiles;
    applyColumns();
    applySolo();
    scheduleGridLayout();
    updateStatus();
  }

  function addChannel(id) {
    const channel = state.channels.get(id);
    if (!channel) return;
    if (isOfficialExternalUrl(channel.externalUrl)) {
      openExternalChannel(channel);
      return;
    }
    if (state.layout.includes(id)) {
      focusChannel(id);
      return;
    }
    if (state.layout.length >= MAX_TILES) {
      toast(`Máximo ${MAX_TILES} canales a la vez. Quita alguno para añadir otro.`, 'error');
      return;
    }
    state.layout.push(id);
    renderGrid();
    renderSidebar();
    save();
    const tile = tileFor(id);
    tile?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    listenTo(id);
  }

  function removeChannel(id, { silent = false } = {}) {
    const index = state.layout.indexOf(id);
    if (index === -1) return;
    state.layout.splice(index, 1);
    const player = state.players.get(id);
    if (player) {
      player.destroy();
      player.tile.remove();
    }
    if (state.activeId === id) state.activeId = null;
    if (state.solo === id) state.solo = null;
    renderGrid();
    if (!silent) {
      renderSidebar();
      save();
    }
    updateStatus();
  }

  function focusChannel(id) {
    const tile = tileFor(id);
    if (!tile) {
      addChannel(id);
      return;
    }
    tile.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    tile.focus({ preventScroll: true });
    listenTo(id, { toggle: false });
    if (window.matchMedia('(max-width: 860px)').matches) closeSidebar();
  }

  function applyColumns() {
    const maxCols = effectiveMaxColumns();
    const cols = state.columns === 'auto' ? 3 : Math.min(Number(state.columns), maxCols);
    dom.grid.style.setProperty('--cols', String(cols));
    $$('#columns button').forEach((button) => {
      const value = button.dataset.cols;
      button.classList.toggle(
        'is-active',
        state.columns === 'auto' ? value === 'auto' : Number(value) === state.columns
      );
    });
    scheduleGridLayout();
  }

  function effectiveMaxColumns() {
    if (window.innerWidth <= 620) return 1;
    if (window.innerWidth <= 900) return 2;
    return 4;
  }

  function chooseFitLayout(count, maxCols) {
    if (!count || state.columns !== 'auto') return null;
    const style = getComputedStyle(dom.grid);
    const gap = Number.parseFloat(style.columnGap) || 10;
    const padX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const padY = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    const availableW = dom.grid.clientWidth - padX - 2;
    const availableH = dom.grid.clientHeight - padY - 2;
    if (availableW < 160 || availableH < 120) return null;

    const minHeight = maxCols === 1 ? 140 : 105;
    let best = null;

    for (let cols = 1; cols <= Math.min(maxCols, count); cols += 1) {
      const rows = Math.ceil(count / cols);
      const cellW = (availableW - gap * (cols - 1)) / cols;
      const cellH = (availableH - gap * (rows - 1)) / rows;
      if (cellW <= 0 || cellH <= 0) continue;
      const width = Math.min(cellW, (cellH * 16) / 9);
      const height = (width * 9) / 16;
      if (width < 150 || height < minHeight) continue;
      const score = width * height;
      if (!best || score > best.score) best = { cols, rows, width, height, score };
    }

    return best;
  }

  function applyGridLayout() {
    if (!state.layout.length) {
      dom.grid.classList.remove('is-fit', 'is-scroll');
      return;
    }
    if (state.solo) return;

    const maxCols = effectiveMaxColumns();
    const fit = chooseFitLayout(state.layout.length, maxCols);
    dom.grid.classList.toggle('is-fit', Boolean(fit));
    dom.grid.classList.toggle('is-scroll', !fit);

    if (fit) {
      dom.grid.style.setProperty('--cols', String(fit.cols));
      dom.grid.style.setProperty('--fit-w', `${Math.floor(fit.width)}px`);
      dom.grid.style.setProperty('--fit-h', `${Math.floor(fit.height)}px`);
      return;
    }

    const fallbackCols = state.columns === 'auto'
      ? Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(state.layout.length))))
      : Math.min(Number(state.columns), maxCols);
    dom.grid.style.setProperty('--cols', String(fallbackCols));
    dom.grid.style.removeProperty('--fit-w');
    dom.grid.style.removeProperty('--fit-h');
  }

  function scheduleGridLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      applyGridLayout();
    });
  }

  /* ---------- sidebar ---------- */

  function channelButton(channel) {
    const external = isOfficialExternalUrl(channel.externalUrl);
    const item = document.createElement('div');
    item.className = 'channel-item';
    item.dataset.id = channel.id;
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    if (external) item.classList.add('is-external');
    if (state.layout.includes(channel.id)) item.classList.add('is-live');
    if (state.activeId === channel.id) item.classList.add('is-audible');

    const logoWrap = document.createElement('span');
    logoWrap.className = 'channel-logo';
    const initialsEl = document.createElement('span');
    initialsEl.className = 'initials';
    initialsEl.textContent = initials(channel.name);
    if (channel.logo) {
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => logoWrap.classList.add('is-missing'), { once: true });
      img.src = channel.logo;
      logoWrap.append(img);
      logoWrap.style.setProperty('--hue', hue(channel.name));
    } else {
      logoWrap.classList.add('is-missing');
      logoWrap.style.setProperty('--hue', hue(channel.name));
    }
    logoWrap.append(initialsEl);

    const copy = document.createElement('span');
    copy.className = 'channel-copy';
    const name = document.createElement('span');
    name.className = 'channel-name';
    name.textContent = channel.name;
    copy.append(name);
    if (channel.custom) {
      const meta = document.createElement('span');
      meta.className = 'channel-meta';
      meta.textContent = 'Canal propio';
      copy.append(meta);
    } else if (external) {
      const meta = document.createElement('span');
      meta.className = 'channel-meta';
      meta.textContent = 'Oficial · se abre en otra pestaña';
      copy.append(meta);
    }

    const status = document.createElement('span');
    status.className = 'channel-state';
    status.innerHTML = external ? '<svg><use href="#i-external"></use></svg>' : '<span>+</span>';
    if (external) status.setAttribute('aria-label', 'Abrir en Mediaset Infinity');

    item.append(logoWrap, copy, status);
    if (external) item.title = 'Abrir en Mediaset Infinity';

    if (channel.custom) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-custom';
      remove.title = 'Eliminar canal';
      remove.setAttribute('aria-label', `Eliminar ${channel.name}`);
      remove.innerHTML = '<svg><use href="#i-trash"></use></svg>';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteCustomChannel(channel.id);
      });
      item.append(remove);
    }

    const activate = () => {
      if (external) {
        openExternalChannel(channel);
        return;
      }
      if (state.layout.includes(channel.id)) focusChannel(channel.id);
      else addChannel(channel.id);
    };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });

    return item;
  }

  function renderSidebar() {
    dom.channelList.textContent = '';
    const query = normalize(state.query.trim());
    const grouped = new Map();
    for (const channel of state.channels.values()) {
      if (query && !normalize(channel.name).includes(query) && !normalize(channel.group || '').includes(query)) continue;
      const group = channel.group || 'Otros';
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(channel);
    }

    let shown = 0;
    const fragment = document.createDocumentFragment();
    for (const group of collectGroups()) {
      const channels = grouped.get(group);
      if (!channels || !channels.length) continue;
      const section = document.createElement('section');
      section.className = 'channel-group';
      const title = document.createElement('h3');
      title.textContent = group;
      section.append(title);
      for (const channel of channels) section.append(channelButton(channel));
      fragment.append(section);
      shown += channels.length;
    }

    if (!shown) {
      const empty = document.createElement('p');
      empty.className = 'channel-empty';
      empty.textContent = query ? 'No hay canales que coincidan con la búsqueda.' : 'No hay canales disponibles.';
      fragment.append(empty);
    }

    dom.channelList.append(fragment);

    updateChannelCount();
    for (const item of dom.channelList.querySelectorAll('.channel-item')) {
      item.classList.toggle('is-audible', item.dataset.id === state.activeId);
    }
  }

  function deleteCustomChannel(id) {
    const channel = state.channels.get(id);
    if (!channel?.custom) return;
    if (!window.confirm(`¿Eliminar "${channel.name}" de tus canales?`)) return;
    state.custom = state.custom.filter((item) => item.id !== id);
    state.channels.delete(id);
    removeChannel(id, { silent: true });
    renderSidebar();
    save();
    toast(`${channel.name} eliminado`);
  }

  /* ---------- dialogs ---------- */

  function openChannelDialog() {
    dom.formChannel.reset();
    dom.dialogChannel.showModal();
    setTimeout(() => dom.formChannel.elements.name?.focus(), 60);
  }

  function openImportDialog() {
    dom.formImport.reset();
    dom.importHint.textContent = '';
    dom.dialogImport.showModal();
  }

  function addCustomChannel({ name, url, logo, referer, group = 'Mis canales' }) {
    const id = `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const channel = {
      id,
      name: name.trim().slice(0, 60) || 'Canal',
      group: group.trim().slice(0, 40) || 'Mis canales',
      logo: logo && isHttpUrl(logo) ? logo : '',
      urls: [url],
      headers: referer ? { referer } : undefined,
      custom: true
    };
    state.custom.push(channel);
    state.channels.set(id, channel);
    return channel;
  }

  function parseM3u(text) {
    const lines = text.split(/\r?\n/);
    const entries = [];
    let current = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('#EXTINF')) {
        const logo = (line.match(/tvg-logo="([^"]*)"/i) || [null, ''])[1];
        const group = (line.match(/group-title="([^"]*)"/i) || [null, ''])[1];
        const name = line.split(',').slice(1).join(',').trim() || 'Canal';
        current = { name, logo, group };
      } else if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
        if (current) current.referer = line.split('=').slice(1).join('=');
      } else if (!line.startsWith('#')) {
        if (current && isHttpUrl(line)) {
          entries.push({ ...current, url: line });
        }
        current = null;
      }
    }
    return entries;
  }

  /* ---------- keyboard & UI ---------- */

  function keyboardTargetId(event) {
    const tile = event.target.closest?.('.tile');
    if (tile?.dataset.id) return tile.dataset.id;
    return state.activeId || state.layout[0] || null;
  }

  function bindEvents() {
    dom.sidebarToggle.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 860px)').matches) {
        dom.app.classList.toggle('sidebar-open');
        dom.app.classList.remove('sidebar-collapsed');
      } else {
        dom.app.classList.toggle('sidebar-collapsed');
        save();
      }
      setTimeout(scheduleGridLayout, 200);
    });

    document.addEventListener('click', (event) => {
      if (window.innerWidth > 860) return;
      if (!dom.app.classList.contains('sidebar-open')) return;
      if (event.target.closest('.sidebar') || event.target.closest('#sidebar-toggle')) return;
      closeSidebar();
    });

    dom.search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = dom.search.value;
        renderSidebar();
      }, 70);
    });

    dom.columns.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-cols]');
      if (!button) return;
      state.columns = button.dataset.cols === 'auto' ? 'auto' : Number(button.dataset.cols);
      applyColumns();
      save();
    });

    dom.muteAll.addEventListener('click', () => {
      for (const player of state.players.values()) setMuted(player, true);
      state.activeId = null;
      updateActiveTiles();
      save();
    });

    dom.pauseAll.addEventListener('click', () => {
      const players = [...state.players.values()];
      const anyPlaying = players.some((player) => !player.video.paused);
      for (const player of players) {
        player.pausedByUser = anyPlaying;
        if (anyPlaying) {
          player.video.pause();
          player.tile.classList.add('is-paused');
        } else {
          player.tile.classList.remove('is-paused');
          player.video.play().catch(() => { /* ignore */ });
        }
      }
      updatePauseAllButton();
      updateStatus();
    });

    dom.addChannel.addEventListener('click', openChannelDialog);
    dom.importM3u.addEventListener('click', openImportDialog);
    dom.exitSolo.addEventListener('click', () => {
      state.solo = null;
      applySolo();
    });

    $$('[data-close]', dom.dialogChannel).forEach((button) => {
      button.addEventListener('click', () => dom.dialogChannel.close());
    });
    $$('[data-close]', dom.dialogImport).forEach((button) => {
      button.addEventListener('click', () => dom.dialogImport.close());
    });

    dom.formChannel.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = dom.formChannel.elements;
      const name = form.name.value.trim();
      const url = form.url.value.trim();
      const logo = form.logo.value.trim();
      const referer = form.referer.value.trim();
      if (!name) {
        toast('Ponle un nombre al canal', 'error');
        form.name.focus();
        return;
      }
      if (!isHttpUrl(url)) {
        toast('La URL del stream no es válida', 'error');
        form.url.focus();
        return;
      }
      if (logo && !isHttpUrl(logo)) {
        toast('La URL del logo no es válida', 'error');
        form.logo.focus();
        return;
      }
      const channel = addCustomChannel({ name, url, logo, referer });
      dom.dialogChannel.close();
      renderSidebar();
      addChannel(channel.id);
      save();
      toast(`${channel.name} añadido`);
    });

    dom.importFile.addEventListener('change', async () => {
      const file = dom.importFile.files?.[0];
      if (!file) return;
      try {
        dom.formImport.elements.playlist.value = await file.text();
        dom.importHint.textContent = `${file.name} cargado. Pulsa Importar.`;
      } catch {
        toast('No se pudo leer el archivo', 'error');
      }
    });

    dom.formImport.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = dom.formImport.elements.playlist.value;
      const entries = parseM3u(text);
      if (!entries.length) {
        toast('No se encontraron canales en la lista', 'error');
        return;
      }
      const existing = new Set(state.custom.map((channel) => channel.urls[0]));
      let added = 0;
      for (const entry of entries.slice(0, 300)) {
        if (existing.has(entry.url)) continue;
        addCustomChannel({
          name: entry.name,
          url: entry.url,
          logo: entry.logo,
          referer: entry.referer,
          group: entry.group || 'Mis canales'
        });
        existing.add(entry.url);
        added += 1;
      }
      dom.dialogImport.close();
      renderSidebar();
      if (!state.layout.length) {
        for (const channel of state.custom.slice(0, 6)) addChannel(channel.id);
      } else {
        renderGrid();
      }
      save();
      toast(added ? `${added} ${added === 1 ? 'canal importado' : 'canales importados'}` : 'Esos canales ya estaban en la lista');
    });

    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented) return;
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
      if (document.querySelector('dialog[open]')) return;
      const key = event.key.toLowerCase();
      const targetId = keyboardTargetId(event);
      if (!targetId) return;

      if (key >= '1' && key <= '9') {
        const id = state.layout[Number(key) - 1];
        if (id) {
          event.preventDefault();
          focusChannel(id);
        }
        return;
      }
      if (key === 'm') {
        event.preventDefault();
        listenTo(targetId);
        return;
      }
      if (key === ' ' || key === 'k') {
        event.preventDefault();
        togglePlayback(targetId);
        return;
      }
      if (key === 's') {
        event.preventDefault();
        toggleSolo(targetId);
        return;
      }
      if (key === 'f') {
        event.preventDefault();
        toggleFullscreen(targetId);
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        removeChannel(targetId);
        return;
      }
      if (key === 'escape' && state.solo) {
        state.solo = null;
        applySolo();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) dom.app.classList.remove('sidebar-open');
      syncSearchPlaceholder();
      scheduleGridLayout();
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(scheduleGridLayout).observe(dom.stage);
    }
  }

  function closeSidebar() {
    dom.app.classList.remove('sidebar-open');
  }

  function tickClock() {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    dom.clock.textContent = formatter.format(new Date());
  }

  function syncSearchPlaceholder() {
    dom.search.placeholder = window.innerWidth <= 420 ? 'Buscar…' : 'Buscar canal…';
  }

  /* ---------- boot ---------- */

  async function boot() {
    setupPwa();
    state.custom = (saved.custom || []).map(normalizeCustom).filter(Boolean);
    if (saved.sidebarCollapsed) dom.app.classList.add('sidebar-collapsed');
    applyColumns();
    bindEvents();
    tickClock();
    syncSearchPlaceholder();
    setInterval(tickClock, 1000);

    let catalog;
    try {
      const response = await fetch('/api/channels', { cache: 'no-store' });
      if (!response.ok) throw new Error(`El servidor respondió ${response.status}`);
      catalog = await response.json();
      if (!Array.isArray(catalog.channels)) throw new Error('El catálogo no tiene canales');
    } catch (error) {
      dom.catalogError.hidden = false;
      dom.catalogErrorDetail.textContent = error.message;
      dom.status.textContent = 'Catálogo no disponible';
      return;
    }

    state.catalog = catalog;
    state.groups = Array.isArray(catalog.groups) ? catalog.groups : [];
    for (const channel of catalog.channels) {
      state.channels.set(channel.id, { ...channel, custom: false });
    }
    for (const channel of state.custom) state.channels.set(channel.id, channel);

    const hasSavedLayout = Array.isArray(saved.layout);
    const candidate = hasSavedLayout ? [...new Set(saved.layout)] : [];
    const defaults = Array.isArray(catalog.defaults) ? catalog.defaults : [];
    const valid = candidate.filter((id) => isPlayableChannel(state.channels.get(id)));
    const fallback = defaults.filter((id) => isPlayableChannel(state.channels.get(id)));
    if (hasSavedLayout) {
      state.layout = candidate.length ? (valid.length ? valid : fallback) : [];
    } else {
      state.layout = fallback.length
        ? fallback
        : [...state.channels.values()].filter(isPlayableChannel).slice(0, 6).map((channel) => channel.id);
    }
    state.layout = state.layout.slice(0, MAX_TILES);

    renderSidebar();
    renderGrid();
    updateStatus();

    if (state.layout.length) {
      toast('Pulsa una TV para escuchar su audio');
    }
  }

  boot();
})();
