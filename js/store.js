'use strict';
/* =========================================================
   STORE — modèle de données, valeurs par défaut, stockage local
   ========================================================= */

const STORAGE_KEY = 'vtaper.data.v1';
const DATA_VERSION = 1;
const APP_VERSION = '1.0.0';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_LETTER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTH_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const EX_TYPES = {
  heavy: { label: 'Composé lourd', rest: 150 },
  compound: { label: 'Composé modéré', rest: 120 },
  isolation: { label: 'Isolation', rest: 90 },
};

const FEELINGS = [
  { id: 'easy', label: 'Facile' },
  { id: 'ok', label: 'Correct' },
  { id: 'hard', label: 'Difficile' },
  { id: 'max', label: 'À fond' },
];

/* ---------- Utilitaires ---------- */
function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function slugify(str) {
  return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function pad2(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function todayISO() { return toISO(new Date()); }
function parseISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
/** 0 = lundi … 6 = dimanche */
function weekdayIdx(iso) { return (parseISO(iso).getDay() + 6) % 7; }
function weekStart(iso) { return addDays(iso, -weekdayIdx(iso)); }
function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function roundTo(n, step) { step = step || 0.25; return Math.round(n / step) * step; }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function num(v) {
  if (v === '' || v == null) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isFinite(n) ? n : null;
}
function fmtNum(n, dec) {
  if (n == null || !isFinite(n)) return '—';
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: dec == null ? 1 : dec });
}
function fmtKg(n) { return fmtNum(n, 2); }
function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  return Math.floor(sec / 60) + ':' + pad2(sec % 60);
}
function fmtDuration(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + pad2(m % 60);
}
function fmtDateLong(iso) {
  const d = parseISO(iso);
  return DAY_NAMES[weekdayIdx(iso)] + ' ' + d.getDate() + ' ' + MONTH_NAMES[d.getMonth()];
}
function fmtDateShort(iso) {
  const d = parseISO(iso);
  return d.getDate() + ' ' + MONTH_SHORT[d.getMonth()];
}
function relDays(iso) {
  const n = daysBetween(iso, todayISO());
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return 'hier';
  return 'il y a ' + n + ' jours';
}

/* ---------- Programme par défaut ---------- */
// [nom, type, incrément de charge (kg), poids du corps ?]
const DEFAULT_LIBRARY = [
  ['Développé couché haltères', 'heavy', 2, false],
  ['Développé incliné haltères', 'compound', 2, false],
  ['Développé épaules haltères', 'heavy', 2, false],
  ['Élévations latérales', 'isolation', 1, false],
  ['Dips', 'compound', 2.5, true],
  ['Extension triceps au-dessus de la tête', 'isolation', 2, false],
  ['Tractions pronation', 'heavy', 2.5, true],
  ['Tractions prise large', 'heavy', 2.5, true],
  ['Tractions supination', 'heavy', 2.5, true],
  ['Pull-over haltère', 'isolation', 2, false],
  ['Rowing unilatéral haltère', 'compound', 2, false],
  ['Oiseau haltères', 'isolation', 1, false],
  ['Curl haltères', 'isolation', 2, false],
  ['Curl marteau', 'isolation', 2, false],
  ['Curl incliné', 'isolation', 2, false],
  ['Extension triceps', 'isolation', 2, false],
  ['Goblet squat', 'compound', 2, false],
  ['Soulevé de terre roumain haltères', 'compound', 2, false],
];

// [nom, séries, reps min, reps max]
const DEFAULT_PROGRAM = [
  {
    id: 'w_push', day: 1, name: 'Pectoraux + épaules + triceps', note: '',
    items: [
      ['Développé couché haltères', 4, 6, 10],
      ['Développé incliné haltères', 3, 8, 12],
      ['Développé épaules haltères', 3, 6, 10],
      ['Élévations latérales', 4, 12, 20],
      ['Dips', 3, 6, 12],
      ['Extension triceps au-dessus de la tête', 3, 10, 15],
    ],
  },
  {
    id: 'w_back', day: 2, name: 'Dos largeur + biceps',
    note: 'Priorité : silhouette en V — largeur des dorsaux, pas l’épaisseur du dos.',
    items: [
      ['Tractions pronation', 4, 6, 10],
      ['Tractions prise large', 3, 6, 10],
      ['Pull-over haltère', 3, 10, 15],
      ['Rowing unilatéral haltère', 2, 8, 12],
      ['Oiseau haltères', 3, 12, 20],
      ['Curl haltères', 3, 8, 12],
      ['Curl marteau', 3, 10, 15],
    ],
  },
  {
    id: 'w_shoulders', day: 4, name: 'Épaules + dos largeur + bras', note: '',
    items: [
      ['Tractions supination', 3, 6, 10],
      ['Tractions pronation', 3, 6, 10],
      ['Pull-over haltère', 3, 10, 15],
      ['Élévations latérales', 4, 12, 20],
      ['Oiseau haltères', 3, 12, 20],
      ['Curl incliné', 3, 8, 12],
      ['Extension triceps', 3, 10, 15],
    ],
  },
  {
    id: 'w_full', day: 6, name: 'Haut du corps + jambes', note: '',
    items: [
      ['Développé couché haltères', 3, 6, 10],
      ['Dips', 3, 8, 12],
      ['Goblet squat', 3, 8, 12],
      ['Soulevé de terre roumain haltères', 3, 8, 12],
      ['Élévations latérales', 3, 15, 20],
      ['Curl marteau', 3, 10, 15],
      ['Extension triceps', 3, 10, 15],
    ],
  },
];

function buildDefaultProgram(restDefaults) {
  const rest = restDefaults || { heavy: 150, compound: 120, isolation: 90 };
  const exercises = {};
  DEFAULT_LIBRARY.forEach(([name, type, increment, bodyweight]) => {
    const id = slugify(name);
    exercises[id] = { id, name, type, increment, bodyweight };
  });
  const workouts = {};
  const schedule = Array.from({ length: 7 }, () => ({ workoutId: null, note: '' }));
  schedule[0].note = 'EPS à l’école (~2 h)';
  DEFAULT_PROGRAM.forEach(w => {
    workouts[w.id] = {
      id: w.id, name: w.name, note: w.note,
      exercises: w.items.map(([name, sets, repMin, repMax]) => {
        const exId = slugify(name);
        return { id: uid('e'), exId, sets, repMin, repMax, rest: rest[exercises[exId].type] };
      }),
    };
    schedule[w.day].workoutId = w.id;
  });
  return { exercises, workouts, workoutOrder: DEFAULT_PROGRAM.map(w => w.id), schedule };
}

function defaultState() {
  const settings = {
    autoTimer: true, sound: true, vibration: true, keepAwake: true, theme: 'dark',
    rest: { heavy: 150, compound: 120, isolation: 90 },
  };
  const prog = buildDefaultProgram(settings.rest);
  return {
    version: DATA_VERSION,
    createdAt: todayISO(),
    profile: {
      name: '', age: 16, height: 192, startWeight: 78, targetWeight: 85,
      goal: 'Prise de muscle + force',
      priorities: ['Silhouette en V', 'Largeur du dos / dorsaux', 'Épaules', 'Bras'],
      secondary: 'Jambes',
    },
    settings,
    exercises: prog.exercises,
    workouts: prog.workouts,
    workoutOrder: prog.workoutOrder,
    schedule: prog.schedule,
    sessions: [],   // séances enregistrées (completed | partial)
    weights: [],    // pesées { date, kg }
    active: null,   // séance en cours
  };
}

/* ---------- Chargement / sauvegarde ---------- */
let S = null;

function normalizeState(d) {
  if (!d || typeof d !== 'object' || typeof d.workouts !== 'object' || !Array.isArray(d.sessions)) {
    throw new Error('Format de données invalide');
  }
  const def = defaultState();
  const out = Object.assign({}, def, d);
  out.version = DATA_VERSION;
  out.profile = Object.assign({}, def.profile, d.profile || {});
  if (!Array.isArray(out.profile.priorities)) out.profile.priorities = def.profile.priorities.slice();
  out.settings = Object.assign({}, def.settings, d.settings || {});
  out.settings.rest = Object.assign({}, def.settings.rest, (d.settings && d.settings.rest) || {});
  out.exercises = d.exercises && typeof d.exercises === 'object' ? d.exercises : {};
  out.workouts = d.workouts || {};

  // Toute référence d'exercice doit exister dans la bibliothèque
  Object.values(out.workouts).forEach(w => {
    if (!Array.isArray(w.exercises)) w.exercises = [];
    w.exercises.forEach(e => {
      if (!e.id) e.id = uid('e');
      if (!out.exercises[e.exId]) {
        out.exercises[e.exId] = { id: e.exId, name: e.name || e.exId, type: 'compound', increment: 2, bodyweight: false };
      }
    });
  });

  const order = Array.isArray(d.workoutOrder) ? d.workoutOrder.filter(id => out.workouts[id]) : [];
  Object.keys(out.workouts).forEach(id => { if (!order.includes(id)) order.push(id); });
  out.workoutOrder = order;

  const sched = Array.isArray(d.schedule) ? d.schedule : def.schedule;
  out.schedule = Array.from({ length: 7 }, (_, i) => {
    const s = sched[i] || {};
    return { workoutId: s.workoutId && out.workouts[s.workoutId] ? s.workoutId : null, note: s.note || '' };
  });

  out.weights = (Array.isArray(d.weights) ? d.weights : [])
    .filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(w.date) && isFinite(w.kg))
    .sort((a, b) => a.date.localeCompare(b.date));
  out.sessions = d.sessions
    .filter(s => s && s.id && s.date && Array.isArray(s.exercises))
    .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.createdAt || '')) out.createdAt = todayISO();
  if (out.active && (!out.active.exercises || !Array.isArray(out.active.exercises))) out.active = null;
  return out;
}

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* stockage indisponible */ }
  if (!raw) {
    S = defaultState();
    saveState();
    return;
  }
  try {
    S = normalizeState(JSON.parse(raw));
  } catch (e) {
    // Données corrompues : on garde une copie de secours puis on repart proprement
    try { localStorage.setItem(STORAGE_KEY + '.backup.' + Date.now(), raw); } catch (_) { /* ignore */ }
    S = defaultState();
    saveState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    return true;
  } catch (e) {
    if (typeof toast === 'function') toast('⚠️ Sauvegarde impossible (stockage plein ou désactivé)');
    return false;
  }
}

/** Crée ou met à jour un exercice de la bibliothèque à partir de son nom. */
function upsertExercise(name, props) {
  const clean = String(name || '').trim();
  const id = slugify(clean) || uid('ex');
  if (!S.exercises[id]) {
    S.exercises[id] = { id, name: clean, type: 'compound', increment: 2, bodyweight: false };
  }
  S.exercises[id].name = clean;
  Object.assign(S.exercises[id], props || {});
  return id;
}
