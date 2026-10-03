# V-Taper: carnet de musculation (PWA hors-ligne)

Une web app de musculation 100 % côté client : **sans API, sans serveur, sans compte, sans dépendance**.
Toutes les données restent sur l'appareil (localStorage). Installable sur iPhone et utilisable hors-ligne.

## Structure

```
programme sport/
├── index.html              Page unique (squelette, barre d'onglets)
├── manifest.webmanifest    Manifeste PWA (nom, icônes, plein écran)
├── sw.js                   Service worker : cache hors-ligne
├── css/styles.css          Design noir / rouge, mobile-first, thème clair optionnel
├── icons/                  Icônes de l'app (SVG + PNG, dont apple-touch-icon)
└── js/
    ├── store.js            Modèle de données, programme par défaut, sauvegarde locale
    ├── engine.js           Historique, progression automatique, stats, calendrier, régularité
    ├── charts.js           Graphiques SVG (sans librairie)
    ├── ui.js               Icônes, toasts, feuilles modales, dialogues de confirmation
    ├── timer.js            Timer de repos (son, vibration, pause, ±30 s)
    ├── app.js              Routeur, gestion des clics, démarrage
    └── views/
        ├── home.js         Accueil (séance du jour, semaine, poids, conseil)
        ├── session.js      Séance en cours + bilan « Séance terminée »
        ├── calendar.js     Calendrier mensuel + détail d'un jour
        ├── stats.js        Progression : régularité, poids, graphiques, records
        ├── program.js      Planning hebdomadaire + éditeur de séances / exercices
        └── settings.js     Profil, préférences, export / import / réinitialisation
```

## Lancer l'app sur l'ordinateur

Un service worker exige une adresse `http://localhost` ou `https://`, donc il faut un petit serveur local
(double-cliquer sur `index.html` marche aussi, mais sans le mode hors-ligne) :

```bash
python -m http.server 8765
```

Puis ouvrir http://localhost:8765

## Installer sur iPhone

L'iPhone doit charger l'app depuis une adresse **https**. Le plus simple, gratuit :

- **Netlify Drop** : aller sur https://app.netlify.com/drop et glisser-déposer le dossier `programme sport`.
  Tu obtiens une adresse https en quelques secondes.
- ou **GitHub Pages** : mettre le dossier dans un dépôt GitHub, puis Settings → Pages.

Ensuite, sur l'iPhone :
1. Ouvre l'adresse dans **Safari**.
2. Touche **Partager**, puis **« Sur l'écran d'accueil »**, puis **Ajouter**.
3. Ouvre l'app depuis l'icône V-Taper. Après ce premier chargement, elle fonctionne sans connexion.

> Les données sont stockées dans l'app installée sur l'écran d'accueil. Elles survivent aux rafraîchissements,
> à la fermeture et au redémarrage du téléphone. Elles sont effacées si tu supprimes l'app de l'écran d'accueil :
> exporte une sauvegarde de temps en temps (Paramètres → Exporter mes données).

## Mettre à jour l'app

Après avoir modifié un fichier, change `CACHE_VERSION` dans `sw.js` (ex. `vtaper-v2`) puis redéploie.
L'app se met à jour toute seule à l'ouverture suivante, et tes données sont conservées.

## Progression automatique (double progression)

Pour chaque exercice, l'app regarde la **dernière séance** où il a été fait et propose une charge et des répétitions.
Elle ne change **jamais** les exercices, leur ordre ou le nombre de séries.

| Situation (ex. 4 × 6–10 à 22 kg)          | Recommandation                                             |
|-------------------------------------------|------------------------------------------------------------|
| 10 / 10 / 10 / 10 avec RIR ≥ 1            | **+2 kg** (incrément réglable par exercice), repartir à 6–8 reps |
| 10 / 10 / 10 / 10 mais à l'échec (RIR 0)  | Garder 22 kg, confirmer avec 1–2 reps en réserve           |
| 10 / 9 / 8 / 7 ou 6 / 6 / 6 / 6           | Garder 22 kg, battre le total de reps (objectif série par série) |
| Séries non toutes faites                  | Garder la charge et compléter                              |
| Forte baisse ponctuelle (−15 %)           | Pas d'augmentation, conseil récupération                   |
| Baisse sur 3 séances, ou 2 fois sous la fourchette | Réduction légère (−1 incrément)                   |
| Exercice au poids du corps (tractions, dips) | Ajout de reps, puis lest léger proposé                  |

Chaque recommandation affiche une explication simple. Une hausse ou une baisse de charge doit être **acceptée ou refusée**,
et ce que tu saisis toi-même passe toujours en premier.

## Données

- Exporter : Paramètres → **Exporter mes données** (fichier JSON).
- Importer : Paramètres → **Importer mes données** (remplace les données actuelles, après confirmation).
- Réinitialiser : Paramètres → **Réinitialiser toutes les données** (il faut taper `SUPPRIMER` pour confirmer).
- Restaurer seulement le programme d'origine (en gardant l'historique) : Paramètres → **Restaurer le programme par défaut**.
