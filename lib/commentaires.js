// Commentaires : logique partagée par les fonctions Cloudflare (dossier functions/).
//
// Réglages dans Cloudflare (Workers & Pages → sorcieres-mortelles → Settings) :
//   - liaison D1 nommée DB (base de données des commentaires) ;
//   - variable secrète BREVO_API_KEY (clé API Brevo, pour le mail de modération) ;
//   - variable secrète SECRET_MODERATION (texte long et aléatoire, signe les liens Publier / Supprimer) ;
//   - facultatif : MODERATION_EMAIL (sinon sorcieresmortelles@gmail.com).

export const LIMITES = { nom: 60, message: 3000, parFenetre: 5, fenetreMinutes: 10 };
const PAGE_OK = /^(article|interview)\/[a-z0-9-]{1,80}$/;
const EXPEDITEUR = { name: "Sorcières Mortelles", email: "lettremagique@sorcieres-mortelles.fr" };

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function preparer(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS commentaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL,
    nom TEXT NOT NULL,
    message TEXT NOT NULL,
    langue TEXT NOT NULL DEFAULT 'fr',
    date TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'attente',
    ip TEXT
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS commentaires_page ON commentaires (page, statut)").run();
}

async function hmac(secret, texte) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(texte));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export const jeton = (secret, id, action) => hmac(secret, `${id}:${action}`);
export async function jetonValide(secret, id, action, j) {
  if (!secret || !j) return false;
  const attendu = await jeton(secret, id, action);
  if (attendu.length !== j.length) return false;
  let diff = 0;
  for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ j.charCodeAt(i);
  return diff === 0;
}

// Liste des commentaires publiés d'une page.
export async function lister(db, page) {
  if (!PAGE_OK.test(page || "")) return null;
  try {
    const { results } = await db.prepare(
      "SELECT id, nom, message, date FROM commentaires WHERE page = ? AND statut = 'publie' ORDER BY id ASC"
    ).bind(page).all();
    return results || [];
  } catch (e) {
    if (/no such table/i.test(String(e && e.message))) return []; // aucune table encore : aucun commentaire
    throw e;
  }
}

// Vérifie et enregistre un nouveau commentaire (en attente de modération).
export async function ajouter(db, env, donnees, ip, origine) {
  const page = String(donnees.page || "");
  const nom = String(donnees.nom || "").trim().replace(/\s+/g, " ");
  const message = String(donnees.message || "").trim().replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const langue = donnees.langue === "en" ? "en" : "fr";
  if (donnees.site) return { ok: true, ignore: true }; // champ piège rempli : robot, on fait semblant d'accepter
  if (!PAGE_OK.test(page)) return { erreur: "page" };
  if (!nom || nom.length > LIMITES.nom) return { erreur: "nom" };
  if (!message || message.length > LIMITES.message) return { erreur: "message" };

  await preparer(db);
  const ipHash = ip ? (await hmac(env.SECRET_MODERATION || "sel", ip)).slice(0, 32) : null;
  if (ipHash) {
    const r = await db.prepare(
      "SELECT COUNT(*) AS n FROM commentaires WHERE ip = ? AND date > ?"
    ).bind(ipHash, new Date(Date.now() - LIMITES.fenetreMinutes * 60000).toISOString()).first();
    if (r && r.n >= LIMITES.parFenetre) return { erreur: "trop" };
  }
  const date = new Date().toISOString();
  const res = await db.prepare(
    "INSERT INTO commentaires (page, nom, message, langue, date, statut, ip) VALUES (?, ?, ?, ?, ?, 'attente', ?)"
  ).bind(page, nom, message, langue, date, ipHash).run();
  const id = res.meta && res.meta.last_row_id;
  const mail = await prevenir(env, { id, page, nom, message, langue }, origine);
  return { ok: true, id, mail };
}

// Mail de modération via l'API Brevo (compte déjà utilisé pour la lettre magique).
export async function prevenir(env, c, origine, envoyer = fetch) {
  if (!env.BREVO_API_KEY || !env.SECRET_MODERATION) return "non configuré";
  const lien = action => jeton(env.SECRET_MODERATION, c.id, action)
    .then(j => `${origine}/api/moderer?id=${c.id}&action=${action}&jeton=${j}`);
  const [publier, supprimer] = await Promise.all([lien("publier"), lien("supprimer")]);
  const bouton = (href, texte, fond) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 26px;background:${fond};color:#ffffff;text-decoration:none;font-size:16px">${texte}</a>`;
  const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;color:#222">
<p style="font-size:15px">Nouveau commentaire sur <a href="${esc(origine)}/${esc(c.page)}/">${esc(c.page)}</a> (lecteur en ${c.langue === "en" ? "anglais" : "français"}) :</p>
<p style="font-size:17px;margin:0 0 6px"><strong>${esc(c.nom)}</strong></p>
<blockquote style="margin:0 0 20px;padding:12px 16px;border-left:3px solid #46D4A7;background:#f4f4f2;font-size:16px;white-space:pre-wrap">${esc(c.message)}</blockquote>
${bouton(publier, "Publier", "#3b7a5e")}${bouton(supprimer, "Supprimer", "#8a2d3b")}
<p style="font-size:13px;color:#777">Un clic ouvre une page de confirmation. Sans action de votre part, le commentaire reste invisible.</p>
</div>`;
  try {
    const r = await envoyer("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: EXPEDITEUR,
        to: [{ email: env.MODERATION_EMAIL || "sorcieresmortelles@gmail.com" }],
        subject: `💬 Commentaire à relire : ${c.nom.slice(0, 40)}`,
        htmlContent: html
      })
    });
    return r.ok ? "envoyé" : `erreur Brevo ${r.status}`;
  } catch (e) {
    return "erreur réseau";
  }
}

// Petite page HTML (confirmation de modération), aux couleurs du site.
export function pageHtml(titre, corps) {
  return new Response(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(titre)} · Sorcières Mortelles</title>
<style>body{margin:0;background:#252C23;color:#C5C5C5;font:18px/1.5 "Times New Roman",Times,serif}
main{max-width:36rem;margin:0 auto;padding:2rem 1.25rem}h1{font-weight:400}a{color:#46D4A7}
blockquote{margin:1rem 0;padding:.8rem 1rem;border-left:3px solid #46D4A7;background:#302335;white-space:pre-wrap}
button{font:inherit;color:#C5C5C5;border:0;padding:.7rem 1.8rem;cursor:pointer;margin:.5rem .5rem 0 0}
.publier{background:#4A604E}.supprimer{background:#7a2a36}</style></head>
<body><main><h1>${esc(titre)}</h1>${corps}</main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
