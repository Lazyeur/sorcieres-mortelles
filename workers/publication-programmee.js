// Worker Cloudflare « publication-programmee »
// Deux réveils par jour :
//   - la nuit, il demande à Cloudflare Pages de régénérer le site : les publications
//     dont la date est arrivée (voir build.js) apparaissent alors d'elles-mêmes ;
//   - le matin, il demande à GitHub de lancer l'action Mastodon (.github/workflows/mastodon.yml),
//     qui annonce les nouvelles publications. Les horaires programmés de GitHub ont souvent
//     plusieurs heures de retard ; un lancement demandé ainsi part tout de suite.
//
// Installé à la main dans le tableau de bord Cloudflare (Workers & Pages → publication-programmee) :
//   - code : ce fichier, collé dans l'éditeur ;
//   - secret DEPLOY_HOOK : adresse du deploy hook du projet Pages (Settings → Builds → Deploy hooks) ;
//   - secret GITHUB_TOKEN : jeton GitHub limité au dépôt sorcieres-mortelles, autorisation
//     « Actions : Read and write » seulement (voir README, section Mastodon).
//     ⚠️ Jeton créé le 17/11/2026 pour 90 jours : EXPIRE VERS LE 15/02/2027, à régénérer avant ;
//   - déclencheurs (Settings → Trigger events → Cron), deux lignes :
//       5 23 * * *   régénération (23 h 05 UTC = 0 h 05 à Paris en hiver, 1 h 05 en été)
//       30 6 * * *   Mastodon (6 h 30 UTC = 7 h 30 à Paris en hiver, 8 h 30 en été)

const DEPOT = "Lazyeur/sorcieres-mortelles";
const CRON_MASTODON = "30 6 * * *";

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(event.cron === CRON_MASTODON ? mastodon(env) : declencher(env));
  },
  // Pas de page publique : on peut seulement vérifier que le Worker existe.
  async fetch() {
    return new Response("Publication programmée de sorcieres-mortelles.fr : rien à voir ici.", { status: 404 });
  }
};

async function declencher(env) {
  if (!env.DEPLOY_HOOK) throw new Error("Secret DEPLOY_HOOK manquant");
  const r = await fetch(env.DEPLOY_HOOK, { method: "POST" });
  if (!r.ok) throw new Error(`Le deploy hook a répondu ${r.status}`);
  console.log("Régénération du site demandée :", await r.text());
}

async function mastodon(env) {
  if (!env.GITHUB_TOKEN) throw new Error("Secret GITHUB_TOKEN manquant");
  const r = await fetch(`https://api.github.com/repos/${DEPOT}/actions/workflows/mastodon.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.GITHUB_TOKEN.trim(),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sorcieres-mortelles-worker",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ref: "main", inputs: { essai: "false" } })
  });
  if (!r.ok) throw new Error(`GitHub a répondu ${r.status} : ${await r.text()}`);
  console.log("Action Mastodon lancée sur GitHub.");
}
