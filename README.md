# Sorcières Mortelles

Site statique bilingue (français / anglais). Aucune dépendance : seul Node.js (version 18 ou plus) est nécessaire, et uniquement pour générer le site.

## Structure

```
config.json            e-mail de contact, URL du site, clé Web3Forms, formulaire Brevo, commentaires (true/false)
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

4. Mettez vos images dans `static/img/`.
5. **Version anglaise** (facultative) : créez un second fichier du même nom avec `.en.md`, par exemple `maluha.en.md`, avec `titre`, `resume` et le texte traduit. Sans lui, la page anglaise affiche le texte français avec une note.
6. Envoyez sur GitHub (voir plus bas). La page apparaît sur le site, dans sa liste et dans Nouveautés.

## Prévisualiser chez soi

```
node build.js
npx serve dist
```

## Mise en ligne : GitHub + Cloudflare Pages

Le site est publié par Cloudflare Pages (projet `sorcieres-mortelles`, gratuit) sur https://sorcieres-mortelles.fr. À chaque `git push` sur GitHub, Cloudflare régénère et publie le site tout seul en une à deux minutes.

- Réglages du projet (Workers & Pages → sorcieres-mortelles → Settings) : *Build command* `node build.js`, *Build output directory* `dist`, variable d’environnement `NODE_VERSION` = `20`.
- Domaine : acheté chez OVH, mais ses DNS sont gérés par Cloudflare (Domains → sorcieres-mortelles.fr → DNS). Les lignes MX et TXT servent aux mails OVH et à Brevo : ne pas les supprimer.
- Statistiques de visite : Workers & Pages → sorcieres-mortelles → Metrics → Web Analytics.

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

## Modifier le design

Tout est dans `static/css/style.css` (couleurs en haut, dans `:root`). La structure des pages est dans `build.js`.
