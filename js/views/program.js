'use strict';
/* =========================================================
   PROGRAMME — planning hebdomadaire et éditeur de séances
   Les modifications manuelles sont toujours prioritaires.
   ========================================================= */

let exFormCtx = null; // { workoutId, index | null }

function daysOfWorkout(id) {
  return S.schedule.map((s, i) => s.workoutId === id ? i : -1).filter(i => i >= 0);
}

Views.program = {
  tab: 'program',
  render() {
    const list = S.workoutOrder.map(id => S.workouts[id]).filter(Boolean);
    const options = sel => `<option value="" ${!sel ? 'selected' : ''}>Repos</option>` +
      list.map(w => `<option value="${w.id}" ${w.id === sel ? 'selected' : ''}>${esc(w.name)}</option>`).join('');
    const sched = S.schedule.map((d, i) => `
      <div class="sched-row ${d.workoutId ? 'on' : ''}">
        <div class="sched-day">${DAY_NAMES[i]}</div>
        <div class="sched-fields">
          <select class="select" data-change="sched" data-i="${i}" aria-label="Séance du ${DAY_NAMES[i]}">${options(d.workoutId)}</select>
          <input class="input input-sm" data-change="sched-note" data-i="${i}" value="${esc(d.note)}" placeholder="Note (ex. EPS 2 h, foot…)" maxlength="40">
        </div>
      </div>`).join('');

    const cards = list.map(w => {
      const days = daysOfWorkout(w.id);
      return `<button class="card list-card tappable" data-action="go" data-to="workout/${w.id}">
        <div class="grow">
          <div class="card-title">${esc(w.name)}</div>
          <div class="muted small">${workoutMeta(w)}</div>
          <div class="day-tags">${days.length ? days.map(i => `<span class="badge b-red">${DAY_SHORT[i]}</span>`).join('') : '<span class="badge b-gray">Non planifiée</span>'}</div>
        </div>${icon('next')}
      </button>`;
    }).join('');

    return {
      title: 'Programme', subtitle: 'Ton planning et tes séances',
      html: `
        <div class="sec-title">Semaine type</div>
        <section class="card sched">${sched}</section>
        <div class="sec-title">Séances <span class="count">${list.length}</span></div>
        ${cards}
        <button class="btn btn-secondary btn-lg btn-block" data-action="w-new">${icon('plus')} Nouvelle séance</button>
        <div class="note-banner">${icon('info')} Tes modifications manuelles sont toujours prioritaires. L’adaptation automatique ne change que les charges et répétitions proposées : jamais les exercices, leur ordre ou le nombre de séries.</div>`,
    };
  },
};

Views.workout = {
  tab: 'program',
  render(id) {
    const w = S.workouts[id];
    if (!w) return { redirect: 'program' };
    const rows = w.exercises.map((e, i) => {
      const ex = getEx(e.exId);
      return `<div class="card ex-row">
        <button class="ex-row-main" data-action="ex-edit" data-i="${i}">
          <span class="ex-row-n">${i + 1}</span>
          <span class="grow"><span class="row-title">${esc(ex.name)}</span>
          <span class="muted small block">${e.sets} × ${e.repMin}–${e.repMax} · repos ${fmtClock(e.rest)} · ${EX_TYPES[ex.type] ? EX_TYPES[ex.type].label : ''}${ex.bodyweight ? ' · PDC' : ''}</span></span>
        </button>
        <div class="ex-row-actions">
          <button class="icon-btn sm" data-action="ex-move" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter">${icon('up')}</button>
          <button class="icon-btn sm" data-action="ex-move" data-i="${i}" data-d="1" ${i === w.exercises.length - 1 ? 'disabled' : ''} aria-label="Descendre">${icon('down')}</button>
          <button class="icon-btn sm" data-action="ex-edit" data-i="${i}" aria-label="Modifier">${icon('edit')}</button>
          <button class="icon-btn sm danger" data-action="ex-del" data-i="${i}" aria-label="Supprimer">${icon('trash')}</button>
        </div>
      </div>`;
    }).join('');

    return {
      title: w.name, subtitle: 'Modifier la séance', back: 'program',
      html: `
        <section class="card">
          <label class="field"><span>Nom de la séance</span>
            <input class="input" data-change="w-name" value="${esc(w.name)}" maxlength="60"></label>
          <label class="field"><span>Note / priorité</span>
            <textarea class="input" data-change="w-note" rows="2" maxlength="200" placeholder="Ex. priorité largeur du dos">${esc(w.note || '')}</textarea></label>
          <div class="field"><span>Jours de la semaine</span>
            <div class="day-chips">${DAY_SHORT.map((d, i) => `<button class="day-chip ${S.schedule[i].workoutId === id ? 'on' : ''}" data-action="w-day" data-i="${i}">${d}</button>`).join('')}</div>
            <small class="muted">Un jour = une séance. Choisir un jour ici remplace la séance prévue ce jour-là.</small>
          </div>
        </section>
        <div class="sec-title">Exercices <span class="count">${workoutMeta(w)}</span></div>
        ${rows || '<p class="muted center">Aucun exercice pour l’instant.</p>'}
        <button class="btn btn-secondary btn-lg btn-block" data-action="ex-add">${icon('plus')} Ajouter un exercice</button>
        <div class="btn-col">
          <button class="btn btn-primary btn-lg btn-block" data-action="start" data-id="${id}" ${w.exercises.length ? '' : 'disabled'}>${icon('play')} Lancer cette séance</button>
          <button class="btn btn-ghost btn-block" data-action="w-duplicate">Dupliquer la séance</button>
          <button class="btn btn-ghost btn-danger-text btn-block" data-action="w-delete">${icon('trash')} Supprimer la séance</button>
        </div>`,
    };
  },
};

/* ---------- Formulaire d'exercice ---------- */
function stepper(name, value, min, max, step, label, suffixId) {
  return `<div class="field"><span>${label}</span>
    <div class="stepper" data-min="${min}" data-max="${max}" data-step="${step}">
      <button type="button" class="mini-btn" data-action="step" data-d="-1" aria-label="Moins">${icon('minus')}</button>
      <input class="input" name="${name}" inputmode="numeric" value="${value}" ${suffixId ? `data-input="rest-label"` : ''}>
      <button type="button" class="mini-btn" data-action="step" data-d="1" aria-label="Plus">${icon('plus')}</button>
    </div>${suffixId ? `<small class="muted" id="${suffixId}">= ${fmtClock(value)}</small>` : ''}</div>`;
}

function openExerciseForm(workoutId, index) {
  exFormCtx = { workoutId, index };
  const w = S.workouts[workoutId];
  const entry = index != null ? w.exercises[index] : null;
  const ex = entry ? getEx(entry.exId) : null;
  const type = ex ? ex.type : 'compound';
  const names = Object.values(S.exercises).map(e => e.name).sort((a, b) => a.localeCompare(b, 'fr'));
  const incs = [0.5, 1, 1.25, 2, 2.5, 4, 5];
  const inc = ex ? ex.increment : 2;
  Sheet.open(`
    <h2 class="sheet-title">${entry ? 'Modifier' : 'Ajouter'} un exercice</h2>
    <div class="form" id="ex-form">
      <label class="field"><span>Nom de l’exercice</span>
        <input class="input" name="name" list="ex-names" value="${esc(ex ? ex.name : '')}" autocomplete="off" maxlength="60" data-change="ex-form-name" placeholder="Ex. Curl haltères">
        <datalist id="ex-names">${names.map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist></label>
      <div class="field"><span>Type (définit le repos conseillé)</span>
        <div class="seg seg-full" id="type-seg">${Object.entries(EX_TYPES).map(([k, t]) => `<button type="button" class="seg-btn ${type === k ? 'on' : ''}" data-action="form-type" data-v="${k}">${t.label}</button>`).join('')}</div>
        <input type="hidden" name="type" value="${type}"></div>
      <div class="field-grid">
        ${stepper('sets', entry ? entry.sets : 3, 1, 10, 1, 'Séries')}
        ${stepper('rest', entry ? entry.rest : S.settings.rest[type], 15, 600, 15, 'Repos (s)', 'rest-label')}
        ${stepper('repMin', entry ? entry.repMin : 8, 1, 100, 1, 'Reps min')}
        ${stepper('repMax', entry ? entry.repMax : 12, 1, 100, 1, 'Reps max')}
      </div>
      <label class="field"><span>Augmentation de charge proposée</span>
        <select class="select" name="increment">${incs.map(v => `<option value="${v}" ${v === inc ? 'selected' : ''}>+${fmtKg(v)} kg</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" name="bodyweight" ${ex && ex.bodyweight ? 'checked' : ''}>
        <span>Exercice au poids du corps <small class="muted block">La charge saisie correspond au lest ajouté (0 = sans lest).</small></span></label>
      <button class="btn btn-primary btn-xl btn-block" data-action="ex-save">${icon('check')} Enregistrer</button>
    </div>`);
}

function formEl(name) { return document.querySelector(`#ex-form [name="${name}"]`); }

Object.assign(Actions, {
  'w-new': async () => {
    const name = await promptDialog({ title: 'Nouvelle séance', placeholder: 'Ex. Bras + épaules', ok: 'Créer' });
    if (!name) return;
    const id = uid('w');
    S.workouts[id] = { id, name, note: '', exercises: [] };
    S.workoutOrder.push(id);
    saveState();
    go('workout', id);
  },
  'w-day'(el) {
    const id = currentRoute.param, i = +el.dataset.i;
    S.schedule[i].workoutId = S.schedule[i].workoutId === id ? null : id;
    saveState(); rerender();
  },
  'w-duplicate'() {
    const w = S.workouts[currentRoute.param];
    const id = uid('w');
    S.workouts[id] = { id, name: w.name + ' (copie)', note: w.note, exercises: w.exercises.map(e => Object.assign({}, e, { id: uid('e') })) };
    S.workoutOrder.splice(S.workoutOrder.indexOf(w.id) + 1, 0, id);
    saveState();
    toast('Séance dupliquée');
    go('workout', id);
  },
  async 'w-delete'() {
    const w = S.workouts[currentRoute.param];
    const ok = await confirmDialog({
      title: 'Supprimer cette séance ?',
      text: `« ${esc(w.name)} » sera retirée du programme et du planning. L’historique des séances déjà réalisées est conservé.`,
      ok: 'Supprimer', danger: true,
    });
    if (!ok) return;
    delete S.workouts[w.id];
    S.workoutOrder = S.workoutOrder.filter(x => x !== w.id);
    S.schedule.forEach(d => { if (d.workoutId === w.id) d.workoutId = null; });
    saveState();
    toast('Séance supprimée');
    go('program');
  },
  'ex-add'() { openExerciseForm(currentRoute.param, null); },
  'ex-edit'(el) { openExerciseForm(currentRoute.param, +el.dataset.i); },
  'ex-move'(el) {
    const w = S.workouts[currentRoute.param];
    const i = +el.dataset.i, j = i + (+el.dataset.d);
    if (j < 0 || j >= w.exercises.length) return;
    [w.exercises[i], w.exercises[j]] = [w.exercises[j], w.exercises[i]];
    saveState(); rerender();
  },
  async 'ex-del'(el) {
    const w = S.workouts[currentRoute.param];
    const e = w.exercises[+el.dataset.i];
    const ok = await confirmDialog({ title: 'Supprimer cet exercice ?', text: `« ${esc(exName(e.exId))} » sera retiré de cette séance. Son historique est conservé.`, ok: 'Supprimer', danger: true });
    if (!ok) return;
    w.exercises.splice(+el.dataset.i, 1);
    saveState(); rerender();
  },
  step(el) {
    const box = el.closest('.stepper');
    const input = box.querySelector('input');
    const step = +box.dataset.step;
    const v = clamp((num(input.value) || 0) + step * (+el.dataset.d), +box.dataset.min, +box.dataset.max);
    input.value = v;
    if (input.name === 'rest') Inputs['rest-label'](input);
  },
  'form-type'(el) {
    document.querySelectorAll('#type-seg .seg-btn').forEach(b => b.classList.toggle('on', b === el));
    formEl('type').value = el.dataset.v;
    const rest = formEl('rest');
    rest.value = S.settings.rest[el.dataset.v];
    Inputs['rest-label'](rest);
  },
  'ex-save'() {
    const name = formEl('name').value.trim();
    const sets = Math.round(num(formEl('sets').value));
    const repMin = Math.round(num(formEl('repMin').value));
    const repMax = Math.round(num(formEl('repMax').value));
    const rest = Math.round(num(formEl('rest').value));
    const type = formEl('type').value;
    const increment = num(formEl('increment').value) || 2;
    const bodyweight = formEl('bodyweight').checked;
    if (!name) { toast('Donne un nom à l’exercice'); formEl('name').focus(); return; }
    if (!(sets >= 1 && sets <= 10)) { toast('Séries : entre 1 et 10'); return; }
    if (!(repMin >= 1 && repMax >= repMin && repMax <= 100)) { toast('Plage de reps invalide (min ≤ max)'); return; }
    if (!(rest >= 15 && rest <= 600)) { toast('Repos : entre 15 s et 10 min'); return; }
    const exId = upsertExercise(name, { type, increment, bodyweight });
    const w = S.workouts[exFormCtx.workoutId];
    if (exFormCtx.index != null) {
      Object.assign(w.exercises[exFormCtx.index], { exId, sets, repMin, repMax, rest });
    } else {
      w.exercises.push({ id: uid('e'), exId, sets, repMin, repMax, rest });
    }
    saveState();
    Sheet.close();
    rerender();
    toast('Exercice enregistré');
  },
});

Inputs['rest-label'] = el => {
  const lab = document.getElementById('rest-label');
  if (lab) lab.textContent = '= ' + fmtClock(num(el.value) || 0);
};

/** Nom d'un exercice existant → on reprend ses réglages. */
Changes['ex-form-name'] = el => {
  const ex = S.exercises[slugify(el.value)];
  if (!ex) return;
  document.querySelectorAll('#type-seg .seg-btn').forEach(b => b.classList.toggle('on', b.dataset.v === ex.type));
  formEl('type').value = ex.type;
  formEl('increment').value = String(ex.increment);
  formEl('bodyweight').checked = !!ex.bodyweight;
};

Object.assign(Changes, {
  sched(el) {
    S.schedule[+el.dataset.i].workoutId = el.value || null;
    saveState(); rerender();
    toast(DAY_NAMES[+el.dataset.i] + ' : ' + (el.value ? S.workouts[el.value].name : 'repos'));
  },
  'sched-note'(el) {
    S.schedule[+el.dataset.i].note = el.value.trim();
    saveState();
    toast('Note enregistrée');
  },
  'w-name'(el) {
    const v = el.value.trim();
    if (!v) { el.value = S.workouts[currentRoute.param].name; return; }
    S.workouts[currentRoute.param].name = v;
    saveState(); rerender();
    toast('Séance renommée');
  },
  'w-note'(el) {
    S.workouts[currentRoute.param].note = el.value.trim();
    saveState();
    toast('Note enregistrée');
  },
});
