/*
 * Dashbord-router og rendrere for niv 0-3.
 *
 * URL-parametre styrer hvilket niv som vises:
 *   /                         niv 0 (alle departementer)
 *   ?dep=10                   niv 1 (ett departement)
 *   ?dep=10&po=04             niv 2 (ett programomraade)
 *   ?dep=10&po=04&post=174001 niv 3 (en post)
 *
 * Alle visuelle valg leses fra CSS-tokens via getComputedStyle.
 * Tall formateres paa norsk konvensjon (komma desimaltegn, ikke-brytende
 * mellomrom mellom tall og enhet).
 */

"use strict";

const SI_NOK_TIL_MRD = 1e9;
const SI_NOK_TIL_MILL = 1e6;

// --- Hjelpere ---

function lesCssToken(navn) {
  return getComputedStyle(document.documentElement).getPropertyValue(navn).trim();
}

function formaterMrd(nok) {
  if (nok === null || nok === undefined) return "—";
  const mrd = nok / SI_NOK_TIL_MRD;
  return mrd.toLocaleString("nb-NO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formaterMill(nok) {
  if (nok === null || nok === undefined) return "—";
  const mill = nok / SI_NOK_TIL_MILL;
  return mill.toLocaleString("nb-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formaterBeloep(nok) {
  if (nok === null || nok === undefined) return "—";
  if (Math.abs(nok) >= SI_NOK_TIL_MRD) {
    return `${formaterMrd(nok)} mrd. kr`;
  }
  return `${formaterMill(nok)} mill. kr`;
}

function formaterProsent(pst) {
  if (pst === null || pst === undefined) return "—";
  const tegn = pst >= 0 ? "+" : "";
  return `${tegn}${pst.toLocaleString("nb-NO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

function endringsklasse(pst) {
  if (pst === null || pst === undefined) return "";
  if (pst > 0.05) return "endring--positiv";
  if (pst < -0.05) return "endring--negativ";
  return "";
}

function bruddBadgeHtml({ liten = false, beskrivelse = "" } = {}) {
  // Varseltrekant-SVG som markerer strukturelt brudd. Inline for aa
  // unngaa ekstra HTTP-request og for at den arver currentColor fra CSS.
  const klasse = liten ? "brudd-badge brudd-badge--liten" : "brudd-badge";
  const tittel = beskrivelse
    ? `Strukturelt brudd: ${beskrivelse}`
    : "Strukturelt brudd";
  const ikonSvg = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2 1 21h22L12 2zm0 6 7.5 13h-15L12 8zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>`;
  const tekst = liten ? "" : `<span>Brudd</span>`;
  return `<span class="${klasse}" role="img" aria-label="${escapeHtml(
    tittel
  )}" title="${escapeHtml(tittel)}">${ikonSvg}${tekst}</span>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

// --- URL-tilstand ---

function lesUrlTilstand() {
  const u = new URL(window.location.href);
  const ptRaw = u.searchParams.get("pt");
  const trRaw = u.searchParams.get("tr");
  const trNum = trRaw !== null ? Number(trRaw) : null;
  const tab = u.searchParams.get("tab");
  const kalkBelopRaw = u.searchParams.get("kalk_belop");
  const kalkBelopNum = kalkBelopRaw !== null ? Number(kalkBelopRaw) : null;
  return {
    dep: u.searchParams.get("dep") ? parseInt(u.searchParams.get("dep"), 10) : null,
    po: u.searchParams.get("po")
      ? parseInt(u.searchParams.get("po"), 10)
      : null,
    post: u.searchParams.get("post")
      ? parseInt(u.searchParams.get("post"), 10)
      : null,
    q: u.searchParams.get("q") || "",
    pt: ptRaw ? ptRaw.split(",").filter(Boolean) : [],
    fra: u.searchParams.get("fra") ? parseInt(u.searchParams.get("fra"), 10) : null,
    til: u.searchParams.get("til") ? parseInt(u.searchParams.get("til"), 10) : null,
    tr: trNum !== null && Number.isFinite(trNum) && trNum >= 0 ? trNum : null,
    tab: tab === "priskalkulator" ? "priskalkulator" : "drilldown",
    kalkDep: u.searchParams.get("kalk_dep")
      ? parseInt(u.searchParams.get("kalk_dep"), 10)
      : null,
    kalkPo: u.searchParams.get("kalk_po")
      ? parseInt(u.searchParams.get("kalk_po"), 10)
      : null,
    kalkPost: u.searchParams.get("kalk_post")
      ? parseInt(u.searchParams.get("kalk_post"), 10)
      : null,
    kalkFra: u.searchParams.get("kalk_fra")
      ? parseInt(u.searchParams.get("kalk_fra"), 10)
      : null,
    kalkTil: u.searchParams.get("kalk_til")
      ? parseInt(u.searchParams.get("kalk_til"), 10)
      : null,
    kalkBelop:
      kalkBelopNum !== null && Number.isFinite(kalkBelopNum) ? kalkBelopNum : null,
  };
}

function lagUrl({
  dep = null,
  po = null,
  post = null,
  q = "",
  pt = [],
  fra = null,
  til = null,
  tr = null,
  tab = "drilldown",
  kalkDep = null,
  kalkPo = null,
  kalkPost = null,
  kalkFra = null,
  kalkTil = null,
  kalkBelop = null,
} = {}) {
  const params = new URLSearchParams();
  if (tab === "priskalkulator") {
    params.set("tab", "priskalkulator");
    if (kalkDep !== null) params.set("kalk_dep", kalkDep);
    if (kalkPo !== null) params.set("kalk_po", kalkPo);
    if (kalkPost !== null) params.set("kalk_post", kalkPost);
    if (kalkFra !== null) params.set("kalk_fra", kalkFra);
    if (kalkTil !== null) params.set("kalk_til", kalkTil);
    if (kalkBelop !== null) params.set("kalk_belop", kalkBelop);
  } else {
    if (dep !== null) params.set("dep", dep);
    if (po !== null) params.set("po", po);
    if (post !== null) params.set("post", post);
    if (q) params.set("q", q);
    if (pt && pt.length > 0) params.set("pt", pt.join(","));
    if (fra !== null) params.set("fra", fra);
    if (til !== null) params.set("til", til);
    if (tr !== null) params.set("tr", tr);
  }
  const sok = params.toString();
  return sok ? `?${sok}` : window.location.pathname;
}

function gjeldendePeriode(metadata) {
  // Brukerens valgte periode hvis satt i URL, ellers metadata-default.
  const { fra, til } = lesUrlTilstand();
  return {
    fra: fra !== null ? fra : metadata.start,
    til: til !== null ? til : metadata.slutt,
  };
}

function realvekstFraTidsserie(tidsserie, fraAr, tilAr) {
  const fraP = tidsserie.find((p) => p.ar === fraAr);
  const tilP = tidsserie.find((p) => p.ar === tilAr);
  if (!fraP || !tilP) return { realvekst_pst: null, fra: fraP, til: tilP };
  if (fraP.reell === null || tilP.reell === null || fraP.reell === 0) {
    return { realvekst_pst: null, fra: fraP, til: tilP };
  }
  return {
    realvekst_pst: (tilP.reell / fraP.reell - 1) * 100,
    fra: fraP,
    til: tilP,
  };
}

// Flagg som settes naar router skal flytte fokus til ny seksjon
// (drilldown eller popstate), men ikke ved rene filter-oppdateringer.
let SKAL_FLYTTE_FOKUS = false;

function naviger(state) {
  const naa = lesUrlTilstand();
  const samlet = {
    q: naa.q,
    pt: naa.pt,
    fra: naa.fra,
    til: naa.til,
    tr: naa.tr,
    tab: naa.tab,
    kalkDep: naa.kalkDep,
    kalkPo: naa.kalkPo,
    kalkPost: naa.kalkPost,
    kalkFra: naa.kalkFra,
    kalkTil: naa.kalkTil,
    kalkBelop: naa.kalkBelop,
    ...state,
  };
  const url = lagUrl(samlet);
  window.history.pushState(samlet, "", url);
  SKAL_FLYTTE_FOKUS = true;
  router();
}

function settFilterStateOgRender({ q, pt, fra, til, tr } = {}) {
  // Bevarer drilldown-nivaa, oppdaterer kun filter-delene av URL.
  const naa = lesUrlTilstand();
  const ny = {
    dep: naa.dep,
    po: naa.po,
    post: naa.post,
    q: q !== undefined ? q : naa.q,
    pt: pt !== undefined ? pt : naa.pt,
    fra: fra !== undefined ? fra : naa.fra,
    til: til !== undefined ? til : naa.til,
    tr: tr !== undefined ? tr : naa.tr,
  };
  const url = lagUrl(ny);
  window.history.replaceState(ny, "", url);
  router();
}

// --- Filter-hjelpere ---

function normaliserSoek(s) {
  return (s || "").toString().trim().toLowerCase();
}

function _matcherTekst(felt, q) {
  return normaliserSoek(felt).includes(q);
}

function postMatcher(post, q, postTyper) {
  if (postTyper.length > 0) {
    if (!postTyper.includes(post.post_type)) return false;
  }
  if (!q) return true;
  return (
    _matcherTekst(post.post_navn, q) ||
    _matcherTekst(post.kapittel, q) ||
    _matcherTekst(String(post.kapittel_nr), q) ||
    _matcherTekst(String(post.post_nr).padStart(2, "0"), q) ||
    _matcherTekst(String(post.post_nr), q) ||
    _matcherTekst(String(post.post_id), q)
  );
}

function programomraadeMatcher(po, q, postTyper) {
  // Et programomraade matcher hvis det selv matcher tekst og minst en
  // av postene under matcher post-type-filteret (eller post-type er tomt).
  // Ved tekstsoek matcher vi ogsaa via underliggende poster.
  const harTypeMatch =
    postTyper.length === 0 || po.poster.some((p) => postTyper.includes(p.post_type));
  if (!harTypeMatch) return false;

  if (!q) return true;
  if (_matcherTekst(po.navn, q) || _matcherTekst(String(po.nr), q)) return true;
  return po.poster.some((p) => postMatcher(p, q, postTyper));
}

function departementMatcher(dep, q, postTyper) {
  // Bruker dep.post_typer fra oversikt.json hvis tilgjengelig.
  if (postTyper.length > 0) {
    const dt = dep.post_typer || [];
    if (!postTyper.some((t) => dt.includes(t))) return false;
  }
  if (!q) return true;
  return _matcherTekst(dep.navn, q) || _matcherTekst(String(dep.id), q);
}

function terskelMatcher(element, terskel) {
  // Tar et element med beregnet realvekst_pst. Returnerer true hvis
  // terskel ikke er satt eller hvis |realvekst| >= terskel. Elementer
  // uten beregnet realvekst (null) faller ut naar terskel er satt.
  if (terskel === null || terskel === undefined || !Number.isFinite(terskel)) {
    return true;
  }
  if (element.realvekst_pst === null || element.realvekst_pst === undefined) {
    return false;
  }
  return Math.abs(element.realvekst_pst) >= terskel;
}

// --- Tilgjengelighetshjelpere ---

function foretrekkerReduserteAnimasjoner() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function plotlyConfig() {
  return {
    displayModeBar: false,
    responsive: true,
    locale: "nb",
    // Slaar av Plotly-overgangsanimasjoner naar bruker har satt
    // prefers-reduced-motion: reduce. Animasjon styres ogsaa av
    // layout.transition i nyere Plotly, men config-flagget gir
    // robusthet paa tvers av versjoner.
  };
}

function plotlyLayoutTransisjon() {
  return foretrekkerReduserteAnimasjoner()
    ? { duration: 0 }
    : { duration: 250, easing: "cubic-in-out" };
}

// --- Cache for departement-filer ---

const DEP_CACHE = new Map();

async function hentDepartement(dep_id) {
  if (DEP_CACHE.has(dep_id)) return DEP_CACHE.get(dep_id);
  const respons = await fetch(`data/departementer/${dep_id}.json`, { cache: "no-cache" });
  if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
  const data = await respons.json();
  DEP_CACHE.set(dep_id, data);
  return data;
}

let OVERSIKT_CACHE = null;
async function hentOversikt() {
  if (OVERSIKT_CACHE) return OVERSIKT_CACHE;
  const respons = await fetch("data/oversikt.json", { cache: "no-cache" });
  if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
  OVERSIKT_CACHE = await respons.json();
  return OVERSIKT_CACHE;
}

// --- Tidsserie-graf (delt mellom niv 1-3) ---

function rendrerTidsserie(elementId, tidsserie, opts = {}) {
  const primaerFarge = lesCssToken("--graf-linje-reell") || "#1a3a6d";
  const sekundaerFarge = lesCssToken("--graf-linje-nominell") || "#6e6e6e";
  const tekstFarge = lesCssToken("--farge-tekst") || "#1a1a1a";
  const dempetFarge = lesCssToken("--farge-tekst-dempet") || "#6e6e6e";
  const kantFarge = lesCssToken("--graf-rutenett") || "#d4d4d4";
  const fontStack = lesCssToken("--font-stack-sans") || "system-ui, sans-serif";

  const aar = tidsserie.map((p) => p.ar);
  const nominell = tidsserie.map((p) =>
    p.nominell !== null ? p.nominell / SI_NOK_TIL_MRD : null
  );
  const reell = tidsserie.map((p) =>
    p.reell !== null ? p.reell / SI_NOK_TIL_MRD : null
  );

  const traceReell = {
    type: "scatter",
    mode: "lines+markers",
    name: "Reell (2024-kroner)",
    x: aar,
    y: reell,
    line: { color: primaerFarge, width: 2.5 },
    marker: { color: primaerFarge, size: 7 },
    hovertemplate: "%{x}: <b>%{y:.1f}</b> mrd. kr<extra>Reell</extra>",
  };
  const traceNominell = {
    type: "scatter",
    mode: "lines+markers",
    name: "Nominell",
    x: aar,
    y: nominell,
    line: { color: sekundaerFarge, width: 2, dash: "dot" },
    marker: { color: sekundaerFarge, size: 6 },
    hovertemplate: "%{x}: <b>%{y:.1f}</b> mrd. kr<extra>Nominell</extra>",
  };

  const layout = {
    margin: { l: 60, r: 20, t: 20, b: 50 },
    height: 360,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: fontStack, color: tekstFarge, size: 13 },
    xaxis: {
      title: { text: "År", standoff: 10 },
      gridcolor: kantFarge,
      tickformat: "d",
    },
    yaxis: {
      title: { text: "Mrd. kr", standoff: 10 },
      gridcolor: kantFarge,
      zeroline: true,
      zerolinecolor: dempetFarge,
    },
    legend: {
      orientation: "h",
      y: -0.18,
      x: 0,
    },
    hovermode: "x unified",
    transition: plotlyLayoutTransisjon(),
  };

  Plotly.newPlot(elementId, [traceNominell, traceReell], layout, plotlyConfig());
}

// --- Toppliste-graf (delt mellom niv 0, 1, 2) ---

function rendrerToppliste(elementId, rader, { metrikk = "realvekst_pst" } = {}) {
  // rader = [{navn, realvekst_pst, reell_start, reell_slutt, klikkbar_url}]
  const primaerFarge = lesCssToken("--farge-primaer") || "#1a3a6d";
  const primaerMork = lesCssToken("--farge-primaer-mork") || "#0a1f3d";
  const advarselFarge = lesCssToken("--farge-advarsel") || "#8a5a00";
  const tekstFarge = lesCssToken("--farge-tekst") || "#1a1a1a";
  const tekstInvertert = lesCssToken("--farge-tekst-invertert") || "#ffffff";
  const dempetFarge = lesCssToken("--farge-tekst-dempet") || "#6e6e6e";
  const kantFarge = lesCssToken("--graf-rutenett") || "#d4d4d4";
  const overflateFarge = lesCssToken("--farge-overflate") || "#ffffff";
  const fontStack = lesCssToken("--font-stack-sans") || "system-ui, sans-serif";

  const sortert = [...rader].sort((a, b) => {
    const av = a[metrikk] === null ? -Infinity : a[metrikk];
    const bv = b[metrikk] === null ? -Infinity : b[metrikk];
    return av - bv;
  });

  const farger = sortert.map((r) =>
    r.har_strukturelt_brudd ? advarselFarge : primaerFarge
  );

  const trace = {
    type: "bar",
    orientation: "h",
    x: sortert.map((r) => (r[metrikk] === null ? 0 : r[metrikk])),
    y: sortert.map((r) => r.navn),
    marker: {
      color: farger,
      // Liten kant mot bakgrunnen gjoer at stolpene tydeligere ser
      // ut som knapper man kan klikke paa.
      line: { color: overflateFarge, width: 1 },
    },
    text: sortert.map((r) => formaterProsent(r[metrikk])),
    textposition: "outside",
    cliponaxis: false,
    hovertemplate: "<b>%{y}</b><br>Realvekst: %{x:.1f} %<br><i>Klikk for aa se under</i><extra></extra>",
    hoverlabel: {
      bgcolor: primaerMork,
      bordercolor: primaerMork,
      font: { color: tekstInvertert, family: fontStack, size: 13 },
    },
  };

  const layout = {
    margin: { l: 260, r: 80, t: 20, b: 50 },
    height: Math.max(360, sortert.length * 36 + 80),
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: fontStack, color: tekstFarge, size: 13 },
    xaxis: {
      title: { text: "Realvekst (pst.)", standoff: 16 },
      gridcolor: kantFarge,
      zeroline: true,
      zerolinecolor: dempetFarge,
      ticksuffix: " %",
    },
    yaxis: { automargin: true, tickfont: { size: 13 } },
    showlegend: false,
    transition: plotlyLayoutTransisjon(),
  };

  Plotly.newPlot(elementId, [trace], layout, plotlyConfig());
}

// --- Brodsmulesti ---

function renderBrodsmule(steg) {
  // steg = [{tekst, url|null, brudd?}]; siste har url=null og er aria-current.
  // brudd=true viser et lite varseltrekant-ikon ved siden av teksten.
  const nav = document.getElementById("brodsmule");
  if (!nav) return;
  const ol = nav.querySelector("ol");
  ol.innerHTML = "";
  for (const [i, s] of steg.entries()) {
    const li = document.createElement("li");
    const badgeHtml = s.brudd ? bruddBadgeHtml({ liten: true }) : "";
    if (i === steg.length - 1) {
      li.setAttribute("aria-current", "page");
      li.innerHTML = `${escapeHtml(s.tekst)}${badgeHtml}`;
    } else {
      const a = document.createElement("a");
      a.href = s.url;
      // Retningspil signaliserer at lenken gaar tilbake i hierarkiet.
      a.innerHTML = `<span class="brodsmule__pil" aria-hidden="true">‹</span>${escapeHtml(
        s.tekst
      )}${badgeHtml}`;
      a.setAttribute("aria-label", `Gaa tilbake til ${s.tekst}`);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        // Konverter url tilbake til state
        const u = new URL(s.url, window.location.origin);
        const state = {
          dep: u.searchParams.get("dep") ? parseInt(u.searchParams.get("dep"), 10) : null,
          po: u.searchParams.get("po")
            ? parseInt(u.searchParams.get("po"), 10)
            : null,
          post: u.searchParams.get("post")
            ? parseInt(u.searchParams.get("post"), 10)
            : null,
        };
        naviger(state);
      });
      li.appendChild(a);
    }
    ol.appendChild(li);
  }
}

// --- Filter-panel: UI-binding ---

let FILTER_INIT_DONE = false;

function settUtFilterPanel(metadata) {
  const liste = document.getElementById("filter-posttype-liste");
  if (liste) {
    const typer = metadata?.post_typer || [];
    const { pt } = lesUrlTilstand();
    const valgt = new Set(pt);
    if (typer.length === 0) {
      liste.innerHTML = `<p class="filter-felt__hjelp">Ingen post-typer i datasettet.</p>`;
    } else {
      liste.innerHTML = typer
        .map(
          (t) => `
      <label class="filter-posttype-valg">
        <input type="checkbox" value="${escapeHtml(t)}" ${
          valgt.has(t) ? "checked" : ""
        } />
        <span>${escapeHtml(t)}</span>
      </label>`
        )
        .join("");
    }
  }
  settUtPeriodeDropdowns(metadata);
}

function settUtPeriodeDropdowns(metadata) {
  const fraSel = document.getElementById("filter-fra-aar");
  const tilSel = document.getElementById("filter-til-aar");
  if (!fraSel || !tilSel) return;
  const start = metadata.start;
  const slutt = metadata.slutt;
  const { fra, til } = gjeldendePeriode(metadata);
  const aar = [];
  for (let a = start; a <= slutt; a += 1) aar.push(a);
  // Fra-dropdown: alle aar opp til til-1 (kan ikke vaere lik til)
  fraSel.innerHTML = aar
    .map(
      (a) =>
        `<option value="${a}" ${a === fra ? "selected" : ""} ${
          a >= til ? "disabled" : ""
        }>${a}</option>`
    )
    .join("");
  tilSel.innerHTML = aar
    .map(
      (a) =>
        `<option value="${a}" ${a === til ? "selected" : ""} ${
          a <= fra ? "disabled" : ""
        }>${a}</option>`
    )
    .join("");
}

function bindFilterUi() {
  if (FILTER_INIT_DONE) return;
  FILTER_INIT_DONE = true;

  const soek = document.getElementById("filter-soek");
  const nullstill = document.getElementById("filter-nullstill");
  const liste = document.getElementById("filter-posttype-liste");
  const fraSel = document.getElementById("filter-fra-aar");
  const tilSel = document.getElementById("filter-til-aar");
  const terskel = document.getElementById("filter-terskel");

  let timeout = null;
  soek.addEventListener("input", (e) => {
    const v = e.target.value;
    clearTimeout(timeout);
    timeout = setTimeout(() => settFilterStateOgRender({ q: v }), 180);
  });

  liste.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
      const valgt = Array.from(
        liste.querySelectorAll('input[type="checkbox"]:checked')
      ).map((c) => c.value);
      settFilterStateOgRender({ pt: valgt });
    }
  });

  fraSel.addEventListener("change", (e) => {
    settFilterStateOgRender({ fra: parseInt(e.target.value, 10) });
  });
  tilSel.addEventListener("change", (e) => {
    settFilterStateOgRender({ til: parseInt(e.target.value, 10) });
  });

  let terskelTimeout = null;
  terskel.addEventListener("input", (e) => {
    const raa = e.target.value;
    clearTimeout(terskelTimeout);
    terskelTimeout = setTimeout(() => {
      if (raa === "" || raa === null) {
        settFilterStateOgRender({ tr: null });
        return;
      }
      const num = Number(raa);
      if (!Number.isFinite(num) || num < 0) {
        settFilterStateOgRender({ tr: null });
        return;
      }
      settFilterStateOgRender({ tr: num });
    }, 220);
  });

  nullstill.addEventListener("click", () => {
    soek.value = "";
    terskel.value = "";
    liste
      .querySelectorAll('input[type="checkbox"]:checked')
      .forEach((c) => (c.checked = false));
    settFilterStateOgRender({ q: "", pt: [], fra: null, til: null, tr: null });
  });
}

function oppdaterFilterStatus(antallVist, antallTotalt, etikett, metadata) {
  const status = document.getElementById("filter-status");
  const nullstill = document.getElementById("filter-nullstill");
  const panel = document.querySelector(".filter-panel");
  const { q, pt, fra, til, tr } = lesUrlTilstand();
  const periodeEndret =
    metadata !== undefined &&
    ((fra !== null && fra !== metadata.start) ||
      (til !== null && til !== metadata.slutt));
  const aktivt = q || pt.length > 0 || periodeEndret || tr !== null;
  nullstill.hidden = !aktivt;
  if (panel) {
    panel.classList.toggle("filter-panel--aktivt", Boolean(aktivt));
  }
  const deler = [];
  if (q || pt.length > 0 || tr !== null) {
    deler.push(`viser ${antallVist} av ${antallTotalt} ${etikett}`);
  }
  if (periodeEndret) {
    const { fra: f, til: t } = gjeldendePeriode(metadata);
    deler.push(`periode ${f}–${t}`);
  }
  if (tr !== null) {
    const trTekst = tr.toLocaleString("nb-NO", {
      maximumFractionDigits: 1,
    });
    deler.push(`terskel |realvekst| ≥ ${trTekst} %`);
  }
  status.textContent = deler.length > 0 ? `Filter aktivt: ${deler.join("; ")}.` : "";
}

function tomStateHtml() {
  return `
    <section class="filter-tom-state" role="status">
      <h3>Ingen treff</h3>
      <p>Ingen elementer matcher det aktive filteret. Juster søket eller fjern post-type-valg.</p>
    </section>
  `;
}

function synkroniserFilterInputer() {
  const { q, pt, tr } = lesUrlTilstand();
  const soek = document.getElementById("filter-soek");
  if (soek && soek.value !== q) soek.value = q;
  const liste = document.getElementById("filter-posttype-liste");
  if (liste) {
    const valgt = new Set(pt);
    liste.querySelectorAll('input[type="checkbox"]').forEach((c) => {
      c.checked = valgt.has(c.value);
    });
  }
  const terskel = document.getElementById("filter-terskel");
  if (terskel) {
    const onsket = tr !== null ? String(tr) : "";
    if (terskel.value !== onsket && document.activeElement !== terskel) {
      terskel.value = onsket;
    }
  }
  // Periode-dropdownene rebygges fra metadata i settUtFilterPanel,
  // saa de plukker opp valgt periode der.
}

// --- VIEW: niv 0 (alle departementer) ---

async function visNiva0() {
  const data = await hentOversikt();
  settUtFilterPanel(data.metadata);
  synkroniserFilterInputer();
  renderBrodsmule([{ tekst: "Alle departementer", url: null }]);

  const { q, pt, tr } = lesUrlTilstand();
  const periode = gjeldendePeriode(data.metadata);
  const qNorm = normaliserSoek(q);
  const alleDeps = data.departementer.map((d) => {
    const rv = realvekstFraTidsserie(d.tidsserie, periode.fra, periode.til);
    return {
      ...d,
      realvekst_pst: rv.realvekst_pst,
      reell_start: rv.fra ? rv.fra.reell : null,
      reell_slutt: rv.til ? rv.til.reell : null,
      nominell_start: rv.fra ? rv.fra.nominell : null,
      nominell_slutt: rv.til ? rv.til.nominell : null,
    };
  });
  // Re-sorter med samme regel som server: brudd nederst, deretter synkende
  alleDeps.sort(
    (a, b) =>
      (a.har_strukturelt_brudd ? 1 : 0) - (b.har_strukturelt_brudd ? 1 : 0) ||
      (b.realvekst_pst ?? -1e9) - (a.realvekst_pst ?? -1e9)
  );
  const filtrerteDeps = alleDeps
    .filter((d) => departementMatcher(d, qNorm, pt))
    .filter((d) => terskelMatcher(d, tr));
  oppdaterFilterStatus(
    filtrerteDeps.length,
    alleDeps.length,
    "departementer",
    data.metadata
  );

  if (filtrerteDeps.length === 0) {
    document.getElementById("hovedinnhold").innerHTML = tomStateHtml();
    return;
  }

  const sammenlignbare = filtrerteDeps.filter(
    (d) => !d.har_strukturelt_brudd && d.realvekst_pst !== null
  );
  const hoyest =
    sammenlignbare.length > 0
      ? sammenlignbare.reduce((a, b) =>
          a.realvekst_pst > b.realvekst_pst ? a : b
        )
      : null;
  const lavest =
    sammenlignbare.length > 0
      ? sammenlignbare.reduce((a, b) =>
          a.realvekst_pst < b.realvekst_pst ? a : b
        )
      : null;

  const html = `
    <section class="kpi-rad" aria-labelledby="kpi-tittel">
      <h2 id="kpi-tittel" class="visuelt-skjult">Nøkkeltall</h2>
      ${kpi("Periode", `${periode.fra}–${periode.til}`, `Realvekst i ${data.metadata.basisaar}-kroner`)}
      ${kpi("Departementer", String(filtrerteDeps.length), "I valgt filter")}
      ${kpi("Høyeste realvekst", hoyest ? formaterProsent(hoyest.realvekst_pst) : "—", hoyest?.navn || "")}
      ${kpi("Laveste realvekst (uten brudd)", lavest ? formaterProsent(lavest.realvekst_pst) : "—", lavest?.navn || "")}
    </section>

    <section class="toppliste" aria-labelledby="topp-tittel">
      <header class="seksjon-header">
        <p class="seksjon-kicker">Drilldown — klikk for å gå videre</p>
        <h2 id="topp-tittel">Realvekst per departement</h2>
        <p class="seksjon-beskrivelse">
          Sortert synkende på realvekst i perioden ${periode.fra}–${periode.til},
          i reelle ${data.metadata.basisaar}-kroner. Klikk på en stolpe
          eller en rad i tabellen under for å se programområder under
          departementet. Departementer med strukturelle brudd er markert
          i oransje og plassert nederst.
        </p>
      </header>
      <figure>
        <div class="graf-wrapper">
          <p class="klikk-hint" aria-hidden="true">Klikk en stolpe →</p>
          <div id="toppliste-graf" class="graf" role="img"
               aria-label="Horisontal stolpegraf med realvekst per departement"></div>
        </div>
        <details class="tabell-alternativ">
          <summary>Vis som tabell</summary>
          ${depTabell(filtrerteDeps, periode)}
        </details>
        <figcaption class="metode-merknad">
          Reell bevilgning beregnes ved kumulativ prisindeks med basisår
          ${data.metadata.basisaar}. Postnummer 60–69 bruker kommunal deflator;
          øvrige bruker statsbudsjettets utgiftsdeflator.
        </figcaption>
      </figure>
    </section>

    ${bruddSeksjonHtml(filtrerteDeps.filter((d) => d.har_strukturelt_brudd))}
  `;
  document.getElementById("hovedinnhold").innerHTML = html;

  rendrerToppliste("toppliste-graf", filtrerteDeps);

  // Klikk på stolpe -> drilldown
  document.getElementById("toppliste-graf").on("plotly_click", (ev) => {
    const navn = ev.points[0].y;
    const dep = filtrerteDeps.find((d) => d.navn === navn);
    if (dep) naviger({ dep: dep.id });
  });
}

// --- VIEW: niv 1 (ett departement) ---

async function visNiva1(dep_id) {
  const data = await hentDepartement(dep_id);
  settUtFilterPanel(data.metadata);
  synkroniserFilterInputer();
  const dep = data.departement;
  renderBrodsmule([
    { tekst: "Alle departementer", url: lagUrl() },
    { tekst: dep.navn, url: null, brudd: dep.har_strukturelt_brudd },
  ]);

  const { q, pt, tr } = lesUrlTilstand();
  const periode = gjeldendePeriode(data.metadata);
  const qNorm = normaliserSoek(q);
  const allePo = data.programomraader.map((po) => ({
    ...po,
    realvekst_pst: realvekstFraTidsserie(po.tidsserie, periode.fra, periode.til)
      .realvekst_pst,
  }));
  const filtrerteProgramomraader = allePo
    .filter((po) => programomraadeMatcher(po, qNorm, pt))
    .filter((po) => terskelMatcher(po, tr));
  oppdaterFilterStatus(
    filtrerteProgramomraader.length,
    allePo.length,
    "programområder",
    data.metadata
  );

  // Bygg "raader" for toppliste
  const po_rader = filtrerteProgramomraader.map((po) => ({
    navn: `${po.nr} ${po.navn}`,
    realvekst_pst: po.realvekst_pst,
    har_strukturelt_brudd: false,
    _po_nr: po.nr,
  }));

  const depRv = realvekstFraTidsserie(dep.tidsserie, periode.fra, periode.til);
  const startReell = depRv.fra?.reell;
  const sluttReell = depRv.til?.reell;
  const sluttNominell = depRv.til?.nominell;

  const html = `
    <section class="kpi-rad">
      <h2 class="visuelt-skjult">Nøkkeltall for ${escapeHtml(dep.navn)}</h2>
      ${kpi("Reell bevilgning " + periode.til, formaterBeloep(sluttReell), `I ${data.metadata.basisaar}-kroner`)}
      ${kpi("Nominell bevilgning " + periode.til, formaterBeloep(sluttNominell), "")}
      ${kpi("Realvekst " + periode.fra + "–" + periode.til, formaterProsent(depRv.realvekst_pst), "", endringsklasse(depRv.realvekst_pst))}
      ${kpi("Programområder", String(filtrerteProgramomraader.length), `${tellPoster(filtrerteProgramomraader)} poster totalt`)}
    </section>

    ${dep.har_strukturelt_brudd ? bruddAdvarselHtml(dep) : ""}

    <section class="tidsserie-seksjon" aria-labelledby="serie-tittel">
      <header class="seksjon-header">
        <h2 id="serie-tittel">Utvikling ${data.metadata.start}–${data.metadata.slutt}</h2>
        <p class="seksjon-beskrivelse">
          Reell bevilgning (heltrukken linje) sammenlignet med nominell (stiplet).
        </p>
      </header>
      <figure>
        <div id="tidsserie-graf" class="graf" role="img"
             aria-label="Tidsserie nominell og reell bevilgning"></div>
        <details class="tabell-alternativ">
          <summary>Vis som tabell</summary>
          ${tidsserieTabell(dep.tidsserie)}
        </details>
        <figcaption class="metode-merknad">
          Reell bevilgning i ${data.metadata.basisaar}-kroner. Deflator anvendt per
          postnummer (60–69 = kommunal, ellers statlig).
        </figcaption>
      </figure>
    </section>

    <section class="toppliste" aria-labelledby="po-tittel">
      <header class="seksjon-header">
        <p class="seksjon-kicker">Drilldown — klikk for å gå videre</p>
        <h2 id="po-tittel">Programområder under ${escapeHtml(dep.navn)}</h2>
        <p class="seksjon-beskrivelse">
          Klikk på en stolpe eller en rad i tabellen for å se postene under programområdet.
        </p>
      </header>
      ${
        filtrerteProgramomraader.length === 0
          ? tomStateHtml()
          : `<figure>
        <div class="graf-wrapper">
          <p class="klikk-hint" aria-hidden="true">Klikk en stolpe →</p>
          <div id="po-graf" class="graf" role="img"
               aria-label="Horisontal stolpegraf med realvekst per programområde"></div>
        </div>
        <details class="tabell-alternativ">
          <summary>Vis som tabell</summary>
          ${poTabell(filtrerteProgramomraader, dep_id)}
        </details>
      </figure>`
      }
    </section>
  `;
  document.getElementById("hovedinnhold").innerHTML = html;

  rendrerTidsserie("tidsserie-graf", dep.tidsserie);
  if (filtrerteProgramomraader.length > 0) {
    rendrerToppliste("po-graf", po_rader);
  }

  if (filtrerteProgramomraader.length > 0) {
    document.getElementById("po-graf").on("plotly_click", (ev) => {
      const navn = ev.points[0].y;
      const po = po_rader.find((p) => p.navn === navn);
      if (po) naviger({ dep: dep_id, po: po._po_nr });
    });
  }

  // Tabell-rad-klikk og a[data-naviger-*]-klikk haandteres av en
  // global handler i router() etter at innholdet er rendret.
}

// --- VIEW: niv 2 (ett programomraade) ---

async function visNiva2(dep_id, po_nr) {
  const data = await hentDepartement(dep_id);
  settUtFilterPanel(data.metadata);
  synkroniserFilterInputer();
  const dep = data.departement;
  const po = data.programomraader.find((p) => p.nr === po_nr);
  if (!po) {
    visIkkeFunnet(`Programområde ${po_nr} finnes ikke under ${dep.navn}.`);
    return;
  }
  const { q, pt, tr } = lesUrlTilstand();
  const periode = gjeldendePeriode(data.metadata);
  const qNorm = normaliserSoek(q);
  const poRv = realvekstFraTidsserie(po.tidsserie, periode.fra, periode.til);
  const allePoster = po.poster.map((p) => ({
    ...p,
    realvekst_pst: realvekstFraTidsserie(p.tidsserie, periode.fra, periode.til)
      .realvekst_pst,
  }));
  const filtrertePoster = allePoster
    .filter((p) => postMatcher(p, qNorm, pt))
    .filter((p) => terskelMatcher(p, tr));
  oppdaterFilterStatus(
    filtrertePoster.length,
    allePoster.length,
    "poster",
    data.metadata
  );

  renderBrodsmule([
    { tekst: "Alle departementer", url: lagUrl() },
    {
      tekst: dep.navn,
      url: lagUrl({ dep: dep_id }),
      brudd: dep.har_strukturelt_brudd,
    },
    { tekst: `${po.nr} ${po.navn}`, url: null },
  ]);

  const startReell = poRv.fra?.reell;
  const sluttReell = poRv.til?.reell;
  const sluttNominell = poRv.til?.nominell;

  const post_rader = filtrertePoster.map((post) => ({
    navn: `kap. ${post.kapittel_nr} post ${String(post.post_nr).padStart(2, "0")} – ${post.post_navn}`,
    realvekst_pst: post.realvekst_pst,
    har_strukturelt_brudd: false,
    _post_id: post.post_id,
  }));

  const html = `
    <section class="kpi-rad">
      <h2 class="visuelt-skjult">Nøkkeltall for ${escapeHtml(po.navn)}</h2>
      ${kpi("Reell bevilgning " + periode.til, formaterBeloep(sluttReell), `I ${data.metadata.basisaar}-kroner`)}
      ${kpi("Nominell bevilgning " + periode.til, formaterBeloep(sluttNominell), "")}
      ${kpi("Realvekst " + periode.fra + "–" + periode.til, formaterProsent(poRv.realvekst_pst), "", endringsklasse(poRv.realvekst_pst))}
      ${kpi("Antall poster", String(filtrertePoster.length), filtrertePoster.length === allePoster.length ? "" : `av ${allePoster.length} totalt`)}
    </section>

    <section class="tidsserie-seksjon">
      <header class="seksjon-header">
        <h2>Utvikling 2014–2026</h2>
      </header>
      <figure>
        <div id="tidsserie-graf" class="graf" role="img"
             aria-label="Tidsserie nominell og reell bevilgning"></div>
        <details class="tabell-alternativ">
          <summary>Vis som tabell</summary>
          ${tidsserieTabell(po.tidsserie)}
        </details>
      </figure>
    </section>

    <section class="toppliste">
      <header class="seksjon-header">
        <p class="seksjon-kicker">Drilldown — klikk for å gå videre</p>
        <h2>Poster under programområde ${po.nr}</h2>
        <p class="seksjon-beskrivelse">
          Sortert synkende på realvekst. Klikk på en stolpe eller en rad
          i tabellen under for å se en post i detalj.
        </p>
      </header>
      ${
        filtrertePoster.length === 0
          ? tomStateHtml()
          : `<figure>
        <div class="graf-wrapper">
          <p class="klikk-hint" aria-hidden="true">Klikk en stolpe →</p>
          <div id="poster-graf" class="graf" role="img"
               aria-label="Horisontal stolpegraf med realvekst per post"></div>
        </div>
        <details class="tabell-alternativ">
          <summary>Vis som tabell</summary>
          ${posterTabell(filtrertePoster, dep_id, po.nr)}
        </details>
      </figure>`
      }
    </section>
  `;
  document.getElementById("hovedinnhold").innerHTML = html;

  rendrerTidsserie("tidsserie-graf", po.tidsserie);
  if (filtrertePoster.length > 0) {
    rendrerToppliste("poster-graf", post_rader);
    document.getElementById("poster-graf").on("plotly_click", (ev) => {
      const navn = ev.points[0].y;
      const post = post_rader.find((p) => p.navn === navn);
      if (post) naviger({ dep: dep_id, po: po_nr, post: post._post_id });
    });
  }
}

// --- VIEW: niv 3 (en post) ---

async function visNiva3(dep_id, po_nr, post_id) {
  const data = await hentDepartement(dep_id);
  settUtFilterPanel(data.metadata);
  synkroniserFilterInputer();
  oppdaterFilterStatus(1, 1, "post", data.metadata);
  const dep = data.departement;
  const po = data.programomraader.find((p) => p.nr === po_nr);
  if (!po) {
    visIkkeFunnet(`Programområde ${po_nr} finnes ikke under ${dep.navn}.`);
    return;
  }
  const post = po.poster.find((p) => p.post_id === post_id);
  if (!post) {
    visIkkeFunnet(`Post ${post_id} finnes ikke under programområde ${po_nr}.`);
    return;
  }

  const periode = gjeldendePeriode(data.metadata);
  const postRv = realvekstFraTidsserie(post.tidsserie, periode.fra, periode.til);

  renderBrodsmule([
    { tekst: "Alle departementer", url: lagUrl() },
    {
      tekst: dep.navn,
      url: lagUrl({ dep: dep_id }),
      brudd: dep.har_strukturelt_brudd,
    },
    { tekst: `${po.nr} ${po.navn}`, url: lagUrl({ dep: dep_id, po: po_nr }) },
    { tekst: post.post_navn, url: null },
  ]);

  const startReell = postRv.fra?.reell;
  const sluttReell = postRv.til?.reell;
  const sluttNominell = postRv.til?.nominell;

  const html = `
    <section class="kpi-rad">
      <h2 class="visuelt-skjult">Nøkkeltall</h2>
      ${kpi("Reell bevilgning " + periode.til, formaterBeloep(sluttReell), `I ${data.metadata.basisaar}-kroner`)}
      ${kpi("Nominell bevilgning " + periode.til, formaterBeloep(sluttNominell), "")}
      ${kpi("Realvekst " + periode.fra + "–" + periode.til, formaterProsent(postRv.realvekst_pst), "", endringsklasse(postRv.realvekst_pst))}
      ${kpi("Deflator", post.deflator_type === "kommunal" ? "Kommunal" : "Statsbudsjettets utgiftsdeflator", `Post-type: ${post.post_type || "—"}`)}
    </section>

    <section class="metadata-blokk">
      <h2 class="visuelt-skjult">Metadata om posten</h2>
      <dl class="metadata">
        <div><dt>Departement</dt><dd>${escapeHtml(dep.navn)}</dd></div>
        <div><dt>Programområde</dt><dd>${po.nr} ${escapeHtml(po.navn)}</dd></div>
        <div><dt>Kapittel</dt><dd>${post.kapittel_nr} ${escapeHtml(post.kapittel)}</dd></div>
        <div><dt>Post</dt><dd>${String(post.post_nr).padStart(2, "0")} ${escapeHtml(post.post_navn)}</dd></div>
        <div><dt>Post-id</dt><dd class="tall">${post.post_id}</dd></div>
        <div><dt>Deflator</dt><dd>${post.deflator_type === "kommunal" ? "Kommunal" : "Statlig"} (postnummer ${post.post_nr})</dd></div>
      </dl>
    </section>

    <section class="tidsserie-seksjon">
      <header class="seksjon-header">
        <h2>År-for-år for ${escapeHtml(post.post_navn)}</h2>
      </header>
      <figure>
        <div id="tidsserie-graf" class="graf" role="img"
             aria-label="Tidsserie for posten"></div>
        ${tidsserieTabell(post.tidsserie, true)}
        <figcaption class="metode-merknad">
          Reell verdi i ${data.metadata.basisaar}-kroner via
          ${post.deflator_type === "kommunal" ? "kommunal deflator" : "statsbudsjettets utgiftsdeflator"}.
        </figcaption>
      </figure>
    </section>
  `;
  document.getElementById("hovedinnhold").innerHTML = html;
  rendrerTidsserie("tidsserie-graf", post.tidsserie);
}

// --- HTML-fragmentbyggere ---

function kpi(etikett, tall, beskrivelse, ekstraKlasse = "") {
  return `
    <article class="kpi" data-variant="standard">
      <p class="kpi__etikett">${escapeHtml(etikett)}</p>
      <p class="kpi__tall ${ekstraKlasse}"><span class="tall">${escapeHtml(tall)}</span></p>
      <p class="kpi__beskrivelse">${escapeHtml(beskrivelse)}</p>
    </article>
  `;
}

function tellPoster(programomraader) {
  return programomraader.reduce((sum, po) => sum + po.poster.length, 0);
}

function depTabell(departementer, periode) {
  const rader = departementer
    .map((d) => {
      const badge = d.har_strukturelt_brudd
        ? bruddBadgeHtml({ liten: true, beskrivelse: d.brudd_beskrivelse || "" })
        : "";
      const realvekstCelle =
        d.realvekst_pst === null
          ? `<span class="mangler-data" title="Mangler endepunkt for sammenligning">—</span>`
          : formaterProsent(d.realvekst_pst);
      const merknad = d.har_strukturelt_brudd
        ? `<span class="mangler-data">${escapeHtml(
            d.brudd_beskrivelse || "Strukturelt brudd"
          )}</span>`
        : "";
      return `
    <tr class="rad--klikkbar" data-naviger-dep="${d.id}">
      <th scope="row"><a href="${lagUrl({ dep: d.id })}" data-naviger-dep="${d.id}">${escapeHtml(d.navn)}</a>${badge}</th>
      <td class="tall-kol">${realvekstCelle}</td>
      <td class="tall-kol">${formaterMrd(d.reell_start)}</td>
      <td class="tall-kol">${formaterMrd(d.reell_slutt)}</td>
      <td>${merknad}</td>
      <td class="kol-chevron" aria-hidden="true">›</td>
    </tr>`;
    })
    .join("");
  return `
    <table>
      <caption class="visuelt-skjult">Realvekst per departement. Hver rad lenker til departementsdetaljer.</caption>
      <thead>
        <tr>
          <th scope="col">Departement</th>
          <th scope="col" class="tall-kol">Realvekst (pst.)</th>
          <th scope="col" class="tall-kol">Reell ${periode.fra} (mrd. kr)</th>
          <th scope="col" class="tall-kol">Reell ${periode.til} (mrd. kr)</th>
          <th scope="col">Merknad</th>
          <th scope="col" class="kol-chevron" aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>${rader}</tbody>
    </table>
  `;
}

function poTabell(programomraader, dep_id) {
  const rader = programomraader
    .map((po) => {
      const realvekstCelle =
        po.realvekst_pst === null
          ? `<span class="mangler-data" title="Mangler endepunkt for sammenligning">—</span>`
          : formaterProsent(po.realvekst_pst);
      return `
    <tr class="rad--klikkbar" data-naviger-po="${po.nr}" data-dep-id="${dep_id}">
      <th scope="row"><a href="${lagUrl({ dep: dep_id, po: po.nr })}" data-naviger-po="${po.nr}">${po.nr} ${escapeHtml(po.navn)}</a></th>
      <td class="tall-kol">${realvekstCelle}</td>
      <td class="tall-kol">${po.poster.length}</td>
      <td class="kol-chevron" aria-hidden="true">›</td>
    </tr>`;
    })
    .join("");
  return `
    <table>
      <caption class="visuelt-skjult">Realvekst per programområde under valgt departement. Hver rad lenker til programområdedetaljer.</caption>
      <thead>
        <tr>
          <th scope="col">Programområde</th>
          <th scope="col" class="tall-kol">Realvekst (pst.)</th>
          <th scope="col" class="tall-kol">Poster</th>
          <th scope="col" class="kol-chevron" aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>${rader}</tbody>
    </table>
  `;
}

function posterTabell(poster, dep_id, po_nr) {
  const rader = poster
    .map((p) => {
      const realvekstCelle =
        p.realvekst_pst === null
          ? `<span class="mangler-data" title="Mangler endepunkt for sammenligning">—</span>`
          : formaterProsent(p.realvekst_pst);
      return `
    <tr class="rad--klikkbar" data-naviger-post="${p.post_id}" data-dep-id="${dep_id}" data-po-nr="${po_nr}">
      <th scope="row">
        <a href="${lagUrl({ dep: dep_id, po: po_nr, post: p.post_id })}" data-naviger-post="${p.post_id}">
          kap. ${p.kapittel_nr} post ${String(p.post_nr).padStart(2, "0")} – ${escapeHtml(p.post_navn)}
        </a>
      </th>
      <td class="tall-kol">${realvekstCelle}</td>
      <td>${p.deflator_type === "kommunal" ? "Kommunal" : "Statlig"}</td>
      <td class="kol-chevron" aria-hidden="true">›</td>
    </tr>`;
    })
    .join("");
  return `
    <table>
      <caption class="visuelt-skjult">Realvekst per post under valgt programområde. Hver rad lenker til postdetaljer.</caption>
      <thead>
        <tr>
          <th scope="col">Post</th>
          <th scope="col" class="tall-kol">Realvekst (pst.)</th>
          <th scope="col">Deflator</th>
          <th scope="col" class="kol-chevron" aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>${rader}</tbody>
    </table>
  `;
}

function tidsserieTabell(tidsserie, alltidSynlig = false) {
  const rader = tidsserie
    .map(
      (p) => `
    <tr>
      <th scope="row" class="tall">${p.ar}</th>
      <td class="tall-kol">${formaterBeloep(p.nominell)}</td>
      <td class="tall-kol">${formaterBeloep(p.reell)}</td>
    </tr>`
    )
    .join("");
  const tabell = `
    <table>
      <caption class="visuelt-skjult">Nominell og reell bevilgning per år</caption>
      <thead>
        <tr>
          <th scope="col">År</th>
          <th scope="col" class="tall-kol">Nominell</th>
          <th scope="col" class="tall-kol">Reell</th>
        </tr>
      </thead>
      <tbody>${rader}</tbody>
    </table>
  `;
  return alltidSynlig
    ? `<div class="tabell-alternativ" style="margin-top: var(--avstand-m)">${tabell}</div>`
    : tabell;
}

function bruddAdvarselHtml(dep) {
  return `
    <aside class="brudd-advarsel" role="note">
      ${bruddBadgeHtml({ liten: false, beskrivelse: dep.brudd_beskrivelse || "" })}
      <span>${escapeHtml(dep.brudd_beskrivelse || "Departementet har en omorganisering som gjør tidsserien upålitelig.")}</span>
    </aside>
  `;
}

function bruddSeksjonHtml(brudd) {
  if (brudd.length === 0) return "";
  const kort = brudd
    .map(
      (d) => `
    <li class="brudd-kort">
      <h3>${escapeHtml(d.navn)}</h3>
      <p>${escapeHtml(d.brudd_beskrivelse || "")}</p>
    </li>`
    )
    .join("");
  return `
    <section class="brudd-seksjon" aria-labelledby="brudd-tittel">
      <header class="seksjon-header">
        <h2 id="brudd-tittel">Strukturelle brudd</h2>
        <p class="seksjon-beskrivelse">
          Disse departementene har omorganiseringer eller mangler historikk.
          Realvekst-tall for hele perioden kan ikke tolkes direkte.
        </p>
      </header>
      <ul class="brudd-liste">${kort}</ul>
    </section>
  `;
}

// --- Feilvisning ---

// --- Tab-navigering og priskalkulator ---

function oppdaterTabUi(tab) {
  document.querySelectorAll("[role='tab']").forEach((knapp) => {
    const aktiv = knapp.dataset.tab === tab;
    knapp.classList.toggle("tab--aktiv", aktiv);
    knapp.setAttribute("aria-selected", aktiv ? "true" : "false");
  });
}

function settPanelerSynlige(synlig) {
  const filter = document.querySelector(".filter-panel");
  const brodsmule = document.getElementById("brodsmule");
  if (filter) filter.hidden = !synlig;
  if (brodsmule) brodsmule.hidden = !synlig;
}

function bindTabUi() {
  document.querySelectorAll("[role='tab']").forEach((knapp) => {
    if (knapp.dataset.bundet) return;
    knapp.dataset.bundet = "1";
    knapp.addEventListener("click", () => {
      const tab = knapp.dataset.tab;
      naviger({ tab, dep: null, po: null, post: null });
    });
  });
}

function priskonvertering(prisindeks, deflatorType, beloep, fraAr, tilAr) {
  // Returnerer beløp i til-år-kroner basert på kumulativ prisindeks
  // for valgt deflator-type. Returnerer null hvis år mangler eller
  // input er ugyldig.
  if (!Number.isFinite(beloep) || beloep < 0) return null;
  if (!prisindeks || !prisindeks.aar) return null;
  const idxFra = prisindeks.aar.indexOf(fraAr);
  const idxTil = prisindeks.aar.indexOf(tilAr);
  if (idxFra === -1 || idxTil === -1) return null;
  const serie = deflatorType === "kommunal" ? prisindeks.kommunal : prisindeks.statlig;
  const pFra = serie[idxFra];
  const pTil = serie[idxTil];
  if (!pFra || !pTil) return null;
  return beloep * (pTil / pFra);
}

function formaterKroner(belop) {
  return new Intl.NumberFormat("nb-NO", {
    maximumFractionDigits: 0,
  }).format(Math.round(belop));
}

async function visPriskalkulator() {
  const oversikt = await hentOversikt();
  const meta = oversikt.metadata;
  const aar = meta.prisindeks?.aar || [];
  const state = lesUrlTilstand();

  // Defaults: konverter fra start til slutt i metadata.
  const fraAr = state.kalkFra ?? meta.start;
  const tilAr = state.kalkTil ?? meta.slutt;
  const belop = state.kalkBelop ?? 100000;
  const deflatorType = state.kalkPo === 60 ? "kommunal" : "statlig";

  const resultat = priskonvertering(meta.prisindeks, deflatorType, belop, fraAr, tilAr);

  const aarValg = (selected) =>
    aar.map((a) => `<option value="${a}" ${a === selected ? "selected" : ""}>${a}</option>`).join("");

  const deflatorValg = `
    <label class="kalkulator__felt">
      <span class="filter-felt__etikett">Deflator-type</span>
      <select id="kalk-deflator">
        <option value="statlig" ${deflatorType === "statlig" ? "selected" : ""}>
          Statsbudsjettets utgiftsdeflator (post 01–59, 70–89)
        </option>
        <option value="kommunal" ${deflatorType === "kommunal" ? "selected" : ""}>
          Kommunal deflator (post 60–69)
        </option>
      </select>
    </label>`;

  const main = document.getElementById("hovedinnhold");
  main.innerHTML = `
    <section class="kalkulator" aria-labelledby="kalk-tittel">
      <header class="seksjon-header">
        <p class="seksjon-kicker">Verktøy</p>
        <h2 id="kalk-tittel">Priskalkulator</h2>
        <p class="seksjon-beskrivelse">
          Beregn hva et beløp i ett år tilsvarer i et annet år, justert
          med Finansdepartementets utgiftsdeflator eller kommunal deflator.
          Velg deflator-type etter postnummeret: 60–69-serien bruker
          kommunal deflator; øvrige bruker statsbudsjettets utgiftsdeflator.
        </p>
      </header>

      <form class="kalkulator__skjema" id="kalk-skjema" aria-describedby="kalk-resultat">
        <label class="kalkulator__felt">
          <span class="filter-felt__etikett">Beløp (kr)</span>
          <input
            type="number"
            id="kalk-belop"
            min="0"
            step="1"
            inputmode="numeric"
            value="${belop}"
            aria-describedby="kalk-belop-hjelp"
          />
          <span id="kalk-belop-hjelp" class="filter-felt__hjelp">
            Nominelle kroner i fra-året.
          </span>
        </label>

        <label class="kalkulator__felt">
          <span class="filter-felt__etikett">Fra år</span>
          <select id="kalk-fra">${aarValg(fraAr)}</select>
        </label>

        <label class="kalkulator__felt">
          <span class="filter-felt__etikett">Til år</span>
          <select id="kalk-til">${aarValg(tilAr)}</select>
        </label>

        ${deflatorValg}
      </form>

      <div class="kalkulator__resultat" id="kalk-resultat" aria-live="polite">
        ${
          resultat !== null
            ? `<p class="kalkulator__svar">
                 <span class="kalkulator__belop">${formaterKroner(belop)} kr</span>
                 i <strong>${fraAr}</strong> tilsvarer
                 <span class="kalkulator__belop kalkulator__belop--frem">
                   ${formaterKroner(resultat)} kr
                 </span>
                 i <strong>${tilAr}</strong>.
               </p>
               <p class="kalkulator__metode">
                 Beregnet med ${deflatorType === "kommunal" ? "kommunal deflator" : "statsbudsjettets utgiftsdeflator"}.
                 Kumulativ prisindeks: ${aarFormel(meta.prisindeks, deflatorType, fraAr, tilAr)}.
               </p>`
            : `<p class="kalkulator__feil">Ugyldig input. Skriv inn et positivt beløp og velg gyldige år.</p>`
        }
      </div>
    </section>
  `;

  bindKalkulatorUi();
}

function aarFormel(prisindeks, deflatorType, fraAr, tilAr) {
  const idxFra = prisindeks.aar.indexOf(fraAr);
  const idxTil = prisindeks.aar.indexOf(tilAr);
  if (idxFra === -1 || idxTil === -1) return "";
  const serie = deflatorType === "kommunal" ? prisindeks.kommunal : prisindeks.statlig;
  return `${serie[idxFra].toFixed(2)} (${fraAr}) → ${serie[idxTil].toFixed(2)} (${tilAr}), basisaar ${prisindeks.basisaar} = 100`;
}

function bindKalkulatorUi() {
  const skjema = document.getElementById("kalk-skjema");
  if (!skjema) return;
  const reager = () => {
    const belopInput = document.getElementById("kalk-belop");
    const fraSelect = document.getElementById("kalk-fra");
    const tilSelect = document.getElementById("kalk-til");
    const defSelect = document.getElementById("kalk-deflator");
    const belop = Number(belopInput.value);
    const fra = parseInt(fraSelect.value, 10);
    const til = parseInt(tilSelect.value, 10);
    // Vi gjenbruker kalkPo-feltet til aa lagre deflator-valget:
    // 60 = kommunal, 0 = statlig. Dette unngaar aa innfore et nytt
    // URL-parameter for et binært valg.
    const kalkPo = defSelect.value === "kommunal" ? 60 : null;
    const naa = lesUrlTilstand();
    const ny = {
      ...naa,
      kalkBelop: Number.isFinite(belop) && belop >= 0 ? belop : null,
      kalkFra: fra,
      kalkTil: til,
      kalkPo,
    };
    const url = lagUrl(ny);
    window.history.replaceState(ny, "", url);
    visPriskalkulator();
  };
  ["change", "input"].forEach((evt) => {
    skjema.addEventListener(evt, () => {
      // Debounce belop-input slik at vi ikke re-rendrer pa hvert tastetrykk.
      clearTimeout(skjema._debounce);
      skjema._debounce = setTimeout(reager, 220);
    });
  });
}

function visIkkeFunnet(melding) {
  document.getElementById("hovedinnhold").innerHTML = `
    <section class="ikke-funnet" role="alert">
      <h2>Ikke funnet</h2>
      <p>${escapeHtml(melding)}</p>
      <p><a href="${lagUrl()}">Tilbake til oversikten</a></p>
    </section>
  `;
}

function visFeil(err) {
  console.error(err);
  document.getElementById("hovedinnhold").innerHTML = `
    <section class="ikke-funnet" role="alert">
      <h2>Kunne ikke laste data</h2>
      <p>${escapeHtml(err.message || "Ukjent feil")}</p>
    </section>
  `;
}

// --- Router ---

async function router() {
  bindFilterUi();
  bindTabUi();
  const main = document.getElementById("hovedinnhold");
  main.setAttribute("aria-busy", "true");

  const { dep, po, post, tab } = lesUrlTilstand();
  oppdaterTabUi(tab);

  try {
    if (tab === "priskalkulator") {
      // Skjul filter-panel og brodsmulesti — de hoerer ikke til kalkulatoren.
      settPanelerSynlige(false);
      await visPriskalkulator();
    } else {
      settPanelerSynlige(true);
      if (dep === null) {
        await visNiva0();
      } else if (po === null) {
        await visNiva1(dep);
      } else if (post === null) {
        await visNiva2(dep, po);
      } else {
        await visNiva3(dep, po, post);
      }
    }

    // Etabler klikk-haandtering for tabell-rader og lenker.
    // Rader har class="rad--klikkbar" og data-naviger-* attributter;
    // hele raden er klikkbar, men lenken i kolonnen er ogsaa
    // tab-bar og blir navigert separat av sin egen handler.
    document.querySelectorAll("tr.rad--klikkbar").forEach((rad) => {
      rad.addEventListener("click", (e) => {
        // Hvis brukeren klikker direkte paa <a>, la den lenkens
        // egen handler ta over for aa unngaa dobbel-navigering.
        if (e.target.closest("a")) return;
        const depId = rad.dataset.navigerDep || rad.dataset.depId;
        const poNr = rad.dataset.navigerPo || rad.dataset.poNr;
        const postId = rad.dataset.navigerPost;
        if (postId) {
          naviger({
            dep: parseInt(depId, 10),
            po: parseInt(poNr, 10),
            post: parseInt(postId, 10),
          });
        } else if (poNr) {
          naviger({ dep: parseInt(depId, 10), po: parseInt(poNr, 10) });
        } else if (depId) {
          naviger({ dep: parseInt(depId, 10) });
        }
      });
    });

    // Lenker inni rader: la dem fungere som SPA-navigering.
    document.querySelectorAll("a[data-naviger-dep]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        naviger({ dep: parseInt(el.dataset.navigerDep, 10) });
      });
    });
    document.querySelectorAll("a[data-naviger-po]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const rad = el.closest("tr");
        const depId = rad?.dataset.depId;
        if (depId) {
          naviger({
            dep: parseInt(depId, 10),
            po: parseInt(el.dataset.navigerPo, 10),
          });
        }
      });
    });
    document.querySelectorAll("a[data-naviger-post]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const rad = el.closest("tr");
        const depId = rad?.dataset.depId;
        const poNr = rad?.dataset.poNr;
        if (depId && poNr) {
          naviger({
            dep: parseInt(depId, 10),
            po: parseInt(poNr, 10),
            post: parseInt(el.dataset.navigerPost, 10),
          });
        }
      });
    });
  } catch (err) {
    visFeil(err);
  } finally {
    main.setAttribute("aria-busy", "false");
    if (SKAL_FLYTTE_FOKUS) {
      // Sett fokus paa foerste overskrift i nytt innhold slik at
      // skjermlesere annonserer nivaaskiftet og tastatur-brukere
      // ikke blir staaende i et utdatert grafelement.
      const foersteH = main.querySelector("h2, h1");
      if (foersteH) {
        if (!foersteH.hasAttribute("tabindex")) {
          foersteH.setAttribute("tabindex", "-1");
        }
        foersteH.focus({ preventScroll: false });
      }
      SKAL_FLYTTE_FOKUS = false;
    }
  }

  // Oppdater footer-metadata uansett
  const cache = OVERSIKT_CACHE || (DEP_CACHE.size > 0 ? [...DEP_CACHE.values()][0] : null);
  if (cache?.metadata) {
    const dato = new Date(cache.metadata.generert);
    const formattert = dato.toLocaleString("nb-NO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const el = document.getElementById("datasett-generert");
    if (el) el.textContent = formattert;
  }
}

window.addEventListener("popstate", () => {
  SKAL_FLYTTE_FOKUS = true;
  router();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", router);
} else {
  router();
}
