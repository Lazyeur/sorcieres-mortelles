# Sorcières Mortelles

Site statique bilingue (français / anglais). Aucune dépendance : seul Node.js (version 18 ou plus) est nécessaire, et uniquement pour générer le site.

## Structure

```
config.json            e-mail de contact, URL du site, clé Web3Forms, formulaire Brevo, commentaires (true/false), profil Mastodon
workers/               publication-programmee.js : Worker Cloudflare qui régénère le site chaque nuit
scripts/mastodon.mjs   annonce les nouvelles publications sur Mastodon (lancé chaque matin par GitHub)
.github/workflows/     actions GitHub : Mastodon, et régénération du site (filet de sécurité)
functions/api/          commentaires : fonctions exécutées par Cloudflare (enregistrer, lister, modérer)
lib/commentaires.js    commentaires : logique commune (vérifications, anti-spam, mail de modération)
build.js               génère le site dans dist/ (à lire si vous voulez changer les gabarits)
content/
  interviews/          une interview = un fichier .md
  articles/            un article = un fichier .md
static/                copié tel quel dans le site
  css/style.css        toute la mise en forme
  js/main.js           bascule FR / EN
  img/                 images (Maluha, fond, et vos images de publications)
  fonts/               Blackwood Castle et Times Sans Serif
```

## Ajouter une interview ou un article

1. Copiez `content/interviews/_modele.md` (ou `content/articles/_modele.md`) et renommez-le, par exemple `content/interviews/maluha.md`.
   Le nom du fichier devient l’adresse de la page (`/interview/maluha/`) : minuscules, chiffres et tirets, sans accent. Les fichiers qui commencent par `_` sont ignorés.
2. Remplissez l’en-tête (entre les deux lignes `---`) :
   - `titre` et `date` (AAAA-MM-JJ) sont obligatoires ;
   - `artiste` et `resume` (affiché dans les listes) sont conseillés ;
   - facultatifs : `image` (image en tête de page, ex. `/img/maluha-atelier.jpg`) et, pour personnaliser la page, `fond`, `texte`, `accent` (couleurs, ex. `#302335`).
3. Écrivez le texte sous l’en-tête. Une ligne vide sépare les paragraphes.

| Pour obtenir | Écrire |
|---|---|
| Intertitre | `## Mon intertitre` |
| Citation | `> Ma citation` |
| Question / réponse | `Q: …` puis `R: …` |
| Italique / gras | `*italique*` / `**gras**` |
| Lien | `[texte](https://…)` |
| Image dans le texte | `![description](/img/mon-image.jpg)` |
| Image avec légende / crédit | `![description](/img/mon-image.jpg "Légende © Artiste")` |

4. Mettez vos images dans `static/img/`.
5. **Version anglaise** (facultative) : créez un second fichier du même nom avec `.en.md`, par exemple `maluha.en.md`, avec `titre`, `resume` et le texte traduit. Sans lui, la page anglaise affiche le texte français avec une note.
6. Envoyez sur GitHub (voir plus bas). La page apparaît sur le site, dans sa liste et dans Nouveautés.

## Programmer une publication

Mettez simplement une `date` dans le futur : la publication n’est pas mise en ligne avant ce jour-là (heure de Paris). Chaque nuit, juste après minuit (heure de Paris), le Worker Cloudflare `publication-programmee` (`workers/publication-programmee.js`) demande à Cloudflare Pages de régénérer le site : la publication apparaît, ainsi que dans les flux RSS. Elle est annoncée sur Mastodon le matin même (voir plus bas). Un filet de sécurité régénère aussi le site vers 6 h depuis GitHub (`.github/workflows/publication-programmee.yml`), au cas où le Worker n’aurait pas tourné.

Réglage à faire une seule fois :
1. Cloudflare : Workers & Pages → sorcieres-mortelles → Settings → Builds → *Deploy hooks* → ajouter (nom : `programmation`, branche : `main`) et copier l’adresse obtenue.
2. Cloudflare : Workers & Pages → *Create* → *Create Worker*, nom `publication-programmee` → *Deploy*, puis *Edit code* : coller le contenu de `workers/publication-programmee.js` et *Deploy*.
3. Dans ce Worker → Settings → *Variables and Secrets* : secret `DEPLOY_HOOK` = l’adresse copiée. Puis Settings → *Trigger events* → *Cron* : `5 23 * * *` (23 h 05 UTC = 0 h 05 à Paris en hiver, 1 h 05 en été). Le même Worker lance aussi l’annonce Mastodon du matin (voir la section Mastodon).
4. GitHub (filet de sécurité) : dépôt → Settings → Secrets and variables → Actions → *New repository secret*, nom `CLOUDFLARE_DEPLOY_HOOK`, valeur : la même adresse.
5. Pour vérifier : Cloudflare → le Worker → *Deployments* / *Observability* montre ses passages de la nuit ; ou GitHub → Actions → Publication programmée → *Run workflow* pour régénérer le site tout de suite.

## Prévisualiser chez soi

```
node build.js
npx serve dist
```

Pour voir aussi les publications programmées : `APERCU=1 node build.js` (sous PowerShell : `$env:APERCU=1; node build.js`).

## Mise en ligne : GitHub + Cloudflare Pages

Le site est publié par Cloudflare Pages (projet `sorcieres-mortelles`, gratuit) sur https://sorcieres-mortelles.fr. À chaque `git push` sur GitHub, Cloudflare régénère et publie le site tout seul en une à deux minutes.

- Réglages du projet (Workers & Pages → sorcieres-mortelles → Settings) : *Build command* `node build.js`, *Build output directory* `dist`, variable d’environnement `NODE_VERSION` = `20`.
- Domaine : acheté chez OVH, mais ses DNS sont gérés par Cloudflare (Domains → sorcieres-mortelles.fr → DNS). Les lignes MX et TXT servent aux mails OVH et à Brevo : ne pas les supprimer.
- Statistiques de visite : Workers & Pages → sorcieres-mortelles → Metrics → Web Analytics.
- Moteurs de recherche : `sitemap.xml` (plan du site, versions françaises et anglaises) et `robots.txt` sont générés par `build.js` à chaque mise en ligne. Pour suivre le référencement, déclarer `https://sorcieres-mortelles.fr/sitemap.xml` dans Google Search Console (et Bing Webmaster Tools).

## Formulaire de contact

Le formulaire passe par Web3Forms : les messages arrivent directement dans la boîte `sorcieresmortelles@gmail.com` (vérifier les spams en cas de doute). La clé est dans `config.json` (`"web3forms"`) ; pour en changer, en demander une nouvelle sur web3forms.com.

## Lettre magique (newsletter Brevo)

Une lettre flottante (`static/img/lettre-magique.png`) et le lien « Recevoir la lettre magique » (accueil, bas des publications) ouvrent la fenêtre d’inscription. Les inscrits arrivent dans la liste Brevo « Abonnés », avec leur langue (FR / EN) dans l’attribut `LANGUE`, après avoir confirmé par mail.

- `config.json` → `"brevo"` : l’adresse du formulaire Brevo (Partager → lien du formulaire). Videz-la pour retirer la lettre du site.
- Pages créées : `/newsletter/` (même formulaire, sans fenêtre), `/newsletter/confirmee/` (après le clic dans le mail de confirmation), `/newsletter/verifiez/`.
- À chaque nouvelle publication : dans Brevo, *Campagnes* → dupliquer la précédente → changer texte, image et lien → envoyer à la liste « Abonnés ».

## Commentaires

Système maison, gratuit, hébergé par Cloudflare : les lecteurs commentent sans compte ni e-mail (nom ou pseudo + message), en bas de chaque interview et article.

- **Modération** : chaque commentaire arrive *en attente*. Un mail (envoyé par Brevo) arrive sur `sorcieresmortelles@gmail.com` avec deux boutons, **Publier** et **Supprimer** ; chacun ouvre une page de confirmation. Sans action, le commentaire reste invisible.
- **Anti-spam** : champ piège invisible pour les robots, et 5 commentaires maximum par visiteur toutes les 10 minutes. Les adresses IP ne sont pas stockées en clair.
- **Données** : base Cloudflare D1 `commentaires` (Storage & databases → D1). La table est créée automatiquement au premier commentaire ; on peut la consulter ou corriger un commentaire depuis l’onglet *Console* de la base.
- **Réglages Cloudflare** (Workers & Pages → sorcieres-mortelles → Settings) : liaison D1 `DB` → base `commentaires` ; secrets `BREVO_API_KEY` (Brevo → Paramètres → SMTP et API → Clés API) et `SECRET_MODERATION` (texte long et aléatoire qui signe les liens de modération).
- **Activer / retirer** : `"commentaires": true` ou `false` dans `config.json`.
- Si les mails de modération n’arrivent pas : dans Brevo, vérifier que le blocage des adresses IP inconnues est désactivé (Paramètres → Sécurité → IP autorisées).

## Mastodon

Chaque matin vers 7 h 30, le Worker Cloudflare `publication-programmee` demande à GitHub de lancer l’action Mastodon (`.github/workflows/mastodon.yml`, qui lance `scripts/mastodon.mjs`). Elle lit le flux RSS anglais du site (`rss-en.xml`) et publie sur le compte Mastodon, en anglais, chaque nouvelle interview ou nouvel article (titre, auteur·ice, résumé, titre français s’il diffère, lien vers la version anglaise, hashtags). Rien n’est stocké : le script regarde les derniers messages du compte et ne republie jamais un lien déjà présent. Seules les publications des 3 derniers jours sont annoncées.

Pourquoi ce détour : le Worker ne peut pas écrire lui-même à Mastodon (Cloudflare échoue à se connecter en https au serveur sunny.garden, erreur 525), et les horaires programmés de GitHub ont souvent plusieurs heures de retard, voire sautent un jour. L’action garde quand même son propre horaire (6 h 30 UTC) en filet de sécurité : si elle passe deux fois, rien n’est publié en double.

Réglage à faire une seule fois :
1. Mastodon : Préférences → Développement → *Nouvelle application* (nom : `sorcieres-mortelles.fr`). Dans les autorisations, ne cocher que `read:accounts`, `read:statuses` et `write:statuses`. Enregistrer, rouvrir l’application et copier le *jeton d’accès*.
2. GitHub : dépôt → Settings → Secrets and variables → Actions → *New repository secret*, deux fois : `MASTODON_INSTANCE` = adresse du serveur (`https://sunny.garden`, sans le `/@compte`) et `MASTODON_TOKEN` = le jeton copié.
3. GitHub : photo de profil → Settings → Developer settings → Personal access tokens → *Fine-grained tokens* → *Generate new token*. Nom : `worker-mastodon` ; expiration : la plus longue proposée (à renouveler ensuite) ; *Repository access* : *Only select repositories* → `sorcieres-mortelles` ; *Permissions* → *Actions* : *Read and write* (rien d’autre). Copier le jeton.
4. Cloudflare : Worker `publication-programmee` → Settings → *Variables and Secrets* : secret `GITHUB_TOKEN` = ce jeton. Puis *Edit code* : recoller `workers/publication-programmee.js` et *Deploy*. Puis Settings → *Trigger events* : ajouter un second *Cron* `30 6 * * *`.
5. Pour vérifier : GitHub → Actions → Mastodon → *Run workflow*. La case « Essai » est cochée par défaut : le journal affiche le ou les messages qui partiraient, sans rien publier. Décochez-la pour publier tout de suite. Les lancements venus du Worker apparaissent dans la même liste chaque matin, marqués *workflow_dispatch*.

Les hashtags se changent en haut de `scripts/mastodon.mjs` (`HASHTAGS`).

**Profil vérifié** : mettre l’adresse du profil dans `config.json` (`"mastodon": "https://sunny.garden/@sorcieresmortelles"`), puis sur Mastodon (Modifier le profil → Champs supplémentaires) ajouter `https://sorcieres-mortelles.fr` : le lien apparaît en vert, certifié.

## Modifier le design

Tout est dans `static/css/style.css` (couleurs en haut, dans `:root`). La structure des pages est dans `build.js`.
