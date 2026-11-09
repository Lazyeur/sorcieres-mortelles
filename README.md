# Sorcières Mortelles

Site statique bilingue (français / anglais). Aucune dépendance : seul Node.js (version 18 ou plus) est nécessaire, et uniquement pour générer le site.

## Structure

```
config.json            e-mail de contact, URL du site, clés Web3Forms et Cusdis
build.js               génère le site dans dist/ (à lire si vous voulez changer les gabarits)
netlify.toml           dit à Netlify de lancer "node build.js" et de publier dist/
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

## Mise en ligne : GitHub + Netlify

1. Créez un dépôt GitHub (privé ou public) et envoyez-y le contenu de ce dossier.
2. Sur Netlify : *Add new project* → *Import an existing project* → GitHub → choisissez le dépôt. Netlify lit `netlify.toml` : rien à régler. Lancez le déploiement.
3. À chaque `git push`, Netlify régénère et publie le site tout seul.
4. Domaine : *Domain management* → *Add a domain*. Une fois l’adresse connue, mettez-la dans `config.json` (`"url": "https://…"`) : elle sert à l’aperçu des liens partagés.

## Passer de Netlify à Cloudflare Pages (gratuit, sans badge)

Le site fonctionne tel quel chez Cloudflare. Avant de changer, remplissez `web3forms` dans `config.json` (voir plus bas) : Netlify Forms ne marche que chez Netlify.

1. Créez un compte sur dash.cloudflare.com → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → choisissez le dépôt.
2. Réglages : *Build command* `node build.js`, *Build output directory* `dist`, variable d’environnement `NODE_VERSION` = `20`.
3. Lancez le déploiement : le site est en ligne sur une adresse en `.pages.dev`. Comme chez Netlify, chaque `git push` le met à jour.
4. Testez toutes les pages et le formulaire, puis seulement alors supprimez le site dans Netlify.

## Formulaire de contact

**Avec Web3Forms (marche chez n’importe quel hébergeur)** : sur web3forms.com, entrez `sorcieresmortelles@gmail.com` et recevez une clé par mail. Collez-la dans `config.json` (`"web3forms": "votre-clé"`) et envoyez sur GitHub. Les messages arrivent directement dans la boîte Gmail.

**Sans clé**, le formulaire utilise Netlify Forms (rien à installer). Après le premier déploiement, dans Netlify :
1. Onglet *Forms* → *Enable form detection*, puis redéployez (*Deploys* → *Trigger deploy*) pour que le formulaire « contact » soit détecté.
2. Pour recevoir les messages par mail :
*Project configuration* → *Notifications* → *Form submission notifications* → *Add notification* → *Email notification*, avec `sorcieresmortelles@gmail.com`. Les messages sont aussi visibles dans l’onglet *Forms*.
Testez en envoyant un message depuis le site en ligne. Pensez à vérifier le dossier spam de la boîte Gmail la première fois.

## Commentaires

Les interviews et articles peuvent recevoir des commentaires, sans compte pour les lecteurs, grâce à Cusdis.
1. Créez un compte sur cusdis.com, puis ajoutez un site (*New website*).
2. Copiez son *App ID* dans `config.json` (`"cusdis": "…"`) et envoyez sur GitHub : un bloc « Commentaires » apparaît en bas de chaque publication.
3. Chaque nouveau commentaire attend votre validation dans le tableau de bord Cusdis, et vous pouvez être prévenu par mail (réglage dans Cusdis).

Laissez `"cusdis": ""` pour retirer les commentaires.

## Modifier le design

Tout est dans `static/css/style.css` (couleurs en haut, dans `:root`). La structure des pages est dans `build.js`.
