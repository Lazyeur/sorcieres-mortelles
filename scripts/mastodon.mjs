// Publication automatique sur Mastodon (lancé chaque matin par .github/workflows/mastodon.yml).
// Lit le flux RSS anglais du site en ligne (rss-en.xml, et rss.xml pour le titre français) et publie
// sur Mastodon, en anglais, chaque nouvelle interview ou nouvel article qui n'y est pas encore.
// Rien n'est stocké : avant de publier, le script relit les derniers messages du compte et saute
// toute publication dont le lien y figure déjà. Seules les publications des 3 derniers jours sont
// prises en compte, pour ne pas republier tout le site au premier lancement.
//
// Variables d'environnement (secrets GitHub, voir README) :
//   MASTODON_INSTANCE : adresse du serveur, ex. https://sunny.garden
//   MASTODON_TOKEN    : jeton d'accès (autorisations read:accounts, read:statuses, write:statuses)
//   ESSAI=1           : facultatif, affiche les messages sans rien publier
// Essai à la main : MASTODON_INSTANCE=… MASTODON_TOKEN=… ESSAI=1 node scripts/mastodon.mjs

const SITE = "https://sorcieres-mortelles.fr";
const HASHTAGS = "#art #artists"; // ajoutés en fin de message ; à modifier librement
const JOURS = 3;                       // âge maximal d'une publication pour être annoncée

const { MASTODON_INSTANCE, MASTODON_TOKEN } = process.env;
const ESSAI = !!process.env.ESSAI && process.env.ESSAI !== "false";

async function annoncer() {
  if (!MASTODON_INSTANCE || !MASTODON_TOKEN) throw new Error("Secret MASTODON_INSTANCE ou MASTODON_TOKEN manquant");
  // Seule l'adresse du serveur compte (https://sunny.garden) : un éventuel /@compte à la suite est ignoré.
  const api = new URL(MASTODON_INSTANCE).origin + "/api/v1";
  // Tolère un jeton collé avec des espaces, un retour à la ligne ou le mot « Bearer » devant.
  const auth = { Authorization: "Bearer " + MASTODON_TOKEN.trim().replace(/^Bearer\s+/i, "") };
  const json = async (u, opt) => {
    const r = await fetch(u, opt);
    if (!r.ok) throw new Error(`${u} a répondu ${r.status} : ${await r.text()}`);
    return r.json();
  };

  const [en, fr] = await Promise.all([lireFlux(SITE + "/rss-en.xml"), lireFlux(SITE + "/rss.xml")]);
  const titresFr = new Map(fr.map(i => [i.guid.replace(/#.*$/, ""), i.titre]));
  const recents = en.filter(i => Date.now() - i.date < JOURS * 864e5);
  if (!recents.length) return console.log("Aucune publication de moins de 3 jours : rien à faire.");

  const moi = await json(api + "/accounts/verify_credentials", { headers: auth });
  console.log(`Compte : @${moi.acct}${ESSAI ? " (essai : rien ne sera publié)" : ""}`);
  const deja = await json(`${api}/accounts/${moi.id}/statuses?limit=40&exclude_replies=true&exclude_reblogs=true`, { headers: auth });
  const dejaVu = lien => deja.some(s => (s.content || "").includes(lien) || (s.card && s.card.url === lien));

  let n = 0;
  // Du plus ancien au plus récent, pour que le fil Mastodon suive l'ordre des publications.
  for (const i of recents.reverse()) {
    if (dejaVu(i.lien)) { console.log("Déjà sur Mastodon :", i.lien); continue; }
    const message = rediger(i, titresFr.get(i.guid.replace(/#.*$/, "")));
    n++;
    console.log("----\n" + message + "\n----");
    if (ESSAI) continue;
    const s = await json(api + "/statuses", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json", "Idempotency-Key": i.guid },
      body: JSON.stringify({ status: message, visibility: "public", language: "en" })
    });
    console.log("Publié sur Mastodon :", s.url);
  }
  if (!n) console.log("Rien de nouveau à publier.");
}

function rediger(i, titreFr) {
  const annonce = /interview/i.test(i.categorie) ? "New interview" : "New article";
  const fr = titreFr && titreFr !== i.titre ? `\n\n🇫🇷 ${titreFr}` : "";
  const fin = `\n\n${i.lien}\n\n${HASHTAGS}`.trimEnd();
  let resume = i.resume ? `\n\n${i.resume}` : "";
  const tete = `✦ ${annonce}\n\n${i.titre}${i.artiste ? `\nby ${i.artiste}` : ""}`;
  // Mastodon limite à 500 caractères : on raccourcit le résumé si besoin.
  const reste = 490 - (tete + fr + fin).length;
  if (resume.length > reste) resume = reste > 10 ? resume.slice(0, reste - 1).trimEnd() + "…" : "";
  return tete + resume + fr + fin;
}

// Lecture simple du flux généré par build.js (format connu, pas besoin d'un vrai analyseur XML).
async function lireFlux(u) {
  const r = await fetch(u, { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) throw new Error(`${u} a répondu ${r.status}`);
  const xml = await r.text();
  const champ = (b, n) => { const m = b.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`)); return m ? texte(m[1]) : ""; };
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, b]) => ({
    titre: champ(b, "title"), lien: champ(b, "link"), guid: champ(b, "guid"),
    date: Date.parse(champ(b, "pubDate")), categorie: champ(b, "category"),
    artiste: champ(b, "dc:creator"), resume: champ(b, "description")
  }));
}
const texte = s => s.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim()
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

annoncer().catch(e => { console.error("Erreur :", e.message); process.exit(1); });
