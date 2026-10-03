'use strict';
/* =========================================================
   TIMER — repos entre les séries
   L'heure de fin est sauvegardée : le timer reste juste
   même si l'écran se verrouille ou si l'app est rechargée.
   ========================================================= */

const Timer = {
  loop: null,
  audioCtx: null,
  minimized: false,
  autoHide: null,

  /** À appeler pendant un geste utilisateur (iOS exige une interaction pour l'audio). */
  unlockAudio() {
    try {
      if (!this.audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.audioCtx = new AC();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
    } catch (e) { /* audio indisponible */ }
  },

  get t() { return S.active ? S.active.timer : null; },

  start(sec, label, next) {
    if (!S.active) return;
    S.active.timer = { endAt: Date.now() + sec * 1000, duration: sec, paused: false, remaining: sec, label, next, finished: false };
    saveState();
    this.minimized = false;
    clearTimeout(this.autoHide);
    this.render();
    this.run();
  },

  remaining() {
    const t = this.t;
    if (!t) return 0;
    return t.paused ? t.remaining : Math.max(0, (t.endAt - Date.now()) / 1000);
  },

  togglePause() {
    const t = this.t;
    if (!t || t.finished) return;
    if (t.paused) { t.endAt = Date.now() + t.remaining * 1000; t.paused = false; }
    else { t.remaining = this.remaining(); t.paused = true; }
    saveState();
    this.render();
  },

  add(delta) {
    const t = this.t;
    if (!t) return;
    if (t.finished) {
      if (delta <= 0) return;
      t.finished = false; t.paused = false; t.endAt = Date.now() + delta * 1000; t.duration = delta;
      clearTimeout(this.autoHide);
    } else if (t.paused) {
      t.remaining = Math.max(0, t.remaining + delta);
    } else {
      t.endAt = Math.max(Date.now(), t.endAt + delta * 1000);
    }
    t.duration = Math.max(t.duration, this.remaining());
    saveState();
    this.render();
    this.run();
  },

  skip() {
    if (S.active) { S.active.timer = null; saveState(); }
    clearTimeout(this.autoHide);
    this.render();
  },

  run() {
    if (this.loop) return;
    this.loop = setInterval(() => this.tick(), 250);
  },

  tick() {
    const t = this.t;
    if (!t) { clearInterval(this.loop); this.loop = null; this.render(); return; }
    if (t.finished || t.paused) return;
    if (this.remaining() <= 0) {
      t.finished = true;
      saveState();
      this.alert();
      this.minimized = false;
      this.render();
      clearTimeout(this.autoHide);
      this.autoHide = setTimeout(() => { if (this.t && this.t.finished) this.skip(); }, 8000);
      return;
    }
    this.update();
  },

  alert() {
    if (S.settings.vibration && navigator.vibrate) { try { navigator.vibrate([250, 120, 250, 120, 400]); } catch (e) { /* ignore */ } }
    if (S.settings.sound) this.beep();
  },

  beep() {
    this.unlockAudio();
    const ctx = this.audioCtx;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.28, 0.56].forEach((d, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 2 ? 1175 : 880;
        gain.gain.setValueAtTime(0.0001, now + d);
        gain.gain.exponentialRampToValueAtTime(0.5, now + d + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + d + (i === 2 ? 0.45 : 0.2));
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + d);
        osc.stop(now + d + 0.5);
      });
    } catch (e) { /* ignore */ }
  },

  update() {
    const t = this.t;
    if (!t) return;
    const r = this.remaining();
    const d = document.getElementById('timer-digits');
    const bar = document.getElementById('timer-bar');
    const pill = document.getElementById('timer-pill-time');
    if (d) d.textContent = fmtClock(Math.ceil(r));
    if (pill) pill.textContent = fmtClock(Math.ceil(r));
    if (bar) bar.style.width = (t.duration ? (r / t.duration) * 100 : 0).toFixed(2) + '%';
  },

  render() {
    const el = document.getElementById('timer');
    const t = this.t;
    if (!t) {
      el.className = 'timer hidden';
      el.innerHTML = '';
      document.body.classList.remove('timer-open');
      return;
    }
    const r = Math.ceil(this.remaining());
    if (this.minimized && !t.finished) {
      el.className = 'timer timer-mini';
      el.innerHTML = `<button class="timer-pill" data-action="timer-max">${icon('clock')}<span id="timer-pill-time">${fmtClock(r)}</span>${t.paused ? '<small>pause</small>' : ''}</button>`;
      document.body.classList.remove('timer-open');
      return;
    }
    el.className = 'timer' + (t.finished ? ' timer-done' : '') + (t.paused ? ' timer-paused' : '');
    document.body.classList.add('timer-open');
    el.innerHTML = `
      <div class="timer-card">
        <div class="timer-top">
          <span class="timer-label">${t.finished ? 'REPOS TERMINÉ' : 'REPOS'} · ${esc(t.label || '')}</span>
          ${t.finished ? '' : `<button class="icon-btn" data-action="timer-min" aria-label="Réduire">${icon('down')}</button>`}
        </div>
        <div class="timer-digits" id="timer-digits">${t.finished ? 'GO !' : fmtClock(r)}</div>
        <div class="timer-bar"><i id="timer-bar" style="width:${t.finished ? 0 : (t.duration ? (this.remaining() / t.duration) * 100 : 0).toFixed(2)}%"></i></div>
        ${t.next ? `<div class="timer-next">Ensuite : <b>${esc(t.next)}</b></div>` : ''}
        ${t.finished ? `
          <button class="btn btn-primary btn-xl btn-block" data-action="timer-skip">C'EST PARTI</button>` : `
          <div class="timer-controls">
            <button class="btn btn-secondary" data-action="timer-add" data-d="-30">−30 s</button>
            <button class="btn btn-secondary" data-action="timer-pause">${t.paused ? icon('play') + ' Reprendre' : icon('pause') + ' Pause'}</button>
            <button class="btn btn-secondary" data-action="timer-add" data-d="30">+30 s</button>
          </div>
          <button class="btn btn-primary btn-xl btn-block" data-action="timer-skip">PASSER</button>`}
      </div>`;
  },

  /** Reprise après rechargement / retour au premier plan. */
  resume() {
    const t = this.t;
    if (!t) { this.render(); return; }
    if (!t.paused && !t.finished && this.remaining() <= 0) {
      // Le repos s'est terminé pendant que l'app était en arrière-plan
      t.finished = true;
      saveState();
      clearTimeout(this.autoHide);
      this.autoHide = setTimeout(() => { if (this.t && this.t.finished) this.skip(); }, 8000);
    }
    this.render();
    this.run();
  },
};
