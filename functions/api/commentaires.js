// /api/commentaires
//   GET  ?page=article/mon-article  → commentaires publiés de cette page
//   POST { page, nom, message, langue, site }  → nouveau commentaire, en attente de modération
import { json, lister, ajouter } from "../../lib/commentaires.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ erreur: "base" }, 503);
  const page = new URL(request.url).searchParams.get("page");
  const liste = await lister(env.DB, page);
  if (!liste) return json({ erreur: "page" }, 400);
  return json({ commentaires: liste }, 200, { "Cache-Control": "public, max-age=30" });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ erreur: "base" }, 503);
  let donnees;
  try { donnees = await request.json(); } catch (e) { return json({ erreur: "format" }, 400); }
  const origine = new URL(request.url).origin;
  const r = await ajouter(env.DB, env, donnees || {}, request.headers.get("CF-Connecting-IP"), origine);
  if (r.erreur) return json({ erreur: r.erreur }, r.erreur === "trop" ? 429 : 400);
  return json({ ok: true });
}
