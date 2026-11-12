# VIC'TORY Trail

Carnet d'ultra-trail ouvert à tous les traileurs : séances importées depuis la montre (FIT, GPX) ou saisies à la main, courses objectifs avec parcours GPX et temps de passage, lien pour l'équipe d'assistance, progrès (volume, D+, zones cardio).

Appli web installable (PWA), hébergée sur GitHub Pages ; comptes et données dans Supabase (UE, Paris).

- `index.html` : page, styles, politique de sécurité du contenu
- `app.js` : l'appli (connexion par code e-mail, écrans, graphiques, modèle de temps de passage)
- `parse.js` : lecture des fichiers FIT / GPX dans le téléphone
- `vendor/supabase.js` : client Supabase (supabase-js 2.119.0, build UMD)
- `sw.js` : fonctionnement hors ligne

## Données

Chaque ligne appartient à un utilisateur ; la sécurité au niveau des lignes (RLS) de Supabase garantit que personne d'autre ne la lit. Le lien équipe passe par la fonction `crew_race(token)`, qui ne renvoie que le prénom, la course, le profil et les points de passage. Les fichiers d'origine sont rangés dans le stockage `activity-files/<id utilisateur>/`.

## Versions

Liste `CHANGES` en tête de `app.js`, et `<meta name="vt-version">` dans `index.html` (à garder identiques), plus la constante `V` de `sw.js`. Chaque nouvelle version affiche ses nouveautés à la première ouverture et un bandeau « Version x disponible » aux appareils déjà ouverts.
