'use strict';
/* =========================================================
   SÉANCE — écran d'entraînement + bilan de fin de séance
   ========================================================= */

function startSession(workoutId) {
  if (S.active) { toast('Une séance est déjà en cours'); go('session'); return; }
  const w = S.workouts[workoutId];
  if (!w) return;
  if (!w.exercises.length) { toast('Cette séance ne contient aucun exercice'); return; }
  S.active = createSession(workoutId);
  saveState();
  Timer.unlockAudio();
  requestWakeLock();
  if (Sheet.isOpen()) Sheet.close();
  go('session');
}

/** Heure de fin réaliste (si la séance a été oubliée ouverte, on s'arrête après la dernière série). */
function sessionEnd(a) {
  let lastAt = 0;
  a.exercises.forEach(e => e.sets.forEach(s => { if (s.done && s.at > lastAt) lastAt = s.at; }));
  const now = Date.now();
  if (lastAt && now - lastAt > 30 * 60000) return lastAt + 3 * 60000;
  return now;
}

function finalizeSession(status) {
  const a = S.active;
  if (!a) return;
  a.endedAt = sessionEnd(a);
  a.duration = a.endedAt - a.startedAt;
  a.status = status;
  delete a.timer;
  delete a.current;
  a.exercises.forEach(e => e.sets.forEach(s => { delete s.hint; }));
  S.sessions.push(a);
  S.sessions.sort((x, y) => x.startedAt - y.startedAt);
  S.active = null;
  saveState();
  Timer.render();
  releaseWakeLock();
}

function activeEx() { return S.active.exercises[S.active.current]; }

/* ---------- Choix de la séance ---------- */
function sessionPicker() {
  const today = todayISO();
  const planned = plannedFor(today);
  const list = S.workoutOrder.map(id => S.workouts[id]).filter(Boolean);
  const daysOf = id => S.schedule.map((s, i) => s.workoutId === id ? DAY_SHORT[i] : null).filter(Boolean);
  const card = w => {
    const last = lastSessionOfWorkout(w.id);
    const isToday = w.id === planned;
    return `<section class="card ${isToday ? 'card-today' : ''}">
      <div class="card-head tight">
        <div>${isToday ? '<div class="eyebrow accent">Séance du jour</div>' : ''}
          <div class="card-title">${esc(w.name)}</div>
          <div class="muted small">${workoutMeta(w)}${daysOf(w.id).length ? ' · ' + daysOf(w.id).join(', ') : ''}</div>
          <div class="muted small">Dernière fois : ${last ? relDays(last.date) : 'jamais'}</div></div>
      </div>
      <button class="btn ${isToday ? 'btn-primary btn-xl' : 'btn-secondary btn-lg'} btn-block" data-action="start" data-id="${w.id}">${icon('play')} COMMENCER</button>
    </section>`;
  };
  const sorted = list.slice().sort((a, b) => (b.id === planned) - (a.id === planned));
  return {
    title: 'Séance',
    subtitle: planned ? 'Aujourd’hui : ' + S.workouts[planned].name : 'Aujourd’hui : repos',
    html: `${planned ? '' : `<div class="note-banner">${icon('moon')} Jour de repos. Tu peux quand même lancer n’importe quelle séance.</div>`}
      ${sorted.map(card).join('') || '<p class="muted">Aucune séance. Crée-en une dans l’onglet Programme.</p>'}`,
  };
}

/* ---------- Séance en cours ---------- */
function recoHtml(ex) {
  const r = ex.rec;
  if (!r) return '';
  const cls = { increase: 'reco-up', decrease: 'reco-down', hold: 'reco-hold', new: 'reco-new' }[r.kind] || 'reco-hold';
  const ic = { increase: 'up', decrease: 'down', hold: 'target', new: 'info' }[r.kind] || 'target';
  let status = '';
  if (ex.recStatus === 'pending') {
    status = `<div class="btn-row">
      <button class="btn btn-primary" data-action="rec-accept">Accepter · ${esc(shortWeight(ex.exId, r.weight))}</button>
      <button class="btn btn-secondary" data-action="rec-refuse">Garder ${esc(shortWeight(ex.exId, r.lastWeight))}</button></div>`;
  } else if (ex.recStatus === 'accepted') {
    status = `<div class="reco-status">${icon('check')} Acceptée : ${esc(shortWeight(ex.exId, r.weight))} <button class="link-btn" data-action="rec-reset">modifier</button></div>`;
  } else if (ex.recStatus === 'refused') {
    status = `<div class="reco-status">Refusée : tu gardes ${esc(shortWeight(ex.exId, r.lastWeight))} <button class="link-btn" data-action="rec-reset">modifier</button></div>`;
  }
  return `<div class="reco ${cls}">
    <div class="reco-head">${icon(ic)}<span>${esc(r.title)}</span></div>
    <p class="reco-text">${esc(r.text)}</p>
    <div class="reco-goal"><span class="lbl">Objectif aujourd’hui</span><b>${esc(r.goal)}</b></div>
    ${status}
  </div>`;
}

function setRowsHtml(ex) {
  const info = getEx(ex.exId);
  const nextIdx = ex.sets.findIndex(s => !s.done);
  const val = v => v == null ? '' : String(v).replace('.', ',');
  return ex.sets.map((s, i) => `
    <div class="set-row ${s.done ? 'done' : ''} ${i === nextIdx ? 'next' : ''}">
      <div class="set-n">${i + 1}</div>
      <input class="set-in" type="text" inputmode="decimal" autocomplete="off" data-input="set" data-change="set" data-i="${i}" data-f="weight" data-old="${s.weight == null ? '' : s.weight}"
        value="${val(s.weight)}" placeholder="${info.bodyweight ? '0' : 'kg'}" ${s.done ? 'readonly' : ''} aria-label="Charge série ${i + 1}">
      <input class="set-in" type="text" inputmode="numeric" autocomplete="off" data-input="set" data-i="${i}" data-f="reps"
        value="${val(s.reps)}" placeholder="${s.hint || ex.target.repMin}" ${s.done ? 'readonly' : ''} aria-label="Répétitions série ${i + 1}">
      <input class="set-in set-rir" type="text" inputmode="numeric" autocomplete="off" data-input="set" data-i="${i}" data-f="rir"
        value="${val(s.rir)}" placeholder="–" ${s.done ? 'readonly' : ''} aria-label="RIR série ${i + 1}">
      <button class="set-check" data-action="set-toggle" data-i="${i}" aria-label="${s.done ? 'Annuler' : 'Valider'} la série ${i + 1}">${icon('check')}</button>
    </div>`).join('');
}

function sessionActive() {
  const a = S.active;
  a.current = clamp(a.current || 0, 0, a.exercises.length - 1);
  const ex = activeEx();
  const info = getEx(ex.exId);
  const tot = sessionTotals(a);
  const last = lastPerformance(ex.exId);
  const cur = a.current, len = a.exercises.length;

  const pills = a.exercises.map((e, i) => {
    const d = e.sets.filter(s => s.done).length;
    const full = d === e.sets.length;
    return `<button class="pill ${i === cur ? 'active' : ''} ${full ? 'done' : ''}" data-action="ex-go" data-i="${i}">
      <span class="pill-n">${full ? icon('check') : i + 1}</span><span class="pill-t">${esc(e.name)}</span><span class="pill-c">${d}/${e.sets.length}</span></button>`;
  }).join('');

  const lastHtml = last
    ? `<div class="last-perf"><span class="lbl">Dernière séance · ${relDays(last.date)}</span>
        <b>${esc(perfText(ex.exId, last.sets))}</b>
        ${last.sets.some(s => s.rir != null) ? `<span class="muted small">RIR ${last.sets.map(s => s.rir == null ? '–' : s.rir).join(' / ')}</span>` : ''}</div>`
    : `<div class="last-perf"><span class="lbl">Dernière séance</span><b class="muted">Aucune donnée</b></div>`;

  const html = `
    <div class="sess-head">
      <div class="sess-stat"><span class="lbl">Durée</span><b id="sess-elapsed">0:00</b></div>
      <div class="sess-stat"><span class="lbl">Séries</span><b>${tot.setsDone}/${tot.setsTotal}</b></div>
      <div class="sess-stat"><span class="lbl">Volume</span><b>${fmtNum(tot.volume, 0)}<small> kg</small></b></div>
    </div>
    ${progressBar(tot.setsTotal ? tot.setsDone / tot.setsTotal * 100 : 0)}
    <div class="pills" id="pills">${pills}</div>

    <article class="ex-card">
      <div class="eyebrow">Exercice ${cur + 1}/${len} · ${EX_TYPES[info.type] ? EX_TYPES[info.type].label : ''}</div>
      <h2 class="ex-name">${esc(ex.name)}</h2>
      <div class="ex-target">
        <div class="ex-target-box"><span class="lbl">Objectif</span><b>${ex.target.sets} × ${ex.target.repMin}–${ex.target.repMax}</b></div>
        <div class="ex-target-box">
          <span class="lbl">Repos</span>
          <div class="rest-ctl">
            <button class="mini-btn" data-action="rest-adj" data-d="-15" aria-label="Moins de repos">${icon('minus')}</button>
            <b id="rest-val">${fmtClock(ex.rest)}</b>
            <button class="mini-btn" data-action="rest-adj" data-d="15" aria-label="Plus de repos">${icon('plus')}</button>
          </div>
        </div>
      </div>
      ${lastHtml}
      ${recoHtml(ex)}
      <div class="sets">
        <div class="set-head"><span>#</span><span>${info.bodyweight ? 'Lest kg' : 'Kg'}</span><span>Reps</span><span>RIR</span><span></span></div>
        ${setRowsHtml(ex)}
      </div>
      <div class="sets-help">Case vide = valeur grisée proposée. RIR = reps en réserve (0 = échec) — vise 1 à 3.</div>
      <div class="feel">
        <span class="lbl">Difficulté ressentie</span>
        <div class="seg">${FEELINGS.map(f => `<button class="seg-btn ${ex.feeling === f.id ? 'on' : ''}" data-action="ex-feel" data-v="${f.id}">${f.label}</button>`).join('')}</div>
      </div>
      <button class="btn btn-ghost btn-sm btn-block" data-action="timer-manual">${icon('clock')} Lancer le repos manuellement</button>
    </article>

    <div class="sess-nav">
      <button class="btn btn-secondary btn-lg" data-action="ex-nav" data-d="-1" ${cur === 0 ? 'disabled' : ''}>${icon('back')}</button>
      ${cur < len - 1
        ? `<button class="btn btn-primary btn-lg grow" data-action="ex-nav" data-d="1">Exercice suivant ${icon('next')}</button>`
        : `<button class="btn btn-primary btn-lg grow" data-action="finish">Terminer la séance ${icon('check')}</button>`}
    </div>
    ${cur < len - 1 ? `<button class="btn btn-outline btn-block" data-action="finish">TERMINER LA SÉANCE</button>` : ''}`;

  return {
    title: a.workoutName, subtitle: 'Séance en cours', html,
    right: `<button class="icon-btn" data-action="session-menu" aria-label="Options de séance">${icon('more')}</button>`,
  };
}

Views.session = {
  tab: 'session',
  render() { return S.active ? sessionActive() : sessionPicker(); },
  mount() {
    tickClock();
    const pills = document.getElementById('pills');
    const act = pills && pills.querySelector('.pill.active');
    if (act) pills.scrollLeft = act.offsetLeft - pills.clientWidth / 2 + act.clientWidth / 2;
  },
};

/* ---------- Actions de séance ---------- */
Object.assign(Actions, {
  start(el) { startSession(el.dataset.id); },

  'ex-go'(el) { S.active.current = +el.dataset.i; saveState(); render(); },
  'ex-nav'(el) {
    S.active.current = clamp(S.active.current + (+el.dataset.d), 0, S.active.exercises.length - 1);
    saveState(); render();
  },

  'set-toggle'(el) {
    Timer.unlockAudio();
    const a = S.active;
    const ex = activeEx();
    const i = +el.dataset.i;
    const set = ex.sets[i];
    if (set.done) {
      set.done = false; delete set.at;
      saveState(); rerender();
      return;
    }
    const row = el.closest('.set-row');
    const wIn = row.querySelector('[data-f="weight"]');
    const rIn = row.querySelector('[data-f="reps"]');
    const rirIn = row.querySelector('[data-f="rir"]');
    let weight = num(wIn.value);
    if (weight == null && i > 0) weight = ex.sets[i - 1].weight;
    if (weight == null && getEx(ex.exId).bodyweight) weight = 0;
    if (weight == null || weight < 0) { toast('Entre la charge (kg)'); wIn.focus(); return; }
    let reps = num(rIn.value);
    if (reps == null) reps = num(rIn.placeholder);
    if (!reps || reps <= 0) { toast('Entre le nombre de répétitions'); rIn.focus(); return; }
    const rir = num(rirIn.value);
    Object.assign(set, { weight, reps: Math.round(reps), rir: rir == null ? null : clamp(Math.round(rir), 0, 10), done: true, at: Date.now() });
    // La charge validée devient la valeur par défaut des séries suivantes vides
    ex.sets.forEach((s, j) => { if (j > i && !s.done && s.weight == null) s.weight = weight; });
    haptic(20);

    const exDone = ex.sets.every(s => s.done);
    const allDone = a.exercises.every(e => e.sets.every(s => s.done));
    let next = '';
    if (!exDone) {
      next = `Série ${ex.sets.findIndex(s => !s.done) + 1} · ${ex.name}`;
    } else if (!allDone) {
      const len = a.exercises.length;
      for (let k = 1; k < len; k++) {
        const idx = (a.current + k) % len;
        if (a.exercises[idx].sets.some(s => !s.done)) { a.current = idx; break; }
      }
      next = activeEx().name;
    }
    saveState();
    if (allDone) {
      toast('Toutes les séries sont faites 💪 Termine la séance', 3500);
    } else if (S.settings.autoTimer) {
      Timer.start(ex.rest, ex.name, next);
    }
    if (exDone) render(); else rerender();
  },

  'rec-accept'() {
    const ex = activeEx();
    ex.recStatus = 'accepted';
    ex.sets.forEach(s => { if (!s.done) s.weight = ex.rec.weight; });
    saveState(); rerender();
    toast('Charge mise à jour : ' + shortWeight(ex.exId, ex.rec.weight));
  },
  'rec-refuse'() {
    const ex = activeEx();
    ex.recStatus = 'refused';
    ex.sets.forEach(s => { if (!s.done) s.weight = ex.rec.lastWeight; });
    saveState(); rerender();
  },
  'rec-reset'() { activeEx().recStatus = 'pending'; saveState(); rerender(); },

  'ex-feel'(el) {
    const ex = activeEx();
    ex.feeling = ex.feeling === el.dataset.v ? null : el.dataset.v;
    saveState(); rerender();
  },

  'rest-adj'(el) {
    const ex = activeEx();
    ex.rest = clamp(ex.rest + (+el.dataset.d), 15, 600);
    // Le temps de repos modifié est aussi enregistré dans le programme
    const w = S.workouts[S.active.workoutId];
    const entry = w && w.exercises.find(e => e.id === ex.entryId);
    if (entry) entry.rest = ex.rest;
    saveState();
    const v = document.getElementById('rest-val');
    if (v) v.textContent = fmtClock(ex.rest);
  },

  'timer-manual'() {
    Timer.unlockAudio();
    const ex = activeEx();
    Timer.start(ex.rest, ex.name, '');
  },

  'session-menu'() {
    Sheet.open(`
      <h2 class="sheet-title">Options de séance</h2>
      <div class="list">
        <button class="list-item" data-action="finish">${icon('check', 'accent')}<div class="grow"><div class="row-title">Terminer la séance</div><div class="muted small">Voir le bilan puis valider</div></div></button>
        <button class="list-item" data-action="toggle-autotimer">${icon('clock', 'accent')}<div class="grow"><div class="row-title">Timer automatique : ${S.settings.autoTimer ? 'activé' : 'désactivé'}</div><div class="muted small">Démarre le repos après chaque série validée</div></div></button>
        <button class="list-item" data-action="abandon">${icon('close', 'accent')}<div class="grow"><div class="row-title">Abandonner la séance</div><div class="muted small">Enregistrer comme non terminée ou supprimer</div></div></button>
      </div>`);
  },
  'toggle-autotimer'() {
    S.settings.autoTimer = !S.settings.autoTimer;
    saveState(); Sheet.close();
    toast('Timer automatique ' + (S.settings.autoTimer ? 'activé' : 'désactivé'));
  },

  finish() { if (Sheet.isOpen()) Sheet.close(); go('summary'); },

  async abandon() {
    if (Sheet.isOpen()) Sheet.close();
    if (!S.active) return;
    const t = sessionTotals(S.active);
    const choices = [];
    if (t.setsDone > 0) choices.push({ label: 'Enregistrer comme non terminée', value: 'partial', cls: 'btn-primary' });
    choices.push({ label: 'Supprimer sans enregistrer', value: 'delete', cls: 'btn-danger' });
    choices.push({ label: 'Continuer la séance', value: null, cls: 'btn-secondary' });
    const v = await choiceDialog({
      title: 'Quitter la séance ?',
      text: t.setsDone > 0 ? `${t.setsDone}/${t.setsTotal} séries réalisées.` : 'Aucune série réalisée.',
      choices,
    });
    if (v === 'partial') {
      finalizeSession('partial');
      toast('Séance enregistrée comme non terminée');
      go('home');
    } else if (v === 'delete') {
      S.active = null; saveState(); Timer.render(); releaseWakeLock();
      toast('Séance supprimée');
      go('home');
    }
  },

  'validate-session'() {
    finalizeSession('completed');
    haptic(40);
    toast('✅ Séance validée — ajoutée au calendrier', 3000);
    go('home');
  },
  'save-partial'() {
    finalizeSession('partial');
    toast('Séance enregistrée comme non terminée', 3000);
    go('home');
  },
  'sess-feel'(el) {
    S.active.feeling = S.active.feeling === el.dataset.v ? null : el.dataset.v;
    saveState(); rerender();
  },
});

Inputs.set = el => {
  if (!S.active) return;
  const s = activeEx().sets[+el.dataset.i];
  if (!s || s.done) return;
  const v = num(el.value);
  s[el.dataset.f] = v == null ? null : (el.dataset.f === 'weight' ? v : Math.round(v));
  saveState();
};

/** Changer la charge d'une série met à jour les séries suivantes qui avaient la même charge. */
Changes.set = el => {
  if (!S.active || el.dataset.f !== 'weight') return;
  const ex = activeEx();
  const i = +el.dataset.i;
  const old = num(el.dataset.old);
  const v = num(el.value);
  if (v == null) return;
  ex.sets.forEach((s, j) => {
    if (j <= i || s.done) return;
    if (s.weight == null || s.weight === old) {
      s.weight = v;
      const inp = document.querySelector(`.set-in[data-f="weight"][data-i="${j}"]`);
      if (inp) { inp.value = String(v).replace('.', ','); inp.dataset.old = v; }
    }
  });
  el.dataset.old = v;
  saveState();
};

/* ---------- Bilan : SÉANCE TERMINÉE ---------- */
Views.summary = {
  tab: 'session',
  render() {
    const a = S.active;
    if (!a) return { redirect: 'home' };
    const tot = sessionTotals(a);
    const dur = sessionEnd(a) - a.startedAt;
    const prev = lastSessionOfWorkout(a.workoutId);
    const prevTot = prev ? sessionTotals(prev) : null;
    const comps = a.exercises.map(e => ({ e, c: compareExercise(e, a) }));
    const by = st => comps.filter(x => x.c.status === st);
    const up = by('up'), same = by('same'), down = by('down'), fresh = by('new'), skipped = by('skipped');
    const incomplete = tot.setsDone < tot.setsTotal;
    const compared = up.length + same.length + down.length;

    const delta = (cur, old, unit, neutral) => {
      if (old == null) return '';
      const d = cur - old;
      const cls = neutral ? '' : d > 0 ? 'pos' : d < 0 ? 'neg' : '';
      return `<span class="delta ${cls}">${d > 0 ? '+' : d < 0 ? '−' : '±'}${fmtNum(Math.abs(d), 0)}${unit || ''}</span>`;
    };

    let global;
    if (!prevTot) global = 'Première fois que tu fais cette séance : elle sert de référence pour la suite.';
    else {
      const pct = prevTot.volume ? Math.round((tot.volume - prevTot.volume) / prevTot.volume * 100) : 0;
      global = `${up.length}/${compared || 0} exercice${up.length > 1 ? 's' : ''} en progression · volume ${pct >= 0 ? '+' : '−'}${Math.abs(pct)} % vs la dernière fois.`;
    }

    const list = (items, cls, title) => items.length ? `
      <div class="sec-title">${title} <span class="count">${items.length}</span></div>
      <div class="cmp-list">${items.map(x => `<div class="cmp-row ${cls}"><span>${esc(x.e.name)}</span><b>${esc(x.c.text)}</b></div>`).join('')}</div>` : '';

    const html = `
      <section class="done-hero">
        <div class="done-icon">${icon('trophy')}</div>
        <h1>SÉANCE TERMINÉE</h1>
        <div class="muted">${esc(a.workoutName)} · ${fmtDateLong(a.date)}</div>
      </section>
      <div class="stat-grid">
        <div class="stat"><span class="lbl">Durée</span><b>${fmtDuration(dur)}</b>${prev ? delta(Math.round(dur / 60000), Math.round((prev.duration || 0) / 60000), ' min', true) : ''}</div>
        <div class="stat"><span class="lbl">Séries</span><b>${tot.setsDone}<small>/${tot.setsTotal}</small></b>${prevTot ? delta(tot.setsDone, prevTot.setsDone) : ''}</div>
        <div class="stat"><span class="lbl">Répétitions</span><b>${tot.reps}</b>${prevTot ? delta(tot.reps, prevTot.reps) : ''}</div>
        <div class="stat"><span class="lbl">Volume</span><b>${fmtNum(tot.volume, 0)}<small> kg</small></b>${prevTot ? delta(tot.volume, prevTot.volume, ' kg') : ''}</div>
      </div>
      <section class="card">
        <div class="eyebrow">Progression globale</div>
        <p class="lead">${esc(global)}</p>
        ${prev ? `<div class="muted small">Comparé à la séance du ${fmtDateShort(prev.date)} (${relDays(prev.date)}).</div>` : ''}
      </section>
      ${list(up, 'up', '↑ Exercices améliorés')}
      ${list(same, 'same', '= Exercices stagnants')}
      ${list(down, 'down', '↓ En baisse')}
      ${list(fresh, 'new', 'Nouveaux')}
      ${list(skipped, 'skip', 'Non réalisés')}
      <div class="feel">
        <span class="lbl">Ressenti global</span>
        <div class="seg">${FEELINGS.map(f => `<button class="seg-btn ${a.feeling === f.id ? 'on' : ''}" data-action="sess-feel" data-v="${f.id}">${f.label}</button>`).join('')}</div>
      </div>
      ${incomplete && tot.setsDone > 0 ? `<div class="note-banner warn">${icon('info')} Séance incomplète : ${tot.setsTotal - tot.setsDone} série(s) non faite(s). Tu peux la valider quand même ou l’enregistrer comme non terminée.</div>` : ''}
      ${tot.setsDone === 0 ? `<div class="note-banner warn">${icon('info')} Aucune série validée : rien à enregistrer.</div>` : ''}
      <div class="btn-col">
        ${tot.setsDone > 0 ? `<button class="btn btn-primary btn-xl btn-block" data-action="validate-session">${icon('check')} VALIDER LA SÉANCE</button>` : ''}
        ${incomplete && tot.setsDone > 0 ? `<button class="btn btn-outline btn-block" data-action="save-partial">Séance non terminée</button>` : ''}
        <button class="btn btn-secondary btn-block" data-action="go" data-to="session">Retour à la séance</button>
        ${tot.setsDone === 0 ? `<button class="btn btn-ghost btn-danger-text btn-block" data-action="abandon">Supprimer la séance</button>` : ''}
      </div>`;
    return { title: 'Bilan', subtitle: a.workoutName, back: 'session', html };
  },
};
