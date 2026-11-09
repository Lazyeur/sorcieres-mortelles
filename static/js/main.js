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
})();
