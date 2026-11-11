// /api/moderer : liens Publier / Supprimer du mail de modération.
// GET affiche une page de confirmation (les messageries ouvrent parfois les liens toutes seules,
// donc rien ne change sans un clic sur le bouton) ; POST applique la décision.
import { esc, jetonValide, pageHtml } from "../../lib/commentaires.js";

const ACTIONS = { publier: "Publier", supprimer: "Supprimer" };

async function verifier(env, id, action, j) {
  if (!env.DB) return { titre: "Base indisponible", corps: "<p>La base de données n’est pas reliée au site.</p>" };
  if (!/^\d+$/.test(id || "") || !ACTIONS[action] || !(await jetonValide(env.SECRET_MODERATION, id, action, j)))
    return { titre: "Lien invalide", corps: "<p>Ce lien de modération n’est pas valide.</p>" };
  const c = await env.DB.prepare("SELECT id, page, nom, message, statut FROM commentaires WHERE id = ?").bind(Number(id)).first();
  if (!c) return { titre: "Commentaire introuvable", corps: "<p>Ce commentaire a déjà été supprimé.</p>" };
  return { c };
}

const apercu = c => `<p><strong>${esc(c.nom)}</strong> sur <a href="/${esc(c.page)}/">${esc(c.page)}</a></p><blockquote>${esc(c.message)}</blockquote>`;

export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  const id = p.get("id"), action = p.get("action"), j = p.get("jeton");
  const v = await verifier(env, id, action, j);
  if (!v.c) return pageHtml(v.titre, v.corps);
  const etat = v.c.statut === "publie" ? "<p>Ce commentaire est actuellement <strong>publié</strong>.</p>" : "<p>Ce commentaire est <strong>en attente</strong>.</p>";
  return pageHtml(`${ACTIONS[action]} ce commentaire ?`, `${apercu(v.c)}${etat}
<form method="POST"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="action" value="${esc(action)}"><input type="hidden" name="jeton" value="${esc(j)}">
<button type="submit" class="${action}">${ACTIONS[action]}</button></form>`);
}

export async function onRequestPost({ request, env }) {
  const f = await request.formData();
  const id = f.get("id"), action = f.get("action"), j = f.get("jeton");
  const v = await verifier(env, id, action, j);
  if (!v.c) return pageHtml(v.titre, v.corps);
  if (action === "publier") {
    await env.DB.prepare("UPDATE commentaires SET statut = 'publie' WHERE id = ?").bind(v.c.id).run();
    return pageHtml("Commentaire publié ✦", `${apercu(v.c)}<p>Il apparaît maintenant sur la page (comptez jusqu’à une minute).</p>`);
  }
  await env.DB.prepare("DELETE FROM commentaires WHERE id = ?").bind(v.c.id).run();
  return pageHtml("Commentaire supprimé", `<p>Le commentaire de <strong>${esc(v.c.nom)}</strong> a été définitivement supprimé.</p><p><a href="/${esc(v.c.page)}/">Retour à la page</a></p>`);
}
