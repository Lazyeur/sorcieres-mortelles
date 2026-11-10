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

  // Lettre magique : la lettre flottante et les liens ouvrent la fenêtre d'inscription
  // (sans JavaScript, ils mènent simplement à la page /newsletter/).
  var dlg = document.getElementById("newsletter");
  if (dlg && dlg.showModal) {
    document.querySelectorAll("[data-newsletter]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        dlg.showModal();
        var champ = dlg.querySelector("input[name=EMAIL]");
        if (champ && !dlg.querySelector(".nl-form").hidden) champ.focus();
      });
    });
    dlg.querySelector("[data-fermer]").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }
  document.querySelectorAll("form[data-brevo]").forEach(function (nf) {
    if (!window.fetch || !window.FormData) return;
    nf.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = nf.querySelector("button[type=submit]"), err = nf.querySelector(".erreur"), ok = nf.parentNode.querySelector(".nl-ok");
      nf.querySelector("input[name=LANGUE]").value = h.lang === "en" ? "EN" : "FR";
      nf.querySelector("input[name=locale]").value = h.lang === "en" ? "en" : "fr";
      btn.disabled = true; err.hidden = true;
      fetch(nf.action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(nf) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d.success) throw new Error(); nf.hidden = true; ok.hidden = false; })
        .catch(function () { btn.disabled = false; err.hidden = false; });
    });
  });

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
