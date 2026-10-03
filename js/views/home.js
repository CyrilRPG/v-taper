'use strict';
/* =========================================================
   ACCUEIL — dashboard
   ========================================================= */

const TIPS = [
  'Privilégie une technique propre, une progression progressive et une récupération suffisante.',
  'Dors 8 à 10 h par nuit : c’est pendant le sommeil que le muscle se construit.',
  'Pour prendre du poids : 3 repas + 1 à 2 collations, des protéines à chaque repas et assez de glucides.',
  'Garde 1 à 3 répétitions en réserve sur la plupart des séries. Inutile d’aller à l’échec à chaque fois.',
  'Tractions : amplitude complète, bras tendus en bas, coudes tirés vers les hanches pour cibler la largeur.',
  'Élévations latérales : charge modérée et mouvement contrôlé. La technique compte plus que le poids.',
  'Échauffe-toi 5 à 10 min et fais 1 à 2 séries légères avant les exercices lourds.',
  'Une douleur articulaire n’est pas normale : arrête l’exercice et parles-en à un adulte ou à un professionnel de santé.',
  'La régularité bat l’intensité : mieux vaut 4 bonnes séances chaque semaine que 6 séances bâclées.',
  'Bois de l’eau régulièrement, surtout les jours d’EPS et d’entraînement.',
];

function tipOfDay() {
  const d = parseISO(todayISO());
  const start = new Date(d.getFullYear(), 0, 0);
  return TIPS[Math.floor((d - start) / 86400000) % TIPS.length];
}

function homeActiveBanner() {
  const a = S.active;
  const t = sessionTotals(a);
  const stale = a.date !== todayISO();
  return `
    <section class="card card-live">
      <div class="live-row"><span class="live-dot"></span>
        <span class="eyebrow">${stale ? 'Séance non terminée · ' + esc(fmtDateShort(a.date)) : 'Séance en cours'}</span></div>
      <div class="live-title">${esc(a.workoutName)}</div>
      <div class="muted">${t.setsDone}/${t.setsTotal} séries faites</div>
      ${progressBar(t.setsTotal ? t.setsDone / t.setsTotal * 100 : 0)}
      <button class="btn btn-primary btn-lg btn-block" data-action="go" data-to="session">${icon('play')} REPRENDRE LA SÉANCE</button>
      ${stale ? `<div class="btn-row">
        <button class="btn btn-secondary" data-action="go" data-to="summary">Terminer &amp; enregistrer</button>
        <button class="btn btn-ghost" data-action="abandon">Abandonner</button></div>` : ''}
    </section>`;
}

function homeHero(today, info) {
  const dow = weekdayIdx(today);
  const doneToday = info.sessions.find(s => s.status === 'completed');
  if (info.planned) {
    const w = S.workouts[info.planned];
    const last = lastSessionOfWorkout(w.id);
    let cta;
    if (doneToday) {
      cta = `<div class="hero-done">${icon('check')} Séance du jour terminée</div>
        <button class="btn btn-secondary btn-block" data-action="cal-open" data-iso="${today}">Voir le détail</button>`;
    } else if (S.active) {
      cta = '';
    } else {
      cta = `<button class="btn btn-primary btn-xl btn-block" data-action="start" data-id="${w.id}">${icon('play')} COMMENCER LA SÉANCE</button>`;
    }
    return `
      <section class="hero">
        <div class="hero-day">${DAY_NAMES[dow].toUpperCase()}</div>
        <h1 class="hero-title">${esc(w.name)}</h1>
        <div class="hero-meta">${workoutMeta(w)}</div>
        <div class="hero-last">${icon('clock')} Dernière séance : <b>${last ? relDays(last.date) : 'jamais réalisée'}</b></div>
        ${w.note ? `<div class="hero-note">${esc(w.note)}</div>` : ''}
        <div class="chips">${w.exercises.map(e => `<span class="chip">${esc(exName(e.exId))}</span>`).join('')}</div>
        ${cta}
        ${S.active ? '' : '<button class="link-btn" data-action="pick-workout">Lancer une autre séance</button>'}
      </section>`;
  }
  const nxt = nextPlanned(today);
  return `
    <section class="hero hero-rest">
      <div class="hero-day">${DAY_NAMES[dow].toUpperCase()}</div>
      <h1 class="hero-title">JOUR DE REPOS</h1>
      ${info.note ? `<div class="note-chip">${icon('bolt')} ${esc(info.note)}</div>` : '<div class="hero-meta">Récupère : c’est là que le muscle se construit.</div>'}
      ${doneToday ? `<div class="hero-done">${icon('check')} Séance bonus réalisée : ${esc(doneToday.workoutName)}</div>` : ''}
      ${nxt ? `<div class="hero-last">Prochaine séance : <b>${DAY_NAMES[weekdayIdx(nxt.iso)]} · ${esc(S.workouts[nxt.workoutId].name)}</b></div>` : ''}
      ${S.active ? '' : `<button class="btn btn-secondary btn-lg btn-block" data-action="pick-workout">${icon('play')} Lancer une séance quand même</button>`}
    </section>`;
}

function homeWeek(today) {
  const ws = weekStart(today);
  const st = weekStats(ws);
  const streak = weekStreak();
  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(ws, i);
    const info = dayInfo(iso);
    const mark = info.status === 'done' ? icon('check') : info.status === 'missed' ? icon('close') : info.status === 'partial' ? '½' : DAY_LETTER[i];
    return `<button class="wday st-${info.status} ${iso === today ? 'today' : ''}" data-action="cal-open" data-iso="${iso}" aria-label="${DAY_NAMES[i]}">
      <span class="wday-dot">${mark}</span><span class="wday-l">${DAY_SHORT[i]}</span></button>`;
  }).join('');
  const pct = st.planned ? st.done / st.planned * 100 : 0;
  return `
    <section class="card">
      <div class="card-head">
        <div><div class="eyebrow">Progression de la semaine</div>
        <div class="card-title">Séances réalisées : ${st.done}/${st.planned}</div></div>
        <div class="streak">${icon('flame')}<b>${streak}</b><small>sem.</small></div>
      </div>
      ${progressBar(pct, st.done >= st.planned && st.planned ? 'pbar-green' : '')}
      <div class="week-strip">${days}</div>
    </section>`;
}

function homeLastSession() {
  const s = lastSession();
  if (!s) {
    return `<section class="card card-tile">
      <div class="eyebrow">Dernière séance</div>
      <div class="tile-big muted">—</div>
      <div class="muted small">Aucune séance enregistrée pour l’instant.</div></section>`;
  }
  const t = sessionTotals(s);
  return `<section class="card card-tile tappable" data-action="cal-open" data-iso="${s.date}">
    <div class="eyebrow">Dernière séance</div>
    <div class="tile-title">${esc(s.workoutName)}</div>
    <div class="muted small">${relDays(s.date).replace(/^./, c => c.toUpperCase())} · ${fmtDuration(s.duration || 0)}</div>
    <div class="tile-row">${statusBadge(s.status === 'completed' ? 'done' : 'partial')}<span class="small">${t.setsDone} séries · ${fmtNum(t.volume, 0)} kg</span></div>
  </section>`;
}

function homeWeight() {
  const p = S.profile;
  const cur = currentWeight();
  const span = p.targetWeight - p.startWeight;
  const pct = span ? (cur - p.startWeight) / span * 100 : 100;
  const rest = p.targetWeight - cur;
  return `<section class="card card-tile">
    <div class="card-head tight"><div class="eyebrow">Poids actuel</div>
      <button class="icon-btn sm accent" data-action="weight-add" aria-label="Ajouter une pesée">${icon('plus')}</button></div>
    <div class="tile-big">${fmtKg(cur)}<small> kg</small></div>
    ${progressBar(pct)}
    <div class="muted small">${fmtKg(p.startWeight)} → <b class="txt">${fmtKg(p.targetWeight)} kg</b> · ${rest > 0 ? 'reste ' + fmtKg(rest) + ' kg' : 'objectif atteint 🎯'}</div>
  </section>`;
}

Views.home = {
  tab: 'home',
  render() {
    const today = todayISO();
    const info = dayInfo(today);
    const hello = S.profile.name ? 'Salut ' + S.profile.name : 'V-TAPER';
    const html = `
      ${S.active ? homeActiveBanner() : ''}
      ${homeHero(today, info)}
      ${homeWeek(today)}
      <div class="grid-2">${homeLastSession()}${homeWeight()}</div>
      <section class="card card-tip">${icon('info')}<p>${esc(tipOfDay())}</p></section>`;
    return { title: hello, subtitle: fmtDateLong(today), html };
  },
};

Actions['pick-workout'] = () => {
  const today = plannedFor(todayISO());
  const list = S.workoutOrder.map(id => S.workouts[id]).filter(Boolean);
  Sheet.open(`
    <h2 class="sheet-title">Choisir une séance</h2>
    <div class="list">
      ${list.map(w => `
        <button class="list-item" data-action="start" data-id="${w.id}">
          <div><div class="row-title">${esc(w.name)}${w.id === today ? ' <span class="badge b-red">Aujourd’hui</span>' : ''}</div>
          <div class="muted small">${workoutMeta(w)}</div></div>
          ${icon('play', 'accent')}
        </button>`).join('') || '<p class="muted">Aucune séance. Crée-en une dans l’onglet Programme.</p>'}
    </div>`);
};
