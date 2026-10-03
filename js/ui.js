'use strict';
/* =========================================================
   UI — icônes, toasts, feuilles modales, dialogues
   ========================================================= */

// Registres partagés par les vues (remplis par js/views/*.js)
const Views = {};    // écrans : { tab, render(param) → { title, html, ... }, mount() }
const Actions = {};  // clics      : data-action="nom"
const Changes = {};  // changements: data-change="nom"
const Inputs = {};   // saisie     : data-input="nom"

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  back: '<path d="M15 18 9 12l6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 9a6 6 0 0 1 8 0l-3 3"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-7 0-3-2-5.5-3.5-7-.3 2-1.5 3.3-3 3.5.5-3-1-6.5-4-8.5.3 3-1.5 5.5-3 7.5C4.5 12 5 13.5 5 15c0 4.3 3 7 7 7z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
};

function icon(name, cls) {
  return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg, ms) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2600);
}

function haptic(ms) {
  if (S && S.settings.vibration && navigator.vibrate) { try { navigator.vibrate(ms || 15); } catch (e) { /* ignore */ } }
}

/* ---------- Feuille modale (bottom sheet) ---------- */
const Sheet = {
  onClose: null,
  open(html, opts) {
    opts = opts || {};
    const root = document.getElementById('sheet-root');
    root.innerHTML = `<div class="backdrop" data-action="sheet-close"></div>
      <div class="sheet ${opts.cls || ''}" role="dialog" aria-modal="true">
        <div class="sheet-grip"></div>
        <button class="sheet-x" data-action="sheet-close" aria-label="Fermer">${icon('close')}</button>
        <div class="sheet-body">${html}</div>
      </div>`;
    this.onClose = opts.onClose || null;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => root.classList.add('open'));
  },
  update(html) {
    const body = document.querySelector('#sheet-root .sheet-body');
    if (body) body.innerHTML = html;
  },
  isOpen() { return document.body.classList.contains('sheet-open'); },
  close() {
    const root = document.getElementById('sheet-root');
    if (!root.innerHTML) return;
    root.classList.remove('open');
    document.body.classList.remove('sheet-open');
    const cb = this.onClose;
    this.onClose = null;
    setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 220);
    if (cb) cb();
  },
};

/* ---------- Dialogues (au-dessus des feuilles) ---------- */
function openDialog(html) {
  const root = document.getElementById('dialog-root');
  root.innerHTML = `<div class="backdrop backdrop-dialog"></div><div class="dialog" role="alertdialog" aria-modal="true">${html}</div>`;
  requestAnimationFrame(() => root.classList.add('open'));
  return root;
}
function closeDialog() {
  const root = document.getElementById('dialog-root');
  root.classList.remove('open');
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 180);
}

/**
 * Choix multiple. choices: [{ label, value, cls }] → Promise<value | null>
 */
function choiceDialog(o) {
  return new Promise(resolve => {
    const root = openDialog(`
      <h3 class="dialog-title">${esc(o.title)}</h3>
      ${o.text ? `<p class="dialog-text">${o.text}</p>` : ''}
      ${o.typeToConfirm ? `<input class="input" id="dlg-type" autocomplete="off" autocapitalize="characters" placeholder="Tape ${esc(o.typeToConfirm)}">` : ''}
      <div class="dialog-actions">
        ${o.choices.map((c, i) => `<button class="btn ${c.cls || 'btn-secondary'}" data-i="${i}" ${c.needsType ? 'disabled' : ''}>${esc(c.label)}</button>`).join('')}
      </div>`);
    const typeIn = root.querySelector('#dlg-type');
    if (typeIn) {
      typeIn.addEventListener('input', () => {
        const ok = typeIn.value.trim().toUpperCase() === o.typeToConfirm;
        root.querySelectorAll('button[data-i]').forEach(b => {
          if (o.choices[+b.dataset.i].needsType) b.disabled = !ok;
        });
      });
    }
    root.querySelectorAll('button[data-i]').forEach(b => {
      b.addEventListener('click', () => { closeDialog(); resolve(o.choices[+b.dataset.i].value); });
    });
    root.querySelector('.backdrop').addEventListener('click', () => { closeDialog(); resolve(null); });
  });
}

function confirmDialog(o) {
  return choiceDialog({
    title: o.title, text: o.text, typeToConfirm: o.typeToConfirm,
    choices: [
      { label: o.cancel || 'Annuler', value: false, cls: 'btn-secondary' },
      { label: o.ok || 'Confirmer', value: true, cls: o.danger ? 'btn-danger' : 'btn-primary', needsType: !!o.typeToConfirm },
    ],
  }).then(v => v === true);
}

function promptDialog(o) {
  return new Promise(resolve => {
    const root = openDialog(`
      <h3 class="dialog-title">${esc(o.title)}</h3>
      <input class="input" id="dlg-in" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}" maxlength="60">
      <div class="dialog-actions">
        <button class="btn btn-secondary" data-r="0">Annuler</button>
        <button class="btn btn-primary" data-r="1">${esc(o.ok || 'Valider')}</button>
      </div>`);
    const input = root.querySelector('#dlg-in');
    setTimeout(() => input.focus(), 50);
    const done = ok => {
      const v = input.value.trim();
      if (ok && !v) { input.focus(); return; }
      closeDialog();
      resolve(ok ? v : null);
    };
    root.querySelector('[data-r="0"]').addEventListener('click', () => done(false));
    root.querySelector('[data-r="1"]').addEventListener('click', () => done(true));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') done(true); });
    root.querySelector('.backdrop').addEventListener('click', () => done(false));
  });
}

/* ---------- Petits composants ---------- */
function progressBar(pct, cls) {
  return `<div class="pbar ${cls || ''}"><i style="width:${clamp(pct, 0, 100).toFixed(1)}%"></i></div>`;
}
function statusBadge(status) {
  const map = {
    done: ['Terminée', 'b-green'], partial: ['Non terminée', 'b-amber'], planned: ['Prévue', 'b-red'],
    missed: ['Manquée', 'b-missed'], rest: ['Repos', 'b-gray'], none: ['—', 'b-gray'],
  };
  const m = map[status] || map.none;
  return `<span class="badge ${m[1]}">${m[0]}</span>`;
}
function workoutSetsCount(w) { return w.exercises.reduce((a, e) => a + e.sets, 0); }
function workoutMeta(w) {
  const n = w.exercises.length;
  return `${n} exercice${n > 1 ? 's' : ''} · ${workoutSetsCount(w)} séries`;
}
