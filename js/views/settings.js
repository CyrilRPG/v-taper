'use strict';
/* =========================================================
   PARAMÈTRES — profil, préférences, données
   ========================================================= */

function toggleRow(key, title, sub) {
  return `<label class="toggle-row">
    <span class="grow"><span class="row-title">${title}</span>${sub ? `<span class="muted small block">${sub}</span>` : ''}</span>
    <input type="checkbox" class="switch" data-change="setting" data-k="${key}" ${S.settings[key] ? 'checked' : ''}>
  </label>`;
}

function restRow(type) {
  return `<div class="toggle-row">
    <span class="grow"><span class="row-title">${EX_TYPES[type].label}</span><span class="muted small block">Repos par défaut des nouveaux exercices</span></span>
    <div class="rest-ctl">
      <button class="mini-btn" data-action="rest-default" data-t="${type}" data-d="-15" aria-label="Moins">${icon('minus')}</button>
      <b>${fmtClock(S.settings.rest[type])}</b>
      <button class="mini-btn" data-action="rest-default" data-t="${type}" data-d="15" aria-label="Plus">${icon('plus')}</button>
    </div>
  </div>`;
}

Views.settings = {
  tab: null,
  render() {
    const p = S.profile;
    const field = (k, label, type, extra) => `<label class="field"><span>${label}</span>
      <input class="input" data-change="profile" data-k="${k}" ${type === 'num' ? 'inputmode="decimal"' : ''} value="${esc(p[k])}" ${extra || ''}></label>`;
    const size = (new Blob([JSON.stringify(S)]).size / 1024).toFixed(1);
    return {
      title: 'Paramètres', back: 'home', noSettings: true,
      html: `
        <div class="sec-title">Profil</div>
        <section class="card">
          ${field('name', 'Prénom (facultatif)', 'text', 'maxlength="30" placeholder="Ton prénom"')}
          <div class="field-grid">
            ${field('age', 'Âge', 'num')}
            ${field('height', 'Taille (cm)', 'num')}
            ${field('startWeight', 'Poids initial (kg)', 'num')}
            ${field('targetWeight', 'Objectif poids (kg)', 'num')}
          </div>
          ${field('goal', 'Objectif principal', 'text', 'maxlength="60"')}
          <div class="field"><span>Priorités physiques (dans l’ordre)</span>
            ${[0, 1, 2, 3].map(i => `<div class="prio-row"><span class="prio-n">${i + 1}</span>
              <input class="input" data-change="priority" data-i="${i}" value="${esc(p.priorities[i] || '')}" maxlength="40"></div>`).join('')}
          </div>
          ${field('secondary', 'Priorité secondaire', 'text', 'maxlength="40"')}
        </section>

        <div class="sec-title">Séance &amp; timer</div>
        <section class="card">
          ${toggleRow('autoTimer', 'Timer de repos automatique', 'Démarre après chaque série validée')}
          ${toggleRow('sound', 'Son à la fin du repos', 'Le mode silencieux de l’iPhone coupe le son')}
          ${toggleRow('vibration', 'Vibration', 'Selon la compatibilité de l’appareil')}
          ${toggleRow('keepAwake', 'Garder l’écran allumé', 'Pendant une séance, si compatible')}
          <button class="btn btn-ghost btn-sm" data-action="test-sound">${icon('bolt')} Tester le son</button>
          ${restRow('heavy')}${restRow('compound')}${restRow('isolation')}
        </section>

        <div class="sec-title">Affichage</div>
        <section class="card">
          <div class="seg seg-full">
            <button class="seg-btn ${S.settings.theme !== 'light' ? 'on' : ''}" data-action="theme" data-v="dark">${icon('moon')} Sombre</button>
            <button class="seg-btn ${S.settings.theme === 'light' ? 'on' : ''}" data-action="theme" data-v="light">Clair</button>
          </div>
        </section>

        <div class="sec-title">Mes données</div>
        <section class="card">
          <p class="muted small">Toutes tes données restent sur cet appareil (${size} Ko). Aucun compte, aucun serveur. Pense à exporter une sauvegarde de temps en temps.</p>
          <button class="btn btn-secondary btn-block" data-action="export">${icon('download')} Exporter mes données (JSON)</button>
          <button class="btn btn-secondary btn-block" data-action="import">${icon('upload')} Importer mes données</button>
          <input type="file" id="import-file" accept="application/json,.json" data-change="import-file" hidden>
          <button class="btn btn-ghost btn-block" data-action="reset-program">Restaurer le programme par défaut</button>
          <button class="btn btn-danger btn-block" data-action="reset-all">${icon('trash')} Réinitialiser toutes les données</button>
        </section>

        <div class="sec-title">Installer sur iPhone</div>
        <section class="card">
          <ol class="steps">
            <li>Ouvre l’app dans <b>Safari</b>.</li>
            <li>Touche le bouton <b>Partager</b> ${icon('share')}.</li>
            <li>Choisis <b>« Sur l’écran d’accueil »</b>, puis <b>Ajouter</b>.</li>
          </ol>
          <p class="muted small">Une fois ouverte une première fois, l’app fonctionne sans connexion.</p>
        </section>

        <div class="sec-title">Conseils &amp; sécurité</div>
        <section class="card card-tip">${icon('info')}
          <div>
            <p><b>Privilégie une technique propre, une progression progressive et une récupération suffisante.</b></p>
            <p class="muted small">Pas besoin de tester ton maximum (1RM) : la progression se fait série après série, avec 1 à 3 reps en réserve. Le sommeil et l’alimentation font une grande partie du travail. Aucun produit dopant, SARM ou hormone : c’est dangereux, en particulier à 16 ans. En cas de douleur, arrête et demande conseil à un professionnel de santé.</p>
          </div>
        </section>
        <p class="muted small center">V-Taper ${APP_VERSION} · 100 % hors-ligne</p>`,
    };
  },
};

function downloadFile(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const isiOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isiOS && navigator.canShare && typeof File === 'function') {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(err => {
        if (err && err.name !== 'AbortError') linkDownload(blob, name);
      });
      return;
    }
  }
  linkDownload(blob, name);
}
function linkDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

Object.assign(Actions, {
  'rest-default'(el) {
    const t = el.dataset.t;
    S.settings.rest[t] = clamp(S.settings.rest[t] + (+el.dataset.d), 15, 600);
    saveState(); rerender();
  },
  'test-sound'() { Timer.unlockAudio(); Timer.alert(); },
  theme(el) { S.settings.theme = el.dataset.v; saveState(); applyTheme(); rerender(); },
  export() {
    const data = Object.assign({ app: 'V-Taper', exportedAt: new Date().toISOString() }, S);
    downloadFile('vtaper-sauvegarde-' + todayISO() + '.json', JSON.stringify(data, null, 2));
    toast('Export prêt');
  },
  import() { document.getElementById('import-file').click(); },
  async 'reset-program'() {
    const ok = await confirmDialog({
      title: 'Restaurer le programme par défaut ?',
      text: 'Les séances, exercices et le planning reviennent au programme d’origine. Ton historique, tes pesées et ton profil sont conservés.',
      ok: 'Restaurer',
    });
    if (!ok) return;
    const prog = buildDefaultProgram(S.settings.rest);
    Object.keys(prog.exercises).forEach(id => { S.exercises[id] = prog.exercises[id]; });
    S.workouts = prog.workouts;
    S.workoutOrder = prog.workoutOrder;
    S.schedule = prog.schedule;
    saveState();
    toast('Programme par défaut restauré');
    rerender();
  },
  async 'reset-all'() {
    const ok = await confirmDialog({
      title: 'Tout supprimer ?',
      text: 'Historique, séances, pesées, profil et programme seront <b>définitivement effacés</b> de cet appareil. Exporte une sauvegarde avant si tu veux les garder.<br><br>Pour confirmer, tape <b>SUPPRIMER</b> :',
      typeToConfirm: 'SUPPRIMER', ok: 'Tout supprimer', danger: true,
    });
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    S = defaultState();
    saveState();
    releaseWakeLock();
    Timer.render();
    applyTheme();
    toast('Données réinitialisées');
    go('home');
  },
});

Object.assign(Changes, {
  profile(el) {
    const k = el.dataset.k;
    const numeric = ['age', 'height', 'startWeight', 'targetWeight'];
    if (numeric.includes(k)) {
      const v = num(el.value);
      const limits = { age: [10, 99], height: [100, 250], startWeight: [30, 250], targetWeight: [30, 250] }[k];
      if (v == null || v < limits[0] || v > limits[1]) { toast('Valeur invalide'); el.value = S.profile[k]; return; }
      S.profile[k] = k === 'age' ? Math.round(v) : Math.round(v * 10) / 10;
    } else {
      S.profile[k] = el.value.trim();
    }
    saveState();
    toast('Profil enregistré');
  },
  priority(el) {
    S.profile.priorities[+el.dataset.i] = el.value.trim();
    saveState();
    toast('Priorités enregistrées');
  },
  setting(el) {
    S.settings[el.dataset.k] = el.checked;
    saveState();
    if (el.dataset.k === 'keepAwake') { if (el.checked) requestWakeLock(); else releaseWakeLock(); }
  },
  'import-file'(el) {
    const file = el.files && el.files[0];
    el.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try {
        const parsed = JSON.parse(reader.result);
        delete parsed.app; delete parsed.exportedAt;
        data = normalizeState(parsed);
      } catch (e) {
        toast('Fichier invalide : ce n’est pas une sauvegarde V-Taper', 3500);
        return;
      }
      const ok = await confirmDialog({
        title: 'Importer cette sauvegarde ?',
        text: `${data.sessions.length} séance(s), ${data.weights.length} pesée(s), ${Object.keys(data.workouts).length} séance(s) au programme.<br>Tes données actuelles seront <b>remplacées</b>.`,
        ok: 'Importer',
      });
      if (!ok) return;
      S = data;
      saveState();
      applyTheme();
      Timer.resume();
      toast('Données importées ✓');
      go('home');
    };
    reader.onerror = () => toast('Lecture du fichier impossible');
    reader.readAsText(file);
  },
});
