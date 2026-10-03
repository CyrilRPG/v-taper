'use strict';
/* =========================================================
   ENGINE — historique, progression automatique, statistiques
   ========================================================= */

function getEx(exId) {
  return S.exercises[exId] || { id: exId, name: exId, type: 'compound', increment: 2, bodyweight: false };
}
function exName(exId) { return getEx(exId).name; }

function currentWeight() {
  return S.weights.length ? S.weights[S.weights.length - 1].kg : S.profile.startWeight;
}
function bodyWeightAt(iso) {
  let w = S.profile.startWeight;
  for (const e of S.weights) { if (e.date <= iso) w = e.kg; else break; }
  return w;
}

function doneSets(entry) {
  return (entry.sets || []).filter(s => s.done && s.reps > 0);
}
function sumReps(sets) { return sets.reduce((a, s) => a + (s.reps || 0), 0); }

/** Charge réelle d'une série : poids du corps + lest pour les exercices au poids du corps. */
function setLoad(set, exId, iso) {
  return getEx(exId).bodyweight ? bodyWeightAt(iso) + (set.weight || 0) : (set.weight || 0);
}
function setsVolume(sets, exId, iso) {
  return sets.reduce((a, s) => a + setLoad(s, exId, iso) * s.reps, 0);
}

/** Charge de travail = charge la plus utilisée (égalité → la plus lourde). */
function workingWeight(sets) {
  const count = new Map();
  sets.forEach(s => { const w = s.weight || 0; count.set(w, (count.get(w) || 0) + 1); });
  let best = 0, bestN = -1;
  count.forEach((n, w) => { if (n > bestN || (n === bestN && w > best)) { best = w; bestN = n; } });
  return best;
}

function weightLabel(exId, w) {
  if (getEx(exId).bodyweight) return w ? 'PDC + ' + fmtKg(w) + ' kg' : 'poids du corps';
  return fmtKg(w) + ' kg';
}
function shortWeight(exId, w) {
  if (getEx(exId).bodyweight) return w ? 'PDC +' + fmtKg(w) + ' kg' : 'PDC';
  return fmtKg(w) + ' kg';
}

/** Historique d'un exercice : séances (terminées ou non) où au moins une série a été faite. */
function exerciseHistory(exId, opts) {
  opts = opts || {};
  const out = [];
  for (const s of S.sessions) {
    if (opts.excludeId && s.id === opts.excludeId) continue;
    if (opts.before != null && (s.startedAt || 0) >= opts.before) continue;
    for (const e of s.exercises) {
      if (e.exId !== exId) continue;
      const sets = doneSets(e);
      if (sets.length) out.push({ session: s, date: s.date, sets, target: e.target, feeling: e.feeling || null });
    }
  }
  return out.sort((a, b) => (a.session.startedAt || 0) - (b.session.startedAt || 0));
}

function lastPerformance(exId, opts) {
  const h = exerciseHistory(exId, opts);
  return h.length ? h[h.length - 1] : null;
}

/** Texte compact d'une performance : "22 kg — 10 / 9 / 8 / 8" (ou détail si charges différentes). */
function perfText(exId, sets) {
  if (!sets.length) return '—';
  const same = sets.every(s => (s.weight || 0) === (sets[0].weight || 0));
  if (same) return shortWeight(exId, sets[0].weight || 0) + ' — ' + sets.map(s => s.reps).join(' / ');
  return sets.map(s => shortWeight(exId, s.weight || 0) + ' × ' + s.reps).join(' · ');
}

/* ---------------------------------------------------------
   PROGRESSION AUTOMATIQUE (double progression)
   Ne modifie QUE la charge et les répétitions conseillées.
   Jamais les exercices, leur ordre ou le nombre de séries.
   --------------------------------------------------------- */
function recommend(exId, target, opts) {
  const ex = getEx(exId);
  const n = target.sets, repMin = target.repMin, repMax = target.repMax;
  const inc = ex.increment || 2;
  const hist = exerciseHistory(exId, opts);

  if (!hist.length) {
    return {
      kind: 'new', weight: ex.bodyweight ? 0 : null, lastWeight: null, lastTotal: 0,
      repTargets: Array(n).fill(repMin),
      title: 'Première fois',
      text: ex.bodyweight
        ? `Fais ${n} séries de ${repMin}–${repMax} reps au poids du corps. Technique propre, amplitude complète.`
        : `Choisis une charge qui te permet ${repMin}–${repMax} reps en gardant 2–3 reps en réserve (RIR 2–3).`,
      goal: `${n} × ${repMin}–${repMax}`,
    };
  }

  const last = hist[hist.length - 1];
  const all = last.sets;
  const w = workingWeight(all);
  const wl = weightLabel(exId, w);
  const pdc = ex.bodyweight && !w;
  const sw = shortWeight(exId, w);
  const atW = pdc ? 'au poids du corps' : 'à ' + wl;
  const keepW = pdc ? 'Reste au poids du corps' : 'Garde ' + wl;
  const complete = all.length >= n;
  const sets = complete ? all.slice(0, n) : all;
  const reps = sets.map(s => s.reps);
  const total = sumReps(sets);
  const avg = total / sets.length;
  const rirs = sets.map(s => s.rir).filter(r => r != null);
  const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const allTop = complete && sets.every(s => s.reps >= repMax && (s.weight || 0) >= w);

  // Séances consécutives à la même charge, pour détecter une baisse
  const sameW = [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (workingWeight(hist[i].sets) !== w) break;
    sameW.unshift(hist[i]);
  }
  const avgOf = h => sumReps(h.sets) / h.sets.length;
  let declines = 0;
  for (let i = sameW.length - 1; i > 0; i--) {
    if (avgOf(sameW[i]) < avgOf(sameW[i - 1]) - 0.01) declines++; else break;
  }
  const prev = sameW.length >= 2 ? sameW[sameW.length - 2] : null;
  const strongDrop = !!prev && avg < avgOf(prev) * 0.85;
  const isBelowMin = h => h.sets.filter(s => s.reps < repMin).length >= Math.ceil(h.sets.length / 2);
  const belowMin = isBelowMin({ sets });
  const prevBelowMin = !!prev && isBelowMin(prev);
  const persistentDrop = declines >= 2 && avg <= avgOf(sameW[sameW.length - 1 - declines]) * 0.9;

  const base = { weight: w, lastWeight: w, lastTotal: total, lastReps: reps };
  const fill = v => Array(n).fill(Math.min(v, repMax));

  // 1) Haut de fourchette atteint partout → augmenter (si pas à l'échec)
  if (allTop) {
    if ((avgRir != null && avgRir < 1) || last.feeling === 'max') {
      return Object.assign(base, {
        kind: 'hold', repTargets: fill(repMax), title: 'Confirme avant d’augmenter',
        text: `Tu as atteint ${repMax} reps partout, mais à l’échec. Refais-les ${atW} en gardant 1–2 reps en réserve avant d’augmenter.`,
        goal: `${sw} × ${repMax} (RIR 1–2)`,
      });
    }
    const nw = roundTo(w + inc);
    const lo = Math.min(repMin + 2, repMax);
    return Object.assign(base, {
      kind: 'increase', weight: nw, repTargets: fill(repMin + 1), title: 'Augmentation recommandée',
      text: ex.bodyweight
        ? `Tu as atteint ${repMax} reps sur toutes tes séries. Ajoute un lest léger : +${fmtKg(inc)} kg, puis repars autour de ${repMin}–${lo} reps.`
        : `Tu as atteint ${repMax} reps sur toutes tes séries. Augmentation recommandée : +${fmtKg(inc)} kg (${fmtKg(w)} → ${fmtKg(nw)} kg). Repars autour de ${repMin}–${lo} reps.`,
      goal: `${shortWeight(exId, nw)} × ${repMin}–${lo}`,
    });
  }

  // 2) Baisse persistante (ou 2 séances sous la fourchette) → réduire légèrement
  if (persistentDrop || (belowMin && prevBelowMin)) {
    const why = persistentDrop
      ? `Tes répétitions baissent depuis ${declines + 1} séances ${atW}.`
      : `Deux séances de suite sous ${repMin} reps ${atW}.`;
    if (w > 0) {
      const nw = Math.max(0, roundTo(w - inc));
      return Object.assign(base, {
        kind: 'decrease', weight: nw, repTargets: fill(repMin + 1), title: 'Réduction conseillée',
        text: `${why} ${ex.bodyweight && !nw ? 'Retire le lest' : 'Réduis légèrement à ' + weightLabel(exId, nw)} pour retravailler proprement dans ta fourchette, puis remonte.`,
        goal: `${shortWeight(exId, nw)} × ${repMin}–${Math.min(repMin + 2, repMax)}`,
      });
    }
    return Object.assign(base, {
      kind: 'hold', repTargets: fill(repMin), title: 'Garde le poids du corps',
      text: `${why} Fais des séries propres même si elles sont courtes. Si besoin, utilise un élastique d’assistance. Pense à bien récupérer.`,
      goal: `${n} × ${repMin}+`,
    });
  }

  // 3) Toutes les séries non faites la dernière fois
  if (!complete) {
    return Object.assign(base, {
      kind: 'hold', repTargets: Array.from({ length: n }, (_, i) => reps[i] != null ? Math.min(reps[i], repMax) : repMin),
      title: 'Garde la charge',
      text: `La dernière fois : ${all.length}/${n} séries. ${keepW} et complète toutes tes séries.`,
      goal: `${sw} × ${n} séries`,
    });
  }

  // 4) Forte baisse ponctuelle → ne pas augmenter
  if (strongDrop) {
    return Object.assign(base, {
      kind: 'hold', repTargets: Array.from({ length: n }, (_, i) => Math.min(Math.max(prev.sets[i] ? prev.sets[i].reps : repMin, repMin), repMax)),
      title: 'Pas d’augmentation',
      text: `Performance en baisse par rapport à la séance d’avant (${sumReps(prev.sets)} → ${total} reps). ${keepW} : soigne ton sommeil, ton alimentation et ta récupération.`,
      goal: `${sw} × ${sumReps(prev.sets)}+ reps au total`,
    });
  }

  // 5) Sous la fourchette une fois → garder et viser le minimum
  if (belowMin) {
    return Object.assign(base, {
      kind: 'hold', repTargets: fill(repMin), title: 'Garde la charge',
      text: `${keepW} et vise au moins ${repMin} reps par série. Si ça ne passe toujours pas la prochaine fois, une légère baisse sera proposée.`,
      goal: `${sw} × ${repMin}+`,
    });
  }

  // 6) Cas général : garder la charge et battre le total de reps
  const targets = Array.from({ length: n }, (_, i) => reps[i] != null ? reps[i] : repMin);
  let idx = -1;
  targets.forEach((r, i) => { if (r < repMax && (idx < 0 || r <= targets[idx])) idx = i; });
  if (idx >= 0) targets[idx] += 1;
  return Object.assign(base, {
    kind: 'hold', repTargets: targets.map(r => Math.min(r, repMax)), title: 'Garde la charge',
    text: `${keepW}. Essaie de dépasser tes ${total} reps totales.`,
    goal: `${sw} × ${targets.join(' / ')} (${total + 1}+ reps)`,
  });
}

/* ---------- Séance en cours ---------- */
function createSession(workoutId) {
  const w = S.workouts[workoutId];
  return {
    id: uid('s'), workoutId, workoutName: w.name,
    date: todayISO(), startedAt: Date.now(), endedAt: null, status: 'active',
    current: 0, feeling: null, timer: null,
    exercises: w.exercises.map(e => {
      const target = { sets: e.sets, repMin: e.repMin, repMax: e.repMax };
      const rec = recommend(e.exId, target);
      const changes = rec.kind === 'increase' || rec.kind === 'decrease';
      const startW = changes ? rec.lastWeight : rec.weight;
      return {
        exId: e.exId, entryId: e.id, name: exName(e.exId), target, rest: e.rest,
        rec, recStatus: changes ? 'pending' : null, feeling: null,
        sets: Array.from({ length: e.sets }, (_, i) => ({
          weight: startW, reps: null, rir: null, done: false, hint: rec.repTargets[i] || e.repMin,
        })),
      };
    }),
  };
}

function sessionTotals(session) {
  let setsDone = 0, setsTotal = 0, reps = 0, volume = 0;
  session.exercises.forEach(e => {
    setsTotal += e.sets.length;
    const d = doneSets(e);
    setsDone += d.length;
    reps += sumReps(d);
    volume += setsVolume(d, e.exId, session.date);
  });
  return { setsDone, setsTotal, reps, volume: Math.round(volume) };
}

/** Compare un exercice d'une séance avec sa performance précédente. */
function compareExercise(entry, session) {
  const sets = doneSets(entry);
  if (!sets.length) return { status: 'skipped', text: 'Non réalisé' };
  const prev = lastPerformance(entry.exId, { before: session.startedAt, excludeId: session.id });
  if (!prev) return { status: 'new', text: 'Première fois' };
  const cw = workingWeight(sets), pw = workingWeight(prev.sets);
  const cr = sumReps(sets), pr = sumReps(prev.sets);
  const cv = setsVolume(sets, entry.exId, session.date), pv = setsVolume(prev.sets, entry.exId, prev.date);
  let status, text;
  if (cw > pw) { status = 'up'; text = `${shortWeight(entry.exId, pw)} → ${shortWeight(entry.exId, cw)}`; }
  else if (cw < pw) {
    status = cv > pv ? 'up' : 'down';
    text = `${shortWeight(entry.exId, pw)} → ${shortWeight(entry.exId, cw)}, ${cr} reps`;
  } else if (cr > pr) { status = 'up'; text = `+${cr - pr} rep${cr - pr > 1 ? 's' : ''} à ${shortWeight(entry.exId, cw)}`; }
  else if (cr === pr) { status = 'same'; text = `${cr} reps à ${shortWeight(entry.exId, cw)}`; }
  else { status = 'down'; text = `−${pr - cr} rep${pr - cr > 1 ? 's' : ''} à ${shortWeight(entry.exId, cw)}`; }
  return { status, text, prev };
}

function lastSessionOfWorkout(workoutId, beforeTs) {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const s = S.sessions[i];
    if (s.workoutId === workoutId && (beforeTs == null || s.startedAt < beforeTs)) return s;
  }
  return null;
}
function lastSession() { return S.sessions.length ? S.sessions[S.sessions.length - 1] : null; }

/* ---------- Calendrier & régularité ---------- */
function plannedFor(iso) {
  const sch = S.schedule[weekdayIdx(iso)];
  return sch && sch.workoutId && S.workouts[sch.workoutId] ? sch.workoutId : null;
}

/**
 * Statut d'un jour :
 * done (séance terminée) · partial (non terminée) · planned (prévue, aujourd'hui ou futur)
 * missed (prévue, passée, non faite) · rest (repos prévu) · none (avant le début du suivi)
 */
function dayInfo(iso) {
  const sessions = S.sessions.filter(s => s.date === iso);
  const planned = plannedFor(iso);
  const note = S.schedule[weekdayIdx(iso)].note || '';
  const today = todayISO();
  let status;
  if (sessions.some(s => s.status === 'completed')) status = 'done';
  else if (sessions.some(s => s.status === 'partial')) status = 'partial';
  else if (!planned) status = 'rest';
  else if (iso < S.createdAt) status = 'none';
  else if (iso < today) status = 'missed';
  else status = 'planned';
  return { iso, sessions, planned, note, status };
}

function weekStats(startIso) {
  let planned = 0, done = 0, missed = 0;
  for (let i = 0; i < 7; i++) {
    const iso = addDays(startIso, i);
    if (plannedFor(iso) && iso >= S.createdAt) planned++;
    if (dayInfo(iso).status === 'missed') missed++;
  }
  done = S.sessions.filter(s => s.status === 'completed' && s.date >= startIso && s.date <= addDays(startIso, 6)).length;
  return { planned, done, missed };
}

/** Semaines consécutives où toutes les séances prévues ont été faites. */
function weekStreak() {
  const cur = weekStart(todayISO());
  let streak = 0;
  const c = weekStats(cur);
  if (c.planned > 0 && c.done >= c.planned) streak++;
  let wk = addDays(cur, -7);
  while (addDays(wk, 6) >= S.createdAt) {
    const st = weekStats(wk);
    if (st.planned === 0) { wk = addDays(wk, -7); continue; }
    if (st.done >= st.planned) streak++; else break;
    wk = addDays(wk, -7);
  }
  return streak;
}

/** Taux de régularité : séances faites / séances prévues écoulées (repos exclus). */
function regularityRate() {
  const today = todayISO();
  let planned = 0, done = 0;
  for (let iso = S.createdAt; iso <= today; iso = addDays(iso, 1)) {
    const info = dayInfo(iso);
    if (!info.planned) continue;
    if (iso === today && info.status === 'planned') continue; // la journée n'est pas finie
    planned++;
    if (info.status === 'done') done++;
  }
  return planned ? Math.round(done / planned * 100) : null;
}

function nextPlanned(fromIso) {
  for (let i = 1; i <= 7; i++) {
    const iso = addDays(fromIso, i);
    const p = plannedFor(iso);
    if (p) return { iso, workoutId: p };
  }
  return null;
}

/* ---------- Statistiques par exercice ---------- */
function exerciseStats(exId) {
  const hist = exerciseHistory(exId);
  const ex = getEx(exId);
  const points = hist.map(h => ({
    date: h.date,
    maxWeight: Math.max(...h.sets.map(s => s.weight || 0)),
    volume: Math.round(setsVolume(h.sets, exId, h.date)),
    reps: sumReps(h.sets),
  }));
  let bestWeight = null, bestSet = null, bestReps = null, totalVolume = 0;
  hist.forEach(h => {
    totalVolume += setsVolume(h.sets, exId, h.date);
    h.sets.forEach(s => {
      const w = s.weight || 0;
      if (!bestWeight || w > bestWeight.weight || (w === bestWeight.weight && s.reps > bestWeight.reps)) bestWeight = { weight: w, reps: s.reps, date: h.date };
      const score = setLoad(s, exId, h.date) * s.reps;
      if (!bestSet || score > bestSet.score) bestSet = { weight: w, reps: s.reps, score, date: h.date };
      if (!bestReps || s.reps > bestReps.reps || (s.reps === bestReps.reps && w > bestReps.weight)) bestReps = { weight: w, reps: s.reps, date: h.date };
    });
  });
  return { ex, hist, points, bestWeight, bestSet, bestReps, totalVolume: Math.round(totalVolume), count: hist.length };
}

function exercisesWithHistory() {
  const ids = new Set();
  S.sessions.forEach(s => s.exercises.forEach(e => { if (doneSets(e).length) ids.add(e.exId); }));
  return [...ids];
}
