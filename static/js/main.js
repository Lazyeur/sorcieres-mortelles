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

  // Commentaires : liste des commentaires publiés + formulaire (envoi en attente de relecture).
  var sec = document.querySelector(".commentaires[data-page]");
  if (sec && window.fetch) {
    var page = sec.getAttribute("data-page"), liste = sec.querySelector(".com-liste"), vide = sec.querySelector(".com-vide");
    var cf = sec.querySelector(".com-form"), cerr = cf.querySelector(".erreur"), cok = sec.querySelector(".com-ok");
    var MSG = {
      fr: { trop: "Vous avez envoyé beaucoup de commentaires : réessayez dans quelques minutes.", nom: "Indiquez un nom ou pseudo (60 caractères maximum).", message: "Votre commentaire est vide ou trop long (3000 caractères maximum).", autre: "L’envoi n’a pas fonctionné. Réessayez dans un instant." },
      en: { trop: "You have sent many comments: please try again in a few minutes.", nom: "Please enter a name or nickname (60 characters max).", message: "Your comment is empty or too long (3000 characters max).", autre: "Sending failed. Please try again in a moment." }
    };
    var dateTxt = function (iso) {
      try { return new Date(iso).toLocaleDateString(h.lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; }
    };
    var afficher = function (items) {
      liste.textContent = "";
      items.forEach(function (c) {
        var art = document.createElement("article"); art.className = "com";
        var tete = document.createElement("p"); tete.className = "com-tete";
        var nom = document.createElement("strong"); nom.textContent = c.nom;
        var date = document.createElement("span"); date.className = "meta"; date.textContent = " · " + dateTxt(c.date);
        tete.appendChild(nom); tete.appendChild(date);
        var txt = document.createElement("p"); txt.className = "com-texte"; txt.textContent = c.message;
        art.appendChild(tete); art.appendChild(txt); liste.appendChild(art);
      });
      vide.hidden = items.length > 0;
    };
    fetch("/api/commentaires?page=" + encodeURIComponent(page))
      .then(function (r) { return r.json(); })
      .then(function (d) { afficher(d.commentaires || []); })
      .catch(function () { vide.hidden = false; });
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = cf.querySelector("button[type=submit]"), l = h.lang === "en" ? "en" : "fr";
      btn.disabled = true; cerr.hidden = true;
      fetch("/api/commentaires", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: page, nom: cf.nom.value, message: cf.message.value, site: cf.site.value, langue: l })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) {
          if (!x.ok || !x.d.ok) throw new Error(x.d.erreur || "autre");
          cf.hidden = true; cok.hidden = false;
        })
        .catch(function (err) {
          btn.disabled = false; cerr.textContent = MSG[l][err.message] || MSG[l].autre; cerr.hidden = false;
        });
    });
  }
})();
