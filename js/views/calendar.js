'use strict';
/* =========================================================
   CALENDRIER — programme prévu + historique
   ========================================================= */

let calCursor = null; // { y, m }

function sessionDetailHtml(s) {
  const t = sessionTotals(s);
  return `
    <div class="card card-flat">
      <div class="row-between">
        <div class="row-title">${esc(s.workoutName)}</div>
        ${statusBadge(s.status === 'completed' ? 'done' : 'partial')}
      </div>
      <div class="mini-stats">
        <span>${icon('clock')} ${fmtDuration(s.duration || 0)}</span>
        <span>${t.setsDone}/${t.setsTotal} séries</span>
        <span>${t.reps} reps</span>
        <span>${fmtNum(t.volume, 0)} kg</span>
      </div>
      ${s.exercises.map(e => {
        const d = doneSets(e);
        return `<div class="perf-row">
          <div class="perf-name">${esc(e.name || exName(e.exId))}</div>
          <div class="perf-sets">${d.length
            ? d.map(x => `<span>${esc(shortWeight(e.exId, x.weight || 0))} × ${x.reps}${x.rir != null ? ` <i>RIR ${x.rir}</i>` : ''}</span>`).join('')
            : '<span class="muted">non fait</span>'}</div>
        </div>`;
      }).join('')}
      <button class="btn btn-ghost btn-sm btn-danger-text" data-action="session-delete" data-id="${s.id}">${icon('trash')} Supprimer cette séance</button>
    </div>`;
}

function daySheetHtml(iso) {
  const info = dayInfo(iso);
  const today = todayISO();
  let h = `<div class="sheet-eyebrow">${statusBadge(info.status)}${iso === today ? ' <span class="badge b-outline">Aujourd’hui</span>' : ''}</div>
    <h2 class="sheet-title">${fmtDateLong(iso)}</h2>`;
  if (info.note) h += `<div class="note-chip">${icon('bolt')} ${esc(info.note)}</div>`;

  if (info.planned) {
    const w = S.workouts[info.planned];
    h += `<div class="sec-title">Programme prévu</div>
      <div class="card card-flat">
        <div class="row-title">${esc(w.name)}</div>
        <div class="muted small">${workoutMeta(w)}</div>
        <ul class="ex-list">${w.exercises.map(e => `<li><span>${esc(exName(e.exId))}</span><b>${e.sets} × ${e.repMin}–${e.repMax}</b></li>`).join('')}</ul>
      </div>`;
    if (iso === today && !S.active && info.status !== 'done') {
      h += `<button class="btn btn-primary btn-lg btn-block" data-action="start" data-id="${w.id}">${icon('play')} COMMENCER LA SÉANCE</button>`;
    }
  } else {
    h += `<p class="muted">Repos prévu ce jour-là.</p>`;
  }
  if (info.status === 'missed') h += `<div class="note-banner warn">${icon('info')} Séance prévue non réalisée.</div>`;
  if (info.sessions.length) {
    h += `<div class="sec-title">Performances enregistrées</div>` + info.sessions.map(sessionDetailHtml).join('');
  }
  return h;
}

Views.calendar = {
  tab: 'calendar',
  render() {
    const today = todayISO();
    if (!calCursor) { const d = parseISO(today); calCursor = { y: d.getFullYear(), m: d.getMonth() }; }
    const { y, m } = calCursor;
    const firstIso = toISO(new Date(y, m, 1));
    const nDays = new Date(y, m + 1, 0).getDate();
    const offset = weekdayIdx(firstIso);
    const counts = { done: 0, partial: 0, missed: 0, planned: 0 };

    let cells = '';
    for (let i = 0; i < offset; i++) cells += '<div class="cal-cell empty"></div>';
    for (let d = 1; d <= nDays; d++) {
      const iso = toISO(new Date(y, m, d));
      const info = dayInfo(iso);
      if (counts[info.status] != null) counts[info.status]++;
      let mark = '';
      if (info.status === 'done') mark = icon('check');
      else if (info.status === 'partial') mark = '½';
      else if (info.status === 'missed') mark = icon('close');
      else if (info.status === 'planned' || info.status === 'none') mark = '<i class="cal-bar"></i>';
      else if (info.note) mark = `<span class="cal-note">${esc(info.note.split(/[\s(]/)[0].slice(0, 4))}</span>`;
      cells += `<button class="cal-cell st-${info.status} ${iso === today ? 'today' : ''}" data-action="cal-open" data-iso="${iso}" aria-label="${fmtDateLong(iso)}">
        <span class="cal-num">${d}</span><span class="cal-mark">${mark}</span></button>`;
    }

    const isCurrent = today.slice(0, 7) === firstIso.slice(0, 7);
    const html = `
      <div class="cal-nav">
        <button class="icon-btn" data-action="cal-nav" data-d="-1" aria-label="Mois précédent">${icon('back')}</button>
        <div class="cal-month">${MONTH_NAMES[m]} ${y}</div>
        <button class="icon-btn" data-action="cal-nav" data-d="1" aria-label="Mois suivant">${icon('next')}</button>
      </div>
      ${isCurrent ? '' : '<button class="link-btn center" data-action="cal-today">Revenir à aujourd’hui</button>'}
      <div class="cal-grid cal-head">${DAY_LETTER.map(l => `<div>${l}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <div class="legend">
        <span><i class="lg lg-planned"></i>Prévue</span>
        <span><i class="lg lg-done"></i>Terminée</span>
        <span><i class="lg lg-partial"></i>Non terminée</span>
        <span><i class="lg lg-missed"></i>Manquée</span>
        <span><i class="lg lg-rest"></i>Repos</span>
      </div>
      <div class="stat-grid">
        <div class="stat"><span class="lbl">Terminées</span><b class="txt-green">${counts.done}</b></div>
        <div class="stat"><span class="lbl">Non terminées</span><b class="txt-amber">${counts.partial}</b></div>
        <div class="stat"><span class="lbl">Manquées</span><b>${counts.missed}</b></div>
        <div class="stat"><span class="lbl">À venir</span><b class="txt-red">${counts.planned}</b></div>
      </div>
      <p class="muted small center">Touche un jour pour voir le programme prévu et tes performances.</p>`;
    return { title: 'Calendrier', subtitle: 'Programme prévu & séances réalisées', html };
  },
};

Object.assign(Actions, {
  'cal-open'(el) { Sheet.open(daySheetHtml(el.dataset.iso)); },
  'cal-nav'(el) {
    const d = new Date(calCursor.y, calCursor.m + (+el.dataset.d), 1);
    calCursor = { y: d.getFullYear(), m: d.getMonth() };
    rerender();
  },
  'cal-today'() { calCursor = null; rerender(); },
  async 'session-delete'(el) {
    const s = S.sessions.find(x => x.id === el.dataset.id);
    if (!s) return;
    const ok = await confirmDialog({
      title: 'Supprimer cette séance ?',
      text: `${esc(s.workoutName)} du ${fmtDateShort(s.date)} sera définitivement supprimée de l’historique.`,
      ok: 'Supprimer', danger: true,
    });
    if (!ok) return;
    S.sessions = S.sessions.filter(x => x.id !== s.id);
    saveState();
    Sheet.close();
    rerender();
    toast('Séance supprimée');
  },
});
