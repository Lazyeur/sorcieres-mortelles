// Worker Cloudflare « publication-programmee »
// Chaque nuit, demande à Cloudflare Pages de régénérer le site : les publications
// dont la date est arrivée (voir build.js) apparaissent alors d'elles-mêmes.
//
// Installé à la main dans le tableau de bord Cloudflare (Workers & Pages → publication-programmee) :
//   - code : ce fichier, collé dans l'éditeur ;
//   - secret DEPLOY_HOOK : adresse du deploy hook du projet Pages (Settings → Builds → Deploy hooks) ;
//   - déclencheur (Settings → Trigger events → Cron) : 5 23 * * *  (23 h 05 UTC = 0 h 05 à Paris
//     en hiver, 1 h 05 en été : la nouvelle date est déjà commencée en France).

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(declencher(env));
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
