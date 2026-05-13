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
} = {}) {
  const params = new URLSearchParams();
  if (dep !== null) params.set("dep", dep);
  if (po !== null) params.set("po", po);
  if (post !== null) params.set("post", post);
  if (q) params.set("q", q);
  if (pt && pt.length > 0) params.set("pt", pt.join(","));
  if (fra !== null) params.set("fra", fra);
  if (til !== null) params.set("til", til);
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

function naviger(state) {
  const naa = lesUrlTilstand();
  const samlet = { q: naa.q, pt: naa.pt, fra: naa.fra, til: naa.til, ...state };
  const url = lagUrl(samlet);
  window.history.pushState(samlet, "", url);
  router();
}

function settFilterStateOgRender({ q, pt, fra, til } = {}) {
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
  };

  const config = { displayModeBar: false, responsive: true, locale: "nb" };
  Plotly.newPlot(elementId, [traceNominell, traceReell], layout, config);
}

// --- Toppliste-graf (delt mellom niv 0, 1, 2) ---

function rendrerToppliste(elementId, rader, { metrikk = "realvekst_pst" } = {}) {
  // rader = [{navn, realvekst_pst, reell_start, reell_slutt, klikkbar_url}]
  const primaerFarge = lesCssToken("--farge-primaer") || "#1a3a6d";
  const advarselFarge = lesCssToken("--farge-advarsel") || "#8a5a00";
  const tekstFarge = lesCssToken("--farge-tekst") || "#1a1a1a";
  const dempetFarge = lesCssToken("--farge-tekst-dempet") || "#6e6e6e";
  const kantFarge = lesCssToken("--graf-rutenett") || "#d4d4d4";
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
    marker: { color: farger },
    text: sortert.map((r) => formaterProsent(r[metrikk])),
    textposition: "outside",
    cliponaxis: false,
    hovertemplate: "<b>%{y}</b><br>Realvekst: %{x:.1f} %<extra></extra>",
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
  };

  const config = { displayModeBar: false, responsive: true, locale: "nb" };
  Plotly.newPlot(elementId, [trace], layout, config);
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
      a.innerHTML = `${escapeHtml(s.tekst)}${badgeHtml}`;
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

  nullstill.addEventListener("click", () => {
    soek.value = "";
    liste
      .querySelectorAll('input[type="checkbox"]:checked')
      .forEach((c) => (c.checked = false));
    settFilterStateOgRender({ q: "", pt: [], fra: null, til: null });
  });
}

function oppdaterFilterStatus(antallVist, antallTotalt, etikett, metadata) {
  const status = document.getElementById("filter-status");
  const nullstill = document.getElementById("filter-nullstill");
  const { q, pt, fra, til } = lesUrlTilstand();
  const periodeEndret =
    metadata !== undefined &&
    ((fra !== null && fra !== metadata.start) ||
      (til !== null && til !== metadata.slutt));
  const aktivt = q || pt.length > 0 || periodeEndret;
  nullstill.hidden = !aktivt;
  const deler = [];
  if (q || pt.length > 0) {
    deler.push(`viser ${antallVist} av ${antallTotalt} ${etikett}`);
  }
  if (periodeEndret) {
    const { fra: f, til: t } = gjeldendePeriode(metadata);
    deler.push(`periode ${f}–${t}`);
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
  const { q, pt } = lesUrlTilstand();
  const soek = document.getElementById("filter-soek");
  if (soek && soek.value !== q) soek.value = q;
  const liste = document.getElementById("filter-posttype-liste");
  if (liste) {
    const valgt = new Set(pt);
    liste.querySelectorAll('input[type="checkbox"]').forEach((c) => {
      c.checked = valgt.has(c.value);
    });
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

  const { q, pt } = lesUrlTilstand();
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
  const filtrerteDeps = alleDeps.filter((d) => departementMatcher(d, qNorm, pt));
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
        <h2 id="topp-tittel">Realvekst per departement</h2>
        <p class="seksjon-beskrivelse">
          Sortert synkende på realvekst i perioden ${periode.fra}–${periode.til},
          i reelle ${data.metadata.basisaar}-kroner. Klikk på en
          stolpe for å se programområder under departementet. Departementer med strukturelle
          brudd er markert i oransje og plassert nederst.
        </p>
      </header>
      <figure>
        <div id="toppliste-graf" class="graf" role="img"
             aria-label="Horisontal stolpegraf med realvekst per departement"></div>
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

  const { q, pt } = lesUrlTilstand();
  const periode = gjeldendePeriode(data.metadata);
  const qNorm = normaliserSoek(q);
  const allePo = data.programomraader.map((po) => ({
    ...po,
    realvekst_pst: realvekstFraTidsserie(po.tidsserie, periode.fra, periode.til)
      .realvekst_pst,
  }));
  const filtrerteProgramomraader = allePo.filter((po) =>
    programomraadeMatcher(po, qNorm, pt)
  );
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
        <h2 id="po-tittel">Programområder under ${escapeHtml(dep.navn)}</h2>
        <p class="seksjon-beskrivelse">
          Klikk på en stolpe eller en rad i tabellen for å gå videre til programområdet.
        </p>
      </header>
      ${
        filtrerteProgramomraader.length === 0
          ? tomStateHtml()
          : `<figure>
        <div id="po-graf" class="graf" role="img"
             aria-label="Horisontal stolpegraf med realvekst per programområde"></div>
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

  // Aktiver tabell-rader som lenker
  document.querySelectorAll("[data-naviger-po]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      naviger({ dep: dep_id, po: el.dataset.navigerPo });
    });
  });
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
  const { q, pt } = lesUrlTilstand();
  const periode = gjeldendePeriode(data.metadata);
  const qNorm = normaliserSoek(q);
  const poRv = realvekstFraTidsserie(po.tidsserie, periode.fra, periode.til);
  const allePoster = po.poster.map((p) => ({
    ...p,
    realvekst_pst: realvekstFraTidsserie(p.tidsserie, periode.fra, periode.til)
      .realvekst_pst,
  }));
  const filtrertePoster = allePoster.filter((p) => postMatcher(p, qNorm, pt));
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
        <h2>Poster under programområde ${po.nr}</h2>
        <p class="seksjon-beskrivelse">
          Sortert synkende på realvekst. Klikk på en stolpe for å se posten i detalj.
        </p>
      </header>
      ${
        filtrertePoster.length === 0
          ? tomStateHtml()
          : `<figure>
        <div id="poster-graf" class="graf" role="img"
             aria-label="Horisontal stolpegraf med realvekst per post"></div>
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
    <tr>
      <th scope="row"><a href="${lagUrl({ dep: d.id })}" data-naviger-dep="${d.id}">${escapeHtml(d.navn)}</a>${badge}</th>
      <td class="tall-kol">${realvekstCelle}</td>
      <td class="tall-kol">${formaterMrd(d.reell_start)}</td>
      <td class="tall-kol">${formaterMrd(d.reell_slutt)}</td>
      <td>${merknad}</td>
    </tr>`;
    })
    .join("");
  return `
    <table>
      <caption class="visuelt-skjult">Realvekst per departement</caption>
      <thead>
        <tr>
          <th scope="col">Departement</th>
          <th scope="col" class="tall-kol">Realvekst (pst.)</th>
          <th scope="col" class="tall-kol">Reell ${periode.fra} (mrd. kr)</th>
          <th scope="col" class="tall-kol">Reell ${periode.til} (mrd. kr)</th>
          <th scope="col">Merknad</th>
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
    <tr>
      <th scope="row"><a href="${lagUrl({ dep: dep_id, po: po.nr })}" data-naviger-po="${po.nr}">${po.nr} ${escapeHtml(po.navn)}</a></th>
      <td class="tall-kol">${realvekstCelle}</td>
      <td class="tall-kol">${po.poster.length}</td>
    </tr>`;
    })
    .join("");
  return `
    <table>
      <thead>
        <tr>
          <th scope="col">Programområde</th>
          <th scope="col" class="tall-kol">Realvekst (pst.)</th>
          <th scope="col" class="tall-kol">Poster</th>
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
    <tr>
      <th scope="row">
        <a href="${lagUrl({ dep: dep_id, po: po_nr, post: p.post_id })}">
          kap. ${p.kapittel_nr} post ${String(p.post_nr).padStart(2, "0")} – ${escapeHtml(p.post_navn)}
        </a>
      </th>
      <td class="tall-kol">${realvekstCelle}</td>
      <td>${p.deflator_type === "kommunal" ? "Kommunal" : "Statlig"}</td>
    </tr>`;
    })
    .join("");
  return `
    <table>
      <thead>
        <tr>
          <th scope="col">Post</th>
          <th scope="col" class="tall-kol">Realvekst (pst.)</th>
          <th scope="col">Deflator</th>
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
  const main = document.getElementById("hovedinnhold");
  main.setAttribute("aria-busy", "true");

  const { dep, po, post } = lesUrlTilstand();
  try {
    if (dep === null) {
      await visNiva0();
    } else if (po === null) {
      await visNiva1(dep);
    } else if (post === null) {
      await visNiva2(dep, po);
    } else {
      await visNiva3(dep, po, post);
    }

    // Etabler klikk-håndtering for tabell-lenker (depTabell)
    document.querySelectorAll("[data-naviger-dep]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        naviger({ dep: parseInt(el.dataset.navigerDep, 10) });
      });
    });
  } catch (err) {
    visFeil(err);
  } finally {
    main.setAttribute("aria-busy", "false");
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

window.addEventListener("popstate", router);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", router);
} else {
  router();
}
