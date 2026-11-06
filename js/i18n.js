/* Langue : le français est écrit dans la page, l'anglais vient de ce dictionnaire.
   Les textes du jeu lui-même sont bilingues dans js/defi.js (objets { fr, en }). */
let LANG = "fr";
const EN = {
  "Le défi": "The challenge",
  "Sept tickets inspirés de situations réelles : SharePoint, DNS, Odoo, Power Automate, SQL, diagnostic de panne et un script Python à écrire. Le chrono tourne, les mauvais clics coûtent des points.":
    "Seven tickets inspired by real situations: SharePoint, DNS, Odoo, Power Automate, SQL, outage diagnosis and a Python script to write. The clock is running and wrong clicks cost points.",
  "Relever le défi": "Take the challenge",
  "Voir le code sur GitHub ↗": "See the code on GitHub ↗",
  "top 5 · ce navigateur": "top 5 · this browser",
  "le développeur · score à battre": "the developer · score to beat",
  "Aucun score pour l'instant. Le premier sera le vôtre.": "No score yet. The first one will be yours.",
  Classement: "Leaderboard",
  "Indice (−50)": "Hint (−50)",
  Quitter: "Quit",
  Langue: "Language",
  "Développeur full-stack": "Full-stack developer",
  "Un extrait de mon portfolio, sans dépendance ni étape de construction.":
    "An extract from my portfolio, with no dependency and no build step.",
  "Le défi · Es-tu meilleur que le développeur ?": "The challenge · Are you better than the developer?",
};
const EN_RICH = {
  defiH: "Are you better than <em>the developer</em>?",
  defiP:
    "A SharePoint library that vanishes, a website unreachable after a domain renewal, an Odoo invoice without VAT, a silent Power Automate flow, a SQL report full of duplicates, a general outage at 8:02 am, then a Python function to write and get through the tests. <b>1,400 points</b> at stake, about 20 minutes.",
};
const TITLE = document.title;
const t = (str) => (LANG === "en" && EN[str] !== undefined ? EN[str] : str);
const frText = new WeakMap(),
  frHtml = new WeakMap(),
  frAttr = new WeakMap();
const ATTRS = ["aria-label", "alt", "title"];

function textNodes(root) {
  const out = [];
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const p = n.parentElement;
      if (!p || p.closest("script, style, [data-rich]")) return NodeFilter.FILTER_REJECT;
      return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  let n;
  while ((n = it.nextNode())) out.push(n);
  return out;
}

function applyLang() {
  document.documentElement.lang = LANG;
  document.title = t(TITLE);
  textNodes(document.body).forEach((n) => {
    if (!frText.has(n)) frText.set(n, n.nodeValue);
    const fr = frText.get(n),
      core = fr.trim(),
      i = fr.indexOf(core);
    /* la mise en forme du HTML peut couper une phrase sur plusieurs lignes : on compare sans les retours */
    n.nodeValue = fr.slice(0, i) + t(core.replace(/\s+/g, " ")) + fr.slice(i + core.length);
  });
  document.querySelectorAll("[data-rich]").forEach((el) => {
    if (!frHtml.has(el)) frHtml.set(el, el.innerHTML);
    el.innerHTML = LANG === "en" && EN_RICH[el.dataset.rich] ? EN_RICH[el.dataset.rich] : frHtml.get(el);
  });
  document.querySelectorAll(ATTRS.map((a) => "[" + a + "]").join(",")).forEach((el) => {
    if (!frAttr.has(el)) frAttr.set(el, Object.fromEntries(ATTRS.filter((a) => el.hasAttribute(a)).map((a) => [a, el.getAttribute(a)])));
    const o = frAttr.get(el);
    for (const a in o) el.setAttribute(a, t(o[a]));
  });
  document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === LANG));
  document.dispatchEvent(new Event("langchange"));
}

function setLang(l, persist) {
  LANG = l === "en" ? "en" : "fr";
  try {
    if (persist) localStorage.setItem("lang", LANG);
  } catch (e) {}
  applyLang();
}

document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang, true)));

/* Langue initiale : ?lang=, puis choix mémorisé, puis langue du navigateur. Appelée après le chargement du jeu. */
window.addEventListener("DOMContentLoaded", () => {
  let l = null;
  try {
    l = new URLSearchParams(location.search).get("lang") || localStorage.getItem("lang");
  } catch (e) {}
  if (!l) l = (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
  setLang(l, false);
});
