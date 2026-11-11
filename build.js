// build.js : génère le site statique dans dist/ à partir du dossier content/.
// Aucune dépendance. Cloudflare Pages le lance à chaque mise en ligne ("node build.js").
const fs = require("fs"), path = require("path");
const ROOT = __dirname, OUT = path.join(ROOT, "dist");
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
const NOM = "Sorcières Mortelles";
// Empreinte des fichiers CSS et JS, ajoutée à leur adresse (?v=…) : après chaque mise en ligne,
// les navigateurs prennent la nouvelle version au lieu de leur ancienne copie en cache.
const empreinte = rel => require("crypto").createHash("md5").update(fs.readFileSync(path.join(ROOT, "static", rel))).digest("hex").slice(0, 8);
const V = { css: empreinte("css/style.css"), js: empreinte("js/main.js") };

const TYPES = {
  interview: { dir: "interviews", fr: "Interviews", en: "Interviews", retFr: "← Toutes les interviews", retEn: "← All interviews" },
  article:   { dir: "articles",   fr: "Articles",   en: "Articles",   retFr: "← Tous les articles",    retEn: "← All articles" }
};

// ---------- outils de texte ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sur = c => /^[#a-zA-Z0-9(),.% ]+$/.test(c || "") ? c : "";
const bi = (fr, en) => `<span data-l="fr">${fr}</span><span data-l="en">${en}</span>`;
const biDiv = (fr, en) => `<div data-l="fr">${fr}</div>\n<div data-l="en">${en}</div>`;
const dateTxt = (d, l) => new Date(d + "T12:00:00Z").toLocaleDateString(l === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function inl(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>");
}
function corps(x) {
  return (x || "").trim().split(/\r?\n\s*\r?\n/).filter(Boolean).map(b => {
    b = b.trim(); let m;
    if (b.startsWith("## ")) return `<h3>${inl(b.slice(3))}</h3>`;
    if (b.startsWith("> ")) return `<blockquote>${b.split(/\r?\n/).map(l => inl(l.replace(/^>\s?/, ""))).join("<br>")}</blockquote>`;
    if ((m = b.match(/^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)\s]+)\)$/))) return `<img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">`;
    if (/^Q\s*:/.test(b)) return `<p class="q">${inl(b.replace(/^Q\s*:\s*/, ""))}</p>`;
    if (/^R\s*:/.test(b)) return `<p>${inl(b.replace(/^R\s*:\s*/, ""))}</p>`;
    return `<p>${inl(b).replace(/\r?\n/g, "<br>")}</p>`;
  }).join("\n");
}

// ---------- lecture des publications ----------
function parse(raw) {
  const m = raw.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  m[1].split(/\r?\n/).forEach(l => { const i = l.indexOf(":"); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  return { meta, body: m[2] };
}
function charger(type) {
  const d = path.join(ROOT, "content", TYPES[type].dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => f.endsWith(".md") && !f.startsWith("_") && !f.endsWith(".en.md")).map(f => {
    const slug = f.slice(0, -3);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Nom de fichier invalide : ${f} (minuscules, chiffres et tirets seulement)`);
    const fr = parse(fs.readFileSync(path.join(d, f), "utf8"));
    if (!fr.meta.titre || !/^\d{4}-\d{2}-\d{2}$/.test(fr.meta.date || "")) throw new Error(`${f} : "titre" et "date" (AAAA-MM-JJ) sont obligatoires`);
    const fe = path.join(d, slug + ".en.md");
    const en = fs.existsSync(fe) ? parse(fs.readFileSync(fe, "utf8")) : null;
    return {
      type, slug, date: fr.meta.date, artiste: fr.meta.artiste || "", image: fr.meta.image || "",
      fond: sur(fr.meta.fond), texte: sur(fr.meta.texte), accent: sur(fr.meta.accent),
      fr: { titre: fr.meta.titre, resume: fr.meta.resume || "", corps: fr.body },
      en: en ? { titre: en.meta.titre || fr.meta.titre, resume: en.meta.resume || fr.meta.resume || "", corps: en.body } : null
    };
  });
}
const tous = Object.keys(TYPES).flatMap(charger).sort((a, b) => a.date < b.date ? 1 : -1);
const url = p => `/${p.type}/${p.slug}/`;
const tEn = p => (p.en || p.fr);
const meta = p => (p.artiste ? esc(p.artiste) + " – " : "") + bi(dateTxt(p.date, "fr"), dateTxt(p.date, "en"));

// ---------- gabarit commun ----------
// ---------- lettre magique (newsletter Brevo) ----------
// Tout ce bloc n'apparaît que si "brevo" (adresse du formulaire Brevo) est rempli dans config.json.
const NL = !!CFG.brevo;
const formNewsletter = () => `<form class="nl-form" method="POST" action="${esc(CFG.brevo)}" data-brevo>
<label>${bi("Votre adresse e-mail", "Your e-mail address")}<input name="EMAIL" type="email" autocomplete="email" required></label>
<input type="hidden" name="LANGUE" value="FR">
<input type="hidden" name="locale" value="fr">
<div class="nl-piege" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><input type="text" name="email_address_check" value="" tabindex="-1" autocomplete="off"></div>
<button type="submit" class="envoi">${bi("Recevoir la lettre", "Get the letter")}</button>
<p class="erreur" role="alert" hidden>${bi("L’inscription n’a pas fonctionné. Réessayez dans un instant.", "Sign-up failed. Please try again in a moment.")}</p>
</form>
<p class="nl-ok" role="status" hidden>${bi("Presque fini ! Un mail vient de partir : cliquez sur le lien qu’il contient pour confirmer votre inscription.", "Almost done! We just sent you an e-mail: click the link inside to confirm your subscription.")}</p>
<p class="meta">${bi("Une lettre à chaque nouvelle interview ou nouvel article, rien d’autre. Désinscription en un clic depuis chaque mail.", "One letter for each new interview or article, nothing else. Unsubscribe in one click from any e-mail.")}</p>`;
const introNewsletter = bi("Recevez la lettre magique : un mail à chaque nouvelle publication.", "Receive the magic letter: an e-mail for each new publication.");
const lienNewsletter = () => NL ? `<p class="nl-lien"><a href="/newsletter/" data-newsletter>✉ ${bi("Recevoir la lettre magique", "Get the magic letter")}</a></p>\n` : "";
const lettreFlottante = () => `<a class="lettre" href="/newsletter/" data-newsletter><img src="/img/lettre-magique.png" alt="" width="360" height="360"><span class="vh">${bi("S’inscrire à la lettre magique", "Subscribe to the magic letter")}</span></a>
<dialog id="newsletter" class="nl-dialog" aria-labelledby="nl-titre">
<button type="button" class="nl-fermer" data-fermer>✕<span class="vh">${bi("Fermer", "Close")}</span></button>
<img class="nl-image" src="/img/lettre-magique.png" alt="">
<h2 id="nl-titre" class="page-titre">${bi("La lettre magique", "The magic letter")}</h2>
<p>${introNewsletter}</p>
${formNewsletter()}
</dialog>
`;

function layout({ titre, desc, nav, main, cls = "" }) {
  const t1 = titre ? `${esc(titre[0])} · ${NOM}` : NOM, t2 = titre ? `${esc(titre[1])} · ${NOM}` : NOM;
  const lien = (h, id, l) => `<a href="${h}"${nav === id ? ' aria-current="page"' : ""}>${l}</a>`;
  const d = esc(desc || "Sorcières Mortelles, journal d’art : interviews et articles d’artistes.");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${t1}</title>
<meta name="description" content="${d}">
<meta property="og:title" content="${t1}">
<meta property="og:description" content="${d}">
${CFG.url ? `<meta property="og:image" content="${CFG.url}/img/maluha.png">\n` : ""}<link rel="icon" href="/img/maluha.png">
<link rel="stylesheet" href="/css/style.css?v=${V.css}">
<script>try{if(localStorage.getItem("sm-lang")==="en")document.documentElement.lang="en"}catch(e){}</script>
</head>
<body data-t-fr="${t1}" data-t-en="${t2}">
<div class="page">
<header>
<img alt="Maluha" src="/img/maluha.png">
<h1><a href="/">SORCIÈRES MORTELLES</a></h1>
</header>
<nav id="menu" data-aria-fr="Navigation principale" data-aria-en="Main navigation">${lien("/", "accueil", bi("ACCUEIL", "HOME"))}${lien("/interview/", "interview", "INTERVIEWS")}${lien("/article/", "article", "ARTICLES")}${lien("/contact/", "contact", "CONTACT")}<div class="langues" role="group" id="langues"><button type="button" data-lang-btn="fr" lang="fr" title="Français">FR</button><span aria-hidden="true">/</span><button type="button" data-lang-btn="en" lang="en" title="English">EN</button></div></nav>
<main class="${cls}">
${main}
</main>
</div>
${NL && nav !== "newsletter" ? lettreFlottante() : ""}<script src="/js/main.js?v=${V.js}"></script>
</body>
</html>
`;
}
// Commentaires (fonctions Cloudflare + base D1, voir functions/ et lib/commentaires.js).
// Affichés si "commentaires" vaut true dans config.json ; la liste est chargée par js/main.js.
function commentaires(p) {
  if (!CFG.commentaires) return "";
  return `<section class="commentaires" data-page="${p.type}/${p.slug}">
<h3>${bi("Commentaires", "Comments")}</h3>
<div class="com-liste"></div>
<p class="com-vide meta" hidden>${bi("Aucun commentaire pour l’instant. Laissez le premier !", "No comments yet. Leave the first one!")}</p>
<form class="com-form">
<label>${bi("Votre nom ou pseudo", "Your name or nickname")}<input name="nom" maxlength="60" autocomplete="nickname" required></label>
<label>${bi("Votre commentaire", "Your comment")}<textarea name="message" maxlength="3000" required></textarea></label>
<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><input name="site" tabindex="-1" autocomplete="off"></div>
<button type="submit" class="envoi">${bi("Publier", "Post")}</button>
<p class="erreur" role="alert" hidden></p>
</form>
<p class="com-ok" role="status" hidden>${bi("Merci ! Votre commentaire apparaîtra ici après relecture.", "Thank you! Your comment will appear here once reviewed.")}</p>
<p class="meta">${bi("Pas besoin de compte ni d’adresse e-mail. Les commentaires sont relus avant publication.", "No account or e-mail address needed. Comments are reviewed before publication.")}</p>
</section>
`;
}
function ecrire(rel, html) { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); }

// ---------- pages ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "static"), OUT, { recursive: true });

// Accueil
const news = tous.slice(0, 5).map(p => `<li><a href="${url(p)}">${bi(esc(p.fr.titre), esc(tEn(p).titre))}</a><br><span class="ph">${meta(p)}</span></li>`).join("\n");
ecrire("index.html", layout({
  nav: "accueil",
  main: `<section class="accueil">
<h2>${bi("Toustes des Sorcières, Toustes des Artistes", "All of Us Witches, All of Us Artists")}</h2>
<p>${bi("Dans ces bois vous trouverez l’art beau, l’art perdu, l’art qui vous trouve, l’art qui dérange, l’art qui questionne, l’art qui répond, l’art qui frissonne, l’art qui explose, l’art pour les humains, et les autres.",
        "In these woods you will find art that is beautiful, art that is lost, art that finds you, art that disturbs, art that questions, art that answers, art that shivers, art that explodes, art for humans, and for the others.")}</p>
<p>${bi("Vous rentrez dans un lieu curieux, humaniste et compréhensif.", "You are entering a place that is curious, humanist and understanding.")}</p>
</section>
<aside>
<h2>${bi("Nouveautés", "What’s New")}</h2>
${news ? `<ul>\n${news}\n</ul>` : ""}
${lienNewsletter()}</aside>`
}));

// Listes et fiches
for (const [type, T] of Object.entries(TYPES)) {
  const items = tous.filter(p => p.type === type);
  const li = items.map(p => `<li><a href="${url(p)}"><span class="t">${bi(esc(p.fr.titre), esc(tEn(p).titre))}</span><span class="meta">${meta(p)}</span><span>${bi(esc(p.fr.resume), esc(tEn(p).resume))}</span></a></li>`).join("\n");
  ecrire(`${type}/index.html`, layout({
    titre: [T.fr, T.en], nav: type, cls: "seul",
    main: `<section class="panneau">
<h2 class="page-titre">${bi(T.fr, T.en)}</h2>
${li ? `<ul class="liste">\n${li}\n</ul>` : `<p>${bi("Les premières publications arrivent bientôt.", "The first publications are coming soon.")}</p>`}
</section>`
  }));
  for (const p of items) {
    const st = [p.texte && `--texte:${p.texte}`, p.accent && `--menthe:${p.accent}`, p.fond && `background:${p.fond}`].filter(Boolean).join(";");
    const img = p.image && /^(https?:\/\/|\/)/.test(p.image) ? `<img src="${esc(p.image)}" alt="">\n` : "";
    const cFr = corps(p.fr.corps);
    const cEn = p.en ? corps(p.en.corps) : `<p class="meta">This text is only available in French.</p>\n${cFr}`;
    ecrire(`${type}/${p.slug}/index.html`, layout({
      titre: [p.fr.titre, tEn(p).titre], desc: p.fr.resume, nav: type, cls: "seul",
      main: `<article class="panneau"${st ? ` style="${st}"` : ""}>
<a class="retour" href="/${type}/">${bi(T.retFr, T.retEn)}</a>
<div class="fiche">
<h2 class="page-titre">${bi(esc(p.fr.titre), esc(tEn(p).titre))}</h2>
<p class="meta">${meta(p)}</p>
${img}${biDiv(cFr, cEn)}
${lienNewsletter()}</div>
${commentaires(p)}</article>`
    }));
  }
}

// Contact + page de remerciement + 404
// Le formulaire passe par Web3Forms (clé "web3forms" dans config.json).
const mail = esc(CFG.email);
const SUJET = "Nouveau message - Sorcières Mortelles";
const formulaire = `<form method="POST" action="https://api.web3forms.com/submit" data-web3forms>
<input type="hidden" name="access_key" value="${esc(CFG.web3forms)}">
<input type="hidden" name="subject" value="${SUJET}">
<input type="hidden" name="from_name" value="${NOM}">
${CFG.url ? `<input type="hidden" name="redirect" value="${esc(CFG.url)}/merci/">\n` : ""}<input type="checkbox" name="botcheck" hidden style="display:none">`;
ecrire("contact/index.html", layout({
  titre: ["Contact", "Contact"], nav: "contact", cls: "seul",
  main: `<section class="panneau">
<h2 class="page-titre">Contact</h2>
<div class="contact">
<p>${bi("Une question, une proposition, un texte à partager : écrivez-nous.", "A question, a proposal, a text to share: write to us.")}</p>
${formulaire}
<label>${bi("Votre nom", "Your name")}<input name="nom" autocomplete="name" required></label>
<label>${bi("Votre adresse e-mail", "Your e-mail address")}<input name="email" type="email" autocomplete="email" required></label>
<label>${bi("Votre message", "Your message")}<textarea name="message" required></textarea></label>
<button type="submit" class="envoi">${bi("Envoyer", "Send")}</button>
<p class="erreur" role="alert" hidden>${bi("L’envoi n’a pas fonctionné. Réessayez, ou écrivez-nous directement à l’adresse ci-dessous.", "Sending failed. Please try again, or write to us directly at the address below.")}</p>
</form>
<p class="meta">${bi("Ou écrivez directement à", "Or write directly to")} <a href="mailto:${mail}">${mail}</a></p>
</div>
</section>`
}));
const simple = (fr, en, pfr, pen) => `<section class="panneau">
<h2 class="page-titre">${bi(fr, en)}</h2>
<p>${bi(pfr, pen)}</p>
<p><a href="/">${bi("← Retour à l’accueil", "← Back to home")}</a></p>
</section>`;
ecrire("merci/index.html", layout({ titre: ["Merci", "Thank you"], cls: "seul",
  main: simple("Merci !", "Thank you!", "Votre message est bien parti. Nous vous répondons dès que possible.", "Your message has been sent. We will reply as soon as possible.") }));
if (NL) {
  ecrire("newsletter/index.html", layout({ titre: ["La lettre magique", "The magic letter"], nav: "newsletter", cls: "seul",
    main: `<section class="panneau">
<div class="nl-page">
<div class="nl-texte">
<h2 class="page-titre">${bi("La lettre magique", "The magic letter")}</h2>
<p>${introNewsletter}</p>
${formNewsletter()}
</div>
<img class="nl-dessin" src="/img/lettre-magique.png" alt="">
</div>
</section>` }));
  ecrire("newsletter/verifiez/index.html", layout({ titre: ["Vérifiez votre boîte mail", "Check your inbox"], nav: "newsletter", cls: "seul",
    main: simple("Presque fini !", "Almost done!", "Un mail vient de partir : cliquez sur le lien qu’il contient pour confirmer votre inscription. Pensez à regarder dans les spams.", "We just sent you an e-mail: click the link inside to confirm your subscription. Remember to check your spam folder.") }));
  ecrire("newsletter/confirmee/index.html", layout({ titre: ["Inscription confirmée", "Subscription confirmed"], nav: "newsletter", cls: "seul",
    main: simple("C’est confirmé !", "Confirmed!", "Bienvenue parmi nous. La lettre magique vous trouvera à chaque nouvelle interview ou nouvel article.", "Welcome among us. The magic letter will find you with each new interview or article.") }));
}
ecrire("404.html", layout({ titre: ["Page introuvable", "Page not found"], cls: "seul",
  main: simple("Page introuvable", "Page not found", "Cette page n’existe pas, ou plus.", "This page does not exist, or no longer does.") }));

console.log(`Site généré dans dist/ : ${tous.length} publication(s).`);
