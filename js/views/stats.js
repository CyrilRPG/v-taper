'use strict';
/* =========================================================
   PROGRESSION — régularité, poids du corps, exercices
   ========================================================= */

let statsEx = null;
let statsMetric = 'weight';
const KEY_EXERCISES = [
  ['developpe-couche-halteres', 'Développé couché'],
  ['tractions-pronation', 'Tractions'],
  ['developpe-epaules-halteres', 'Développé épaules'],
  ['curl-halteres', 'Curl'],
];

function weightPoints() {
  const pts = S.weights.map(w => ({ date: w.date, value: w.kg }));
  if (!pts.length || pts[0].date > S.createdAt) pts.unshift({ date: S.createdAt, value: S.profile.startWeight });
  return pts;
}

function statsRegularity() {
  const st = weekStats(weekStart(todayISO()));
  const rate = regularityRate();
  const completed = S.sessions.filter(s => s.status === 'completed').length;
  const partial = S.sessions.filter(s => s.status === 'partial').length;
  return `
    <div class="sec-title">Régularité</div>
    <div class="stat-grid">
      <div class="stat"><span class="lbl">Cette semaine</span><b>${st.done}<small>/${st.planned}</small></b><span class="muted small">séances réalisées</span></div>
      <div class="stat"><span class="lbl">Streak</span><b>${weekStreak()}</b><span class="muted small">semaine(s) complète(s)</span></div>
      <div class="stat"><span class="lbl">Séances</span><b>${completed}</b><span class="muted small">${partial ? partial + ' non terminée(s)' : 'terminées au total'}</span></div>
      <div class="stat"><span class="lbl">Régularité</span><b>${rate == null ? '—' : rate + '<small> %</small>'}</b><span class="muted small">des séances prévues</span></div>
    </div>`;
}

function statsWeight() {
  const p = S.profile;
  const cur = currentWeight();
  const span = p.targetWeight - p.startWeight;
  const pct = span ? (cur - p.startWeight) / span * 100 : 100;
  const rest = p.targetWeight - cur;
  const pts = weightPoints();
  const path = pts.slice(-5).map(x => fmtNum(x.value, 1)).join(' → ') + (rest > 0 ? ' → … → ' + fmtKg(p.targetWeight) : '');
  const recent = S.weights.slice(-8).reverse();
  return `
    <div class="sec-title">Poids du corps</div>
    <section class="card">
      <div class="card-head tight">
        <div><span class="lbl">Poids actuel</span><div class="weight-big">${fmtKg(cur)}<small> kg</small></div></div>
        <button class="btn btn-primary" data-action="weight-add">${icon('plus')} Pesée</button>
      </div>
      <div class="kv-row">
        <div><span class="lbl">Initial</span><b>${fmtKg(p.startWeight)} kg</b></div>
        <div><span class="lbl">Objectif</span><b>${fmtKg(p.targetWeight)} kg</b></div>
        <div><span class="lbl">Reste</span><b class="${rest <= 0 ? 'txt-green' : ''}">${rest > 0 ? fmtKg(rest) + ' kg' : 'Atteint !'}</b></div>
      </div>
      ${progressBar(pct)}
      <div class="muted small">${Math.round(clamp(pct, 0, 100))} % du chemin · ${esc(path)}</div>
      ${lineChart(pts, { unit: 'kg', target: p.targetWeight, targetLabel: 'Objectif ' + fmtKg(p.targetWeight) + ' kg', label: 'Évolution du poids', empty: 'Ajoute ta première pesée' })}
      ${recent.length ? `<div class="hist-list">${recent.map(w => `
        <div class="hist-row"><span>${fmtDateLong(w.date)}</span><b>${fmtKg(w.kg)} kg</b>
          <button class="icon-btn sm" data-action="weight-del" data-date="${w.date}" aria-label="Supprimer">${icon('trash')}</button></div>`).join('')}</div>` : ''}
      <div class="muted small">Pèse-toi le matin à jeun, dans les mêmes conditions, 1 à 2 fois par semaine.</div>
    </section>`;
}

function statsKeyCards() {
  return `
    <div class="sec-title">Exercices clés</div>
    <div class="grid-2">${KEY_EXERCISES.map(([id, label]) => {
      const st = exerciseStats(id);
      const bw = st.ex.bodyweight;
      const vals = st.points.map(p => bw && !p.maxWeight ? p.reps : p.maxWeight);
      const last = st.hist.length ? st.hist[st.hist.length - 1] : null;
      return `<button class="card card-tile tappable key-card ${statsEx === id ? 'sel' : ''}" data-action="stats-ex" data-id="${id}">
        <div class="eyebrow">${esc(label)}</div>
        <div class="tile-big sm">${last ? esc(bw && !st.bestWeight.weight ? st.bestReps.reps + ' reps' : shortWeight(id, st.bestWeight.weight)) : '—'}</div>
        <div class="muted small">${last ? 'Dernière : ' + esc(perfText(id, last.sets)) : 'Pas encore réalisé'}</div>
        ${sparkline(vals)}
      </button>`;
    }).join('')}</div>`;
}

function statsDetail() {
  const withHist = exercisesWithHistory();
  const all = Object.values(S.exercises).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (!statsEx) statsEx = withHist.includes(KEY_EXERCISES[0][0]) || !withHist.length ? KEY_EXERCISES[0][0] : withHist[0];
  const st = exerciseStats(statsEx);
  const bw = st.ex.bodyweight;
  const metrics = [['weight', bw ? 'Lest max' : 'Charge max'], ['volume', 'Volume'], ['reps', 'Reps totales']];
  const pts = st.points.map(p => ({ date: p.date, value: statsMetric === 'weight' ? p.maxWeight : statsMetric === 'volume' ? p.volume : p.reps }));
  const unit = statsMetric === 'reps' ? 'reps' : 'kg';
  const fmtSet = s => s ? `${shortWeight(statsEx, s.weight)} × ${s.reps}` : '—';
  return `
    <div class="sec-title" id="stats-detail">Détail par exercice</div>
    <section class="card">
      <select class="select" data-change="stats-ex">
        <optgroup label="Avec historique">${all.filter(e => withHist.includes(e.id)).map(e => `<option value="${e.id}" ${e.id === statsEx ? 'selected' : ''}>${esc(e.name)}</option>`).join('') || '<option disabled>Aucun pour l’instant</option>'}</optgroup>
        <optgroup label="Autres exercices">${all.filter(e => !withHist.includes(e.id)).map(e => `<option value="${e.id}" ${e.id === statsEx ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</optgroup>
      </select>
      <div class="seg seg-full">${metrics.map(([k, l]) => `<button class="seg-btn ${statsMetric === k ? 'on' : ''}" data-action="stats-metric" data-v="${k}">${l}</button>`).join('')}</div>
      ${lineChart(pts, { unit, decimals: statsMetric === 'weight' ? 2 : 0, label: st.ex.name, empty: 'Aucune séance enregistrée pour cet exercice' })}
      <div class="rec-grid">
        <div class="rec"><span class="lbl">${icon('trophy')} Meilleure charge</span><b>${st.bestWeight ? esc(fmtSet(st.bestWeight)) : '—'}</b></div>
        <div class="rec"><span class="lbl">${icon('bolt')} Meilleure série</span><b>${esc(fmtSet(st.bestSet))}</b></div>
        <div class="rec"><span class="lbl">${icon('target')} Max de reps</span><b>${esc(fmtSet(st.bestReps))}</b></div>
        <div class="rec"><span class="lbl">${icon('chart')} Volume total</span><b>${fmtNum(st.totalVolume, 0)} kg</b></div>
        <div class="rec"><span class="lbl">${icon('calendar')} Séances</span><b>${st.count}</b></div>
        <div class="rec"><span class="lbl">${icon('clock')} Dernière fois</span><b>${st.hist.length ? relDays(st.hist[st.hist.length - 1].date) : '—'}</b></div>
      </div>
      ${bw ? '<div class="muted small">Exercice au poids du corps : la charge affichée est le lest ajouté ; le volume inclut ton poids de corps.</div>' : ''}
    </section>`;
}

Views.stats = {
  tab: 'stats',
  render() {
    return {
      title: 'Progression', subtitle: 'Poids, régularité et performances',
      html: statsRegularity() + statsWeight() + statsKeyCards() + statsDetail(),
    };
  },
};

function weightSheet() {
  const cur = currentWeight();
  Sheet.open(`
    <h2 class="sheet-title">Nouvelle pesée</h2>
    <label class="field"><span>Poids (kg)</span>
      <input class="input input-xl" id="w-kg" type="text" inputmode="decimal" value="${String(cur).replace('.', ',')}" autocomplete="off"></label>
    <label class="field"><span>Date</span>
      <input class="input" id="w-date" type="date" value="${todayISO()}" max="${todayISO()}"></label>
    <button class="btn btn-primary btn-xl btn-block" data-action="weight-save">${icon('check')} Enregistrer</button>`);
  setTimeout(() => { const i = document.getElementById('w-kg'); if (i) { i.focus(); i.select(); } }, 250);
}

Object.assign(Actions, {
  'weight-add'() { weightSheet(); },
  'weight-save'() {
    const kg = num(document.getElementById('w-kg').value);
    const date = document.getElementById('w-date').value || todayISO();
    if (kg == null || kg < 30 || kg > 250) { toast('Entre un poids valide (en kg)'); return; }
    if (date > todayISO()) { toast('La date ne peut pas être dans le futur'); return; }
    S.weights = S.weights.filter(w => w.date !== date);
    S.weights.push({ date, kg: Math.round(kg * 10) / 10 });
    S.weights.sort((a, b) => a.date.localeCompare(b.date));
    saveState();
    Sheet.close();
    rerender();
    toast('Pesée enregistrée : ' + fmtKg(kg) + ' kg');
  },
  async 'weight-del'(el) {
    const ok = await confirmDialog({ title: 'Supprimer cette pesée ?', text: fmtDateLong(el.dataset.date), ok: 'Supprimer', danger: true });
    if (!ok) return;
    S.weights = S.weights.filter(w => w.date !== el.dataset.date);
    saveState(); rerender();
  },
  'stats-ex'(el) {
    statsEx = el.dataset.id;
    rerender();
    const d = document.getElementById('stats-detail');
    if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  'stats-metric'(el) { statsMetric = el.dataset.v; rerender(); },
});

Changes['stats-ex'] = el => { statsEx = el.value; rerender(); };
