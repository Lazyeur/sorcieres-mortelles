// Bascule français / anglais : tout le contenu bilingue est déjà dans la page,
// ce script ne fait que choisir la langue affichée et la mémoriser.
(function () {
  var h = document.documentElement, b = document.body;
  function set(l, save) {
    h.lang = l;
    document.title = b.getAttribute("data-t-" + l) || document.title;
    var m = document.getElementById("menu");
    m.setAttribute("aria-label", m.getAttribute("data-aria-" + l));
    document.querySelectorAll("[data-lang-btn]").forEach(function (x) {
      x.setAttribute("aria-pressed", x.getAttribute("data-lang-btn") === l ? "true" : "false");
    });
    if (save) { try { localStorage.setItem("sm-lang", l); } catch (e) {} }
  }
  document.getElementById("langues").addEventListener("click", function (e) {
    var x = e.target.closest("button");
    if (x) set(x.getAttribute("data-lang-btn"), true);
  });
  set(h.lang === "en" ? "en" : "fr", false);

  // Formulaire de contact via Web3Forms : envoi sans quitter le site, puis page « Merci ».
  var f = document.querySelector("form[data-web3forms]");
  if (f && window.fetch && window.FormData) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = f.querySelector("button[type=submit]"), err = f.querySelector(".erreur");
      btn.disabled = true; err.hidden = true;
      fetch(f.action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(f) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d.success) throw new Error(d.message); location.href = "/merci/"; })
        .catch(function () { btn.disabled = false; err.hidden = false; });
    });
  }

  // Commentaires Cusdis : chargés seulement sur les pages qui en ont, dans la langue du visiteur.
  if (document.getElementById("cusdis_thread")) {
    var charger = function (src, ensuite) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      if (ensuite) s.onload = s.onerror = ensuite;
      b.appendChild(s);
    };
    var widget = function () { charger("https://cusdis.com/js/cusdis.es.js"); };
    if (h.lang === "fr") charger("https://cusdis.com/js/widget/lang/fr.js", widget); else widget();
  }
})();
