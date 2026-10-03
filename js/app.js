'use strict';
/* =========================================================
   APP — routeur, délégation d'événements, démarrage
   ========================================================= */

let currentRoute = { name: 'home', param: null };

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, param] = h.split('/');
  return { name: Views[name] ? name : 'home', param: param ? decodeURIComponent(param) : null };
}

function go(name, param) {
  const h = '#/' + name + (param ? '/' + encodeURIComponent(param) : '');
  if (location.hash === h) render(); else location.hash = h;
}

function render(keepScroll) {
  const prevKey = currentRoute.name + '/' + currentRoute.param;
  currentRoute = parseHash();
  const v = Views[currentRoute.name];
  const out = v.render(currentRoute.param) || {};
  if (out.redirect) { go(out.redirect); return; }

  const tb = document.getElementById('topbar');
  tb.innerHTML = `
    ${out.back
      ? `<button class="icon-btn" data-action="go" data-to="${esc(out.back)}" aria-label="Retour">${icon('back')}</button>`
      : `<div class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 5h5l4 9 4-9h5l-7.5 15h-3z"/></svg></div>`}
    <div class="topbar-titles">
      <div class="topbar-title">${esc(out.title || '')}</div>
      ${out.subtitle ? `<div class="topbar-sub">${esc(out.subtitle)}</div>` : ''}
    </div>
    ${out.right || (out.noSettings ? '' : `<button class="icon-btn" data-action="go" data-to="settings" aria-label="Paramètres">${icon('gear')}</button>`)}`;

  const viewEl = document.getElementById('view');
  const y = window.scrollY;
  viewEl.innerHTML = out.html || '';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.to === v.tab));
  document.getElementById('tab-session-dot').classList.toggle('on', !!S.active);
  const same = prevKey === currentRoute.name + '/' + currentRoute.param;
  window.scrollTo(0, keepScroll && same ? y : 0);
  if (v.mount) v.mount(currentRoute.param);
}
function rerender() { render(true); }

/* ---------- Délégation d'événements ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = Actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && Changes[el.dataset.change]) Changes[el.dataset.change](el, e);
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (el && Inputs[el.dataset.input]) Inputs[el.dataset.input](el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && Sheet.isOpen()) Sheet.close();
});

Object.assign(Actions, {
  go(el) {
    const [n, p] = el.dataset.to.split('/');
    if (Sheet.isOpen()) Sheet.close();
    go(n, p);
  },
  'sheet-close'() { Sheet.close(); },
  'timer-pause'() { Timer.togglePause(); },
  'timer-add'(el) { Timer.add(+el.dataset.d); },
  'timer-skip'() { Timer.skip(); },
  'timer-min'() { Timer.minimized = true; Timer.render(); },
  'timer-max'() { Timer.minimized = false; Timer.render(); },
});

/* ---------- Écran toujours allumé pendant la séance ---------- */
let wakeLock = null;
async function requestWakeLock() {
  if (!S.active || !S.settings.keepAwake || !('wakeLock' in navigator) || document.visibilityState !== 'visible' || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) { wakeLock = null; }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

/* ---------- Horloge de séance ---------- */
function tickClock() {
  const el = document.getElementById('sess-elapsed');
  if (el && S.active) {
    const s = Math.floor((Date.now() - S.active.startedAt) / 1000);
    const h = Math.floor(s / 3600);
    el.textContent = (h ? h + ':' + pad2(Math.floor(s / 60) % 60) : Math.floor(s / 60)) + ':' + pad2(s % 60);
  }
}

function applyTheme() {
  const light = S.settings.theme === 'light';
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light ? '#f4f4f5' : '#0a0a0b');
}

function registerSW() {
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if ('serviceWorker' in navigator && secure) {
    // Nouvelle version installée → on recharge une fois (les données sont en localStorage, rien n'est perdu)
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').catch(() => { /* hors-ligne indisponible */ });
  }
}

function init() {
  loadState();
  applyTheme();
  window.addEventListener('hashchange', () => { if (Sheet.isOpen()) Sheet.close(); render(); });
  if (!location.hash) history.replaceState(null, '', '#/home');
  render();
  Timer.resume();
  setInterval(tickClock, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { Timer.resume(); requestWakeLock(); tickClock(); }
  });
  // Débloque l'audio iOS dès le premier toucher
  document.addEventListener('touchend', () => Timer.unlockAudio(), { once: true });
  document.addEventListener('click', () => Timer.unlockAudio(), { once: true });
  if (S.active) requestWakeLock();
  registerSW();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

document.addEventListener('DOMContentLoaded', init);
