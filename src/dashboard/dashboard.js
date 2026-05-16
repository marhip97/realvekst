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
  const typeRaw = u.searchParams.get("type");
  const p90Raw = u.searchParams.get("p90");
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
    // Type-filter for utgifter (default) vs inntekter. Norsk statsbudsjett
    // bruker kapittelserie 0001-2999 for utgifter og 3000-5999 for inntekter.
    type: typeRaw === "inntekt" ? "inntekt" : "utgift",
    // 90-poster (post 90+ = utlaan/kapitaltilskudd). Default ekskludert
    // fordi netto kapitalbevegelser ofte gir negative summer.
    p90: p90Raw === "1",
    kapittel: u.searchParams.get("kapittel")
      ? parseInt(u.searchParams.get("kapittel"), 10)
      : null,
    basis: u.searchParams.get("basis")
      ? parseInt(u.searchParams.get("basis"), 10)
      : null,
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
    kalkPostgruppe: u.searchParams.get("kalk_pg") || null,
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
  type = "utgift",
  p90 = false,
  kapittel = null,
  basis = null,
  kalkDep = null,
  kalkPo = null,
  kalkPost = null,
  kalkFra = null,
  kalkTil = null,
  kalkBelop = null,
  kalkPostgruppe = null,
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
    if (kalkPostgruppe !== null) params.set("kalk_pg", kalkPostgruppe);
  } else {
    if (dep !== null) params.set("dep", dep);
    if (po !== null) params.set("po", po);
    if (post !== null) params.set("post", post);
    if (q) params.set("q", q);
    if (pt && pt.length > 0) params.set("pt", pt.join(","));
    if (fra !== null) params.set("fra", fra);
    if (til !== null) params.set("til", til);
    if (tr !== null) params.set("tr", tr);
    // Type og p90 lagres bare naar de avviker fra default.
    if (type === "inntekt") params.set("type", "inntekt");
    if (p90) params.set("p90", "1");
    if (kapittel !== null) params.set("kapittel", kapittel);
    if (basis !== null) params.set("basis", basis);
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

function effektivtBasisaar(metadata) {
  const { basis } = lesUrlTilstand();
  return basis !== null ? basis : metadata.basisaar;
}

function rebaselineFaktor(metadata) {
  // De prosesserte JSON-filene er deflatert til metadata.basisaar.
  // Naar bruker velger et annet basisaar, re-skaleres alle reelle
  // beloep med forholdstallet mellom kumulative prisindekser.
  // Vi bruker statlig deflator som approksimasjon for aggregerte
  // tall; for ren post-visning er dette presist (de fleste poster
  // bruker statlig deflator) eller naer nok for tolkningsformaal.
  const indeks = metadata.prisindeks;
  const valgt = effektivtBasisaar(metadata);
  if (!indeks || valgt === metadata.basisaar) return 1;
  const i = indeks.aar.indexOf(valgt);
  if (i === -1) return 1;
  return indeks.statlig[i] / 100;
}

function rebaselineReell(verdi, metadata) {
  if (verdi === null || verdi === undefined) return verdi;
  return verdi * rebaselineFaktor(metadata);
}

function snuTallForInntekt(verdi, snu) {
  // Inntektskapitler (3000-5999) er bokfort med negativt fortegn i
  // Statsregnskapet for aa balansere mot utgiftssiden. I dashbordet
  // vises de som positive belop slik at brukeren leser dem som
  // 'inntekt paa X kroner'.
  if (verdi === null || verdi === undefined) return verdi;
  return snu ? -verdi : verdi;
}

function snuTidsserieForInntekt(tidsserie, snu) {
  if (!snu) return tidsserie;
  return tidsserie.map((p) => ({
    ar: p.ar,
    nominell: snuTallForInntekt(p.nominell, true),
    reell: snuTallForInntekt(p.reell, true),
  }));
}

function aggregerPostTidsserier(poster) {
  // Returnerer en aggregert tidsserie ved aa summere nominell og
  // reell paa tvers av postene per aar. Brukes til aa vise KPI og
  // graf for filtrerte utvalg (f.eks. bare inntektsposter under en
  // programkategori).
  const perAr = new Map();
  for (const p of poster) {
    for (const punkt of p.tidsserie) {
      const eksisterende = perAr.get(punkt.ar) || {
        ar: punkt.ar,
        nominell: 0,
        reell: 0,
      };
      if (punkt.nominell !== null) eksisterende.nominell += punkt.nominell;
      if (punkt.reell !== null) eksisterende.reell += punkt.reell;
      perAr.set(punkt.ar, eksisterende);
    }
  }
  return [...perAr.values()].sort((a, b) => a.ar - b.ar);
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
    type: naa.type,
    p90: naa.p90,
    kapittel: naa.kapittel,
    basis: naa.basis,
    kalkDep: naa.kalkDep,
    kalkPo: naa.kalkPo,
    kalkPost: naa.kalkPost,
    kalkFra: naa.kalkFra,
    kalkTil: naa.kalkTil,
    kalkBelop: naa.kalkBelop,
    kalkPostgruppe: naa.kalkPostgruppe,
    ...state,
  };
  const url = lagUrl(samlet);
  window.history.pushState(samlet, "", url);
  SKAL_FLYTTE_FOKUS = true;
  router();
}

function settFilterStateOgRender({
  q,
  pt,
  fra,
  til,
  tr,
  type,
  p90,
  kapittel,
  basis,
} = {}) {
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
    type: type !== undefined ? type : naa.type,
    p90: p90 !== undefined ? p90 : naa.p90,
    kapittel: kapittel !== undefined ? kapittel : naa.kapittel,
    basis: basis !== undefined ? basis : naa.basis,
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

function postgruppeForPost(post) {
  // Mapper postnummer til en av de fem statsbudsjett-postgruppene
  // som ogsaa brukes i realverdikalkulatoren.
  const n = post.post_nr;
  if (n <= 29) return "Utgifter til drift (01–29)";
  if (n <= 49) return "Utgifter til investeringer (30–49)";
  if (n <= 59) return "Overføringer til andre statsregnskap (50–59)";
  if (n <= 69) return "Overføringer til kommuner og fylkeskommuner (60–69)";
  if (n <= 89) return "Andre overføringer (70–89)";
  return "Utlån, kapitaltilskudd, aksjer (90–99)";
}

// Laane- og petroleumstransaksjoner som default ekskluderes fra
// aggregert realvekstanalyse. Inkluderes naar p90-toggle er paa.
// Liste maa holdes synkronisert med LPT_POST_IDS i bygg_datasett.py.
const LPT_POST_IDS_FRONTEND = new Set([
  244030,  // SDOE - investeringer
  280050,  // Overforing til SPU
  280096,  // Finansposter overfort til fondet
  544024, 544030, 544080,  // SDOE-inntekter
  550771, 550772, 550774,  // Petroleumsskatt
  550870,  // CO2-avgift petroleum
  550970,  // NOx-avgift petroleum
  568585,  // Utbytte Equinor
  580050,  // Overforing fra SPU
  599990,  // Statslaanemidler
]);

function postKategoriMatcher(post, type, inkluder90) {
  // Norsk statsbudsjett: kapittel 0001-2999 = utgift, 3000-5999 = inntekt.
  // 'inkluder90'-toggle styrer baade 90-postene (post_nr 90-99) og
  // LPT-postene (laane- og petroleumstransaksjoner). Default ekskludert
  // fordi netto-tall kan vaere negative og bryter realvekst-tolkningen.
  const erUtgift = post.kapittel_nr < 3000;
  const er90 = post.post_nr >= 90 && post.post_nr <= 99;
  const erLpt = LPT_POST_IDS_FRONTEND.has(post.post_id);
  if (type === "utgift" && !erUtgift) return false;
  if (type === "inntekt" && erUtgift) return false;
  if ((er90 || erLpt) && !inkluder90) return false;
  return true;
}

function postBidrarTilAggregat(post) {
  // Alle filtre styres via postKategoriMatcher; denne helperen er
  // beholdt for bakoverkompatibilitet og returnerer alltid true.
  return true;
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
  const { rebaselineTilForsteAar = false } = opts;

  const aar = tidsserie.map((p) => p.ar);
  let nominell = tidsserie.map((p) =>
    p.nominell !== null ? p.nominell / SI_NOK_TIL_MRD : null
  );
  let reell = tidsserie.map((p) =>
    p.reell !== null ? p.reell / SI_NOK_TIL_MRD : null
  );

  // Naar rebaselineTilForsteAar = true (brukes paa post-grafer) skalerer
  // vi reell-serien slik at den moter nominell i grafens forste aar.
  // Da kan brukeren lese relativ utvikling direkte ut av grafen i
  // stedet for aa sammenligne to skalaer mot ulike basispunkter.
  if (rebaselineTilForsteAar && nominell.length > 0) {
    const forsteNom = nominell.find((v) => v !== null && v !== 0);
    const forsteReell = reell.find((v) => v !== null && v !== 0);
    if (forsteNom && forsteReell) {
      const faktor = forsteNom / forsteReell;
      reell = reell.map((v) => (v === null ? null : v * faktor));
    }
  }

  const reellNavn = rebaselineTilForsteAar
    ? "Reell (skalert til samme nivå som nominell i startåret)"
    : "Reell";
  const traceReell = {
    type: "scatter",
    mode: "lines+markers",
    name: reellNavn,
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

function settUtFilterPanel(_metadata) {
  // Post-type-liste og periode-dropdowns er flyttet til hurtignavigasjon;
  // funksjonen beholdes for kompatibilitet med eksisterende kall.
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

  // Filterpanelet inneholder kun terskel + nullstill etter at
  // soek, post-type og periode er flyttet til hurtignavigasjonen.
  // Resterende kontroller bindes om de finnes.
  const nullstill = document.getElementById("filter-nullstill");
  const terskel = document.getElementById("filter-terskel");
  if (!terskel || !nullstill) return;

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
    terskel.value = "";
    settFilterStateOgRender({
      q: "",
      pt: [],
      fra: null,
      til: null,
      tr: null,
      type: "utgift",
      p90: false,
      kapittel: null,
      basis: null,
    });
  });
}

function oppdaterPresetAriaTilstand() {
  // Beholdes som no-op for bakoverkompatibilitet med synkroniserFilterInputer.
}

function oppdaterFilterStatus(antallVist, antallTotalt, etikett, metadata) {
  const status = document.getElementById("filter-status");
  const nullstill = document.getElementById("filter-nullstill");
  const panel = document.querySelector(".filter-panel");
  // Filter-panelet er fjernet — om elementene ikke finnes er det
  // ingenting aa oppdatere.
  if (!status || !nullstill) return;
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
  // saa de plukker opp valgt periode der. Preset-knappen markeres aktiv
  // hvis brukerens valgte periode matcher 'siste 4 aar' fra metadata.
  const meta = OVERSIKT_CACHE?.metadata;
  if (meta) {
    const { fra, til } = lesUrlTilstand();
    const effektivFra = fra !== null ? fra : meta.start;
    const effektivTil = til !== null ? til : meta.slutt;
    const erSiste4 = effektivTil - effektivFra === 4 && effektivTil === meta.slutt;
    oppdaterPresetAriaTilstand(erSiste4 ? "siste4" : null);
  }
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
  const { p90: p90AlleDep } = lesUrlTilstand();
  const alleDeps = data.departementer.map((d) => {
    // Naar 90-toggle er av (default), bruker vi dep.tidsserie_uten_lpt
    // som ekskluderer 90-poster og laane-/petroleumstransaksjoner.
    const serie = p90AlleDep ? d.tidsserie : d.tidsserie_uten_lpt || d.tidsserie;
    const rv = realvekstFraTidsserie(serie, periode.fra, periode.til);
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

  // Samlet realvekst for hele statsbudsjettet basert paa valgt type
  // og 90-post-toggle. Default 'utgift_uten90' viser hele utgiftssiden
  // ekskl. utlaan/kapitaltilskudd. For inntektsserier snus fortegnet
  // saa belop vises som positive tall.
  const { type: typeValg, p90: p90Valg } = lesUrlTilstand();
  const samletKey = `${typeValg}_${p90Valg ? "med90" : "uten90"}`;
  const samletSerieRaa = data.metadata.samlet?.[samletKey] || [];
  const samletSerie = snuTidsserieForInntekt(
    samletSerieRaa,
    typeValg === "inntekt"
  );
  const samletRv = realvekstFraTidsserie(samletSerie, periode.fra, periode.til);
  const samletEtikett =
    typeValg === "inntekt"
      ? "Realvekst statsinntekter"
      : "Realvekst statsutgifter";
  const samletBeskrivelse = `${typeValg === "inntekt" ? "Inntektssiden" : "Utgiftssiden"} av statsbudsjettet${p90Valg ? "" : ", ekskl. 90-poster og låne-/petroleumstransaksjoner"}.`;

  // Topp 10 departementer (ekskl. strukturelle brudd) for stolpegrafen
  // og hovedtabellen. Departementer med brudd vises i egen seksjon.
  const topp10 = filtrerteDeps
    .filter((d) => !d.har_strukturelt_brudd && d.realvekst_pst !== null)
    .slice(0, 10);

  const html = `
    <section class="kpi-rad" aria-labelledby="kpi-tittel">
      <h2 id="kpi-tittel" class="visuelt-skjult">Nøkkeltall</h2>
      ${kpi(`${samletEtikett} ${periode.fra}–${periode.til}`, formaterProsent(samletRv.realvekst_pst), samletBeskrivelse, endringsklasse(samletRv.realvekst_pst))}
      ${kpi(
        `Reell bevilgning ${periode.til}`,
        formaterBeloep(rebaselineReell(samletRv.til?.reell, data.metadata)),
        `I ${effektivtBasisaar(data.metadata)}-kroner`
      )}
      ${kpi(`Nominell bevilgning ${periode.til}`, formaterBeloep(samletRv.til?.nominell), "")}
      ${kpi("Høyeste realvekst i dep.", hoyest ? formaterProsent(hoyest.realvekst_pst) : "—", hoyest?.navn || "")}
    </section>

    <section class="toppliste" aria-labelledby="topp-tittel">
      <header class="seksjon-header">
        
        <h2 id="topp-tittel">Topp 10 departementer — realvekst ${periode.fra}–${periode.til}</h2>
        <p class="seksjon-beskrivelse">
          De 10 departementene med høyest realvekst i perioden, i reelle
          ${effektivtBasisaar(data.metadata)}-kroner. Klikk på en stolpe
          eller en rad i tabellen under for å se programkategorier under
          departementet. Departementer med strukturelle brudd er ikke
          inkludert i topp 10, men listet for seg under.
        </p>
      </header>
      <figure>
        <div class="graf-wrapper">
          <p class="klikk-hint" aria-hidden="true">Klikk en stolpe →</p>
          <div id="toppliste-graf" class="graf" role="img"
               aria-label="Horisontal stolpegraf med topp 10 departementer på realvekst"></div>
        </div>
        <details class="tabell-alternativ">
          <summary>Vis som tabell</summary>
          ${depTabell(topp10, periode)}
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

  rendrerToppliste("toppliste-graf", topp10);

  // Klikk på stolpe -> drilldown
  document.getElementById("toppliste-graf").on("plotly_click", (ev) => {
    const navn = ev.points[0].y;
    const dep = topp10.find((d) => d.navn === navn);
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
    "programkategorier",
    data.metadata
  );

  // Bygg "raader" for toppliste
  const po_rader = filtrerteProgramomraader.map((po) => ({
    navn: `${po.nr} ${po.navn}`,
    realvekst_pst: po.realvekst_pst,
    har_strukturelt_brudd: false,
    _po_nr: po.nr,
  }));

  // Bygg aggregert tidsserie fra postene som matcher type/p90-filteret
  // paa tvers av alle programkategorier under departementet. Snu
  // fortegn for inntekter.
  const { type: typeNiva1, p90: p90Niva1 } = lesUrlTilstand();
  const snuFortegnDep = typeNiva1 === "inntekt";
  const filtrertePosterDep = [];
  for (const programkat of data.programomraader) {
    for (const p of programkat.poster) {
      if (!postBidrarTilAggregat(p)) continue;
      if (postKategoriMatcher(p, typeNiva1, p90Niva1)) {
        filtrertePosterDep.push(p);
      }
    }
  }
  const aggrTidsserieDep = aggregerPostTidsserier(filtrertePosterDep);
  const visTidsserieDep = snuTidsserieForInntekt(aggrTidsserieDep, snuFortegnDep);
  const depRv = realvekstFraTidsserie(visTidsserieDep, periode.fra, periode.til);
  const sluttReell = depRv.til?.reell;
  const sluttNominell = depRv.til?.nominell;

  const html = `
    <section class="kpi-rad">
      <h2 class="visuelt-skjult">Nøkkeltall for ${escapeHtml(dep.navn)}</h2>
      ${kpi("Reell bevilgning " + periode.til, formaterBeloep(rebaselineReell(sluttReell, data.metadata)), `I ${effektivtBasisaar(data.metadata)}-kroner`)}
      ${kpi("Nominell bevilgning " + periode.til, formaterBeloep(sluttNominell), "")}
      ${kpi("Realvekst " + periode.fra + "–" + periode.til, formaterProsent(depRv.realvekst_pst), "", endringsklasse(depRv.realvekst_pst))}
      ${kpi("Programkategorier", String(filtrerteProgramomraader.length), `${tellPoster(filtrerteProgramomraader)} poster totalt`)}
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
          ${tidsserieTabell(visTidsserieDep)}
        </details>
        <figcaption class="metode-merknad">
          Reell bevilgning i ${effektivtBasisaar(data.metadata)}-kroner. Deflator anvendt per
          postnummer (60–69 = kommunal, ellers statlig).${snuFortegnDep ? " Inntektsbeløp vises som positive tall (originaldata har negativt fortegn)." : ""}
        </figcaption>
      </figure>
    </section>

    <section class="toppliste" aria-labelledby="po-tittel">
      <header class="seksjon-header">
        
        <h2 id="po-tittel">Programkategorier under ${escapeHtml(dep.navn)}</h2>
        <p class="seksjon-beskrivelse">
          Klikk på en stolpe eller en rad i tabellen for å se postene under programkategorien.
        </p>
      </header>
      ${
        filtrerteProgramomraader.length === 0
          ? tomStateHtml()
          : `<figure>
        <div class="graf-wrapper">
          <p class="klikk-hint" aria-hidden="true">Klikk en stolpe →</p>
          <div id="po-graf" class="graf" role="img"
               aria-label="Horisontal stolpegraf med realvekst per programkategori"></div>
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

  rendrerTidsserie("tidsserie-graf", visTidsserieDep);
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
    visIkkeFunnet(`Programkategori ${po_nr} finnes ikke under ${dep.navn}.`);
    return;
  }
  const { q, pt, tr, type, p90, kapittel } = lesUrlTilstand();
  const periode = gjeldendePeriode(data.metadata);
  const qNorm = normaliserSoek(q);
  const allePoster = po.poster.map((p) => ({
    ...p,
    realvekst_pst: realvekstFraTidsserie(p.tidsserie, periode.fra, periode.til)
      .realvekst_pst,
  }));
  const filtrertePoster = allePoster
    .filter((p) => postKategoriMatcher(p, type, p90))
    .filter((p) => kapittel === null || p.kapittel_nr === kapittel)
    .filter((p) => postMatcher(p, qNorm, pt))
    .filter((p) => terskelMatcher(p, tr));
  oppdaterFilterStatus(
    filtrertePoster.length,
    allePoster.length,
    "poster",
    data.metadata
  );

  // Bygg en aggregert tidsserie fra de filtrerte postene slik at KPI
  // og graf reflekterer det faktiske utvalget (f.eks. bare inntekts-
  // poster). For inntekt snus fortegnet saa belop vises som positive.
  const snuFortegn = type === "inntekt";
  const aggrTidsserie = aggregerPostTidsserier(filtrertePoster);
  const visTidsserie = snuTidsserieForInntekt(aggrTidsserie, snuFortegn);
  const poRv = realvekstFraTidsserie(visTidsserie, periode.fra, periode.til);

  renderBrodsmule([
    { tekst: "Alle departementer", url: lagUrl() },
    {
      tekst: dep.navn,
      url: lagUrl({ dep: dep_id }),
      brudd: dep.har_strukturelt_brudd,
    },
    { tekst: `${po.nr} ${po.navn}`, url: null },
  ]);

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
      ${kpi("Reell bevilgning " + periode.til, formaterBeloep(rebaselineReell(sluttReell, data.metadata)), `I ${effektivtBasisaar(data.metadata)}-kroner`)}
      ${kpi("Nominell bevilgning " + periode.til, formaterBeloep(sluttNominell), "")}
      ${kpi("Realvekst " + periode.fra + "–" + periode.til, formaterProsent(poRv.realvekst_pst), "", endringsklasse(poRv.realvekst_pst))}
      ${kpi("Antall poster", String(filtrertePoster.length), filtrertePoster.length === allePoster.length ? "" : `av ${allePoster.length} totalt`)}
    </section>

    <section class="tidsserie-seksjon">
      <header class="seksjon-header">
        <h2>Utvikling ${periode.fra}–${periode.til}</h2>
      </header>
      <figure>
        <div id="tidsserie-graf" class="graf" role="img"
             aria-label="Tidsserie nominell og reell bevilgning"></div>
        <details class="tabell-alternativ">
          <summary>Vis som tabell</summary>
          ${tidsserieTabell(visTidsserie)}
        </details>
        ${snuFortegn ? `<figcaption class="metode-merknad">Inntektsbeløp vises som positive tall (originaldata har negativt fortegn).</figcaption>` : ""}
      </figure>
    </section>

    <section class="toppliste">
      <header class="seksjon-header">
        
        <h2>Poster under programkategori ${po.nr}</h2>
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

  rendrerTidsserie("tidsserie-graf", visTidsserie);
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
    visIkkeFunnet(`Programkategori ${po_nr} finnes ikke under ${dep.navn}.`);
    return;
  }
  const post = po.poster.find((p) => p.post_id === post_id);
  if (!post) {
    visIkkeFunnet(`Post ${post_id} finnes ikke under programkategori ${po_nr}.`);
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

  // Inntektsposter (kapittel 3000-5999) lagres med negativt fortegn i
  // Statsregnskapet. For visning snus de slik at brukeren leser dem som
  // positive beloep.
  const snuFortegn = post.kapittel_nr >= 3000;
  const startReell = snuTallForInntekt(postRv.fra?.reell, snuFortegn);
  const sluttReell = snuTallForInntekt(postRv.til?.reell, snuFortegn);
  const sluttNominell = snuTallForInntekt(postRv.til?.nominell, snuFortegn);
  const visTidsserie = snuTidsserieForInntekt(post.tidsserie, snuFortegn);

  const postgruppeNavn = postgruppeForPost(post);
  const deflatorBeskrivelse =
    post.deflator_type === "kommunal"
      ? "Kommunal deflator"
      : "Statsbudsjettets utgiftsdeflator";
  const deflatorMerknad = `Postgruppe-deflator vil bli anvendt når slike data foreligger; i dag brukes ${deflatorBeskrivelse.toLowerCase()}.`;

  const html = `
    <section class="kpi-rad">
      <h2 class="visuelt-skjult">Nøkkeltall</h2>
      ${kpi("Reell bevilgning " + periode.til, formaterBeloep(rebaselineReell(sluttReell, data.metadata)), `I ${effektivtBasisaar(data.metadata)}-kroner`)}
      ${kpi("Nominell bevilgning " + periode.til, formaterBeloep(sluttNominell), "")}
      ${kpi("Realvekst " + periode.fra + "–" + periode.til, formaterProsent(postRv.realvekst_pst), "", endringsklasse(postRv.realvekst_pst))}
    </section>

    <section class="metadata-blokk">
      <h2 class="visuelt-skjult">Metadata om posten</h2>
      <dl class="metadata">
        <div><dt>Departement</dt><dd>${escapeHtml(dep.navn)}</dd></div>
        <div><dt>Programkategori</dt><dd>${po.nr} ${escapeHtml(po.navn)}</dd></div>
        <div><dt>Kapittel</dt><dd>${post.kapittel_nr} ${escapeHtml(post.kapittel)}</dd></div>
        <div><dt>Post</dt><dd>${String(post.post_nr).padStart(2, "0")} ${escapeHtml(post.post_navn)}</dd></div>
        <div>
          <dt>Deflator</dt>
          <dd>
            ${deflatorBeskrivelse}
            <span class="metadata__hjelp">Postgruppe: ${escapeHtml(postgruppeNavn)}. ${deflatorMerknad}</span>
          </dd>
        </div>
      </dl>
    </section>

    <section class="tidsserie-seksjon">
      <header class="seksjon-header">
        <h2>År-for-år for ${escapeHtml(post.post_navn)}</h2>
      </header>
      <figure>
        <div id="tidsserie-graf" class="graf" role="img"
             aria-label="Tidsserie for posten"></div>
        ${tidsserieTabell(visTidsserie, true)}
        <figcaption class="metode-merknad">
          Reell verdi i ${effektivtBasisaar(data.metadata)}-kroner via
          ${post.deflator_type === "kommunal" ? "kommunal deflator" : "statsbudsjettets utgiftsdeflator"}.${snuFortegn ? " Inntektsbeløp vises som positive tall (originaldata har negativt fortegn)." : ""}
        </figcaption>
      </figure>
    </section>
  `;
  document.getElementById("hovedinnhold").innerHTML = html;
  // Post-grafen skalerer reell-linja slik at den moter nominell i
  // startaret, saa brukeren ser relativ utvikling direkte.
  rendrerTidsserie("tidsserie-graf", visTidsserie, {
    rebaselineTilForsteAar: true,
  });
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
      <caption class="visuelt-skjult">Realvekst per programkategori under valgt departement. Hver rad lenker til programkategoridetaljer.</caption>
      <thead>
        <tr>
          <th scope="col">Programkategori</th>
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
      <caption class="visuelt-skjult">Realvekst per post under valgt programkategori. Hver rad lenker til postdetaljer.</caption>
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

// --- Drilldown-nav (hurtigknapper + nedtrekk) ---

async function rendreDrilldownNav() {
  const el = document.getElementById("drilldown-nav");
  if (!el) return;
  const { tab, dep, po, post } = lesUrlTilstand();
  if (tab === "priskalkulator") {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;

  const oversikt = await hentOversikt();
  // Bygg departement-options sortert paa navn for forutsigbar rekkefolge.
  const deps = [...oversikt.departementer].sort((a, b) =>
    a.navn.localeCompare(b.navn, "nb")
  );
  const depOpts = [
    `<option value="">Velg departement …</option>`,
    ...deps.map(
      (d) =>
        `<option value="${d.id}" ${d.id === dep ? "selected" : ""}>${escapeHtml(
          d.navn
        )}</option>`
    ),
  ].join("");

  // Programkategori-options krever data fra valgt departement.
  let poOpts = `<option value="">Velg programkategori …</option>`;
  let poDisabled = dep === null ? "disabled" : "";
  if (dep !== null) {
    try {
      const data = await hentDepartement(dep);
      const omraader = [...data.programomraader].sort((a, b) => a.nr - b.nr);
      poOpts +=
        omraader
          .map(
            (p) =>
              `<option value="${p.nr}" ${
                p.nr === po ? "selected" : ""
              }>${p.nr} ${escapeHtml(p.navn)}</option>`
          )
          .join("");
    } catch (e) {
      poDisabled = "disabled";
    }
  }

  // Kapittel-options bygges fra unike (kapittel_nr, kapittel-navn)-
  // kombinasjoner under valgt programkategori. Selv om datamodellen
  // ikke har kapittel som eget niva, viser nedtrekket navn + nr og
  // navigerer ved at en post under valgt kapittel velges som default.
  const { type, p90, kapittel } = lesUrlTilstand();
  let kapittelOpts = `<option value="">Velg kapittel …</option>`;
  let kapittelDisabled = po === null ? "disabled" : "";
  let kapitler = [];
  if (dep !== null && po !== null) {
    try {
      const data = await hentDepartement(dep);
      const valgtPo = data.programomraader.find((p) => p.nr === po);
      if (valgtPo) {
        const kapMap = new Map();
        for (const p of valgtPo.poster) {
          if (!postKategoriMatcher(p, type, p90)) continue;
          if (!kapMap.has(p.kapittel_nr)) {
            kapMap.set(p.kapittel_nr, p.kapittel);
          }
        }
        kapitler = [...kapMap.entries()].sort((a, b) => a[0] - b[0]);
        kapittelOpts += kapitler
          .map(
            ([nr, navn]) =>
              `<option value="${nr}" ${
                nr === kapittel ? "selected" : ""
              }>kap. ${nr} — ${escapeHtml(navn)}</option>`
          )
          .join("");
      } else {
        kapittelDisabled = "disabled";
      }
    } catch (e) {
      kapittelDisabled = "disabled";
    }
  }

  // Post-options filtreres ogsa paa valgt kapittel naar det er satt.
  let postOpts = `<option value="">Velg post …</option>`;
  let postDisabled = po === null ? "disabled" : "";
  if (dep !== null && po !== null) {
    try {
      const data = await hentDepartement(dep);
      const valgtPo = data.programomraader.find((p) => p.nr === po);
      if (valgtPo) {
        const poster = [...valgtPo.poster]
          .filter((p) => postKategoriMatcher(p, type, p90))
          .filter((p) => kapittel === null || p.kapittel_nr === kapittel)
          .sort((a, b) =>
            a.kapittel_nr === b.kapittel_nr
              ? a.post_nr - b.post_nr
              : a.kapittel_nr - b.kapittel_nr
          );
        postOpts += poster
          .map(
            (p) =>
              `<option value="${p.post_id}" ${
                p.post_id === post ? "selected" : ""
              }>kap. ${p.kapittel_nr} post ${String(p.post_nr).padStart(
                2,
                "0"
              )} — ${escapeHtml(p.post_navn)}</option>`
          )
          .join("");
      } else {
        postDisabled = "disabled";
      }
    } catch (e) {
      postDisabled = "disabled";
    }
  }

  // Periode-velger og basisaar-velger leses fra metadata.
  const meta = oversikt.metadata;
  const aar = (meta.prisindeks?.aar || []).slice().sort((a, b) => a - b);
  const { fra: fraUrl, til: tilUrl, basis } = lesUrlTilstand();
  const periodeFra = fraUrl !== null ? fraUrl : meta.start;
  const periodeTil = tilUrl !== null ? tilUrl : meta.slutt;
  const valgtBasisaar = basis !== null ? basis : meta.basisaar;
  const aarOpt = (verdi, valgt) =>
    aar.map((a) => `<option value="${a}" ${a === valgt ? "selected" : ""} ${verdi === "fra" && a >= periodeTil ? "disabled" : ""} ${verdi === "til" && a <= periodeFra ? "disabled" : ""}>${a}</option>`).join("");
  const basisaarOpts = aar
    .map(
      (a) =>
        `<option value="${a}" ${a === valgtBasisaar ? "selected" : ""}>${a}</option>`
    )
    .join("");

  const niva = post !== null ? 3 : po !== null ? 2 : dep !== null ? 1 : 0;

  el.innerHTML = `
    <div class="drilldown-nav__rad">
      <p class="drilldown-nav__etikett">Hurtignavigasjon</p>
      <div class="drilldown-nav__knapper">
        <button
          type="button"
          class="knapp ${niva === 0 ? "" : "knapp--sekundaer"}"
          data-niva-knapp="0"
        >
          Alle departementer
        </button>
        ${
          dep !== null
            ? `<button type="button" class="knapp ${
                niva === 1 ? "" : "knapp--sekundaer"
              }" data-niva-knapp="1" data-dep="${dep}">Departement</button>`
            : ""
        }
        ${
          po !== null
            ? `<button type="button" class="knapp ${
                niva === 2 ? "" : "knapp--sekundaer"
              }" data-niva-knapp="2" data-dep="${dep}" data-po="${po}">Programkategori</button>`
            : ""
        }
      </div>
    </div>
    <div class="drilldown-nav__rad drilldown-nav__rad--velgere">
      <label class="drilldown-nav__velger">
        <span class="filter-felt__etikett">Departement</span>
        <select id="dd-dep">${depOpts}</select>
      </label>
      <label class="drilldown-nav__velger">
        <span class="filter-felt__etikett">Programkategori</span>
        <select id="dd-po" ${poDisabled}>${poOpts}</select>
      </label>
      <label class="drilldown-nav__velger">
        <span class="filter-felt__etikett">Kapittel</span>
        <select id="dd-kapittel" ${kapittelDisabled}>${kapittelOpts}</select>
      </label>
      <label class="drilldown-nav__velger">
        <span class="filter-felt__etikett">Post</span>
        <select id="dd-post" ${postDisabled}>${postOpts}</select>
      </label>
    </div>
    <div class="drilldown-nav__rad drilldown-nav__rad--kategori">
      <fieldset class="drilldown-nav__type" aria-label="Type post">
        <legend class="filter-felt__etikett">Type</legend>
        <div class="drilldown-nav__radioer">
          <label class="drilldown-nav__radio">
            <input type="radio" name="dd-type" value="utgift" ${
              type === "utgift" ? "checked" : ""
            }>
            <span>Utgiftsposter <small>(kap. 0001–2999)</small></span>
          </label>
          <label class="drilldown-nav__radio">
            <input type="radio" name="dd-type" value="inntekt" ${
              type === "inntekt" ? "checked" : ""
            }>
            <span>Inntektsposter <small>(kap. 3000–5999)</small></span>
          </label>
          <label class="drilldown-nav__checkbox">
            <input type="checkbox" id="dd-p90" ${p90 ? "checked" : ""}>
            <span>Inkluder 90-poster, låne- og petroleumstransaksjoner <small>(utlån, kapitaltilskudd, SPU-overføringer, petroleumsskatt, Equinor-utbytte mv.)</small></span>
          </label>
        </div>
      </fieldset>
    </div>
    <div class="drilldown-nav__rad drilldown-nav__rad--periode">
      <label class="drilldown-nav__velger">
        <span class="filter-felt__etikett">Sammenligningsperiode — fra</span>
        <select id="dd-fra">${aarOpt("fra", periodeFra)}</select>
      </label>
      <label class="drilldown-nav__velger">
        <span class="filter-felt__etikett">til</span>
        <select id="dd-til">${aarOpt("til", periodeTil)}</select>
      </label>
      <label class="drilldown-nav__velger">
        <span class="filter-felt__etikett">Basisår for realverdi</span>
        <select id="dd-basis">${basisaarOpts}</select>
      </label>
    </div>
  `;

  bindDrilldownNavUi();
}

function bindDrilldownNavUi() {
  const ddDep = document.getElementById("dd-dep");
  const ddPo = document.getElementById("dd-po");
  const ddKap = document.getElementById("dd-kapittel");
  const ddPost = document.getElementById("dd-post");
  const ddFra = document.getElementById("dd-fra");
  const ddTil = document.getElementById("dd-til");
  const ddBasis = document.getElementById("dd-basis");

  if (ddDep) {
    ddDep.addEventListener("change", () => {
      const v = ddDep.value;
      naviger({
        dep: v ? parseInt(v, 10) : null,
        po: null,
        post: null,
        kapittel: null,
      });
    });
  }
  if (ddPo) {
    ddPo.addEventListener("change", () => {
      const v = ddPo.value;
      const { dep } = lesUrlTilstand();
      naviger({
        dep,
        po: v ? parseInt(v, 10) : null,
        post: null,
        kapittel: null,
      });
    });
  }
  if (ddKap) {
    ddKap.addEventListener("change", () => {
      const v = ddKap.value;
      settFilterStateOgRender({
        kapittel: v ? parseInt(v, 10) : null,
      });
    });
  }
  if (ddPost) {
    ddPost.addEventListener("change", () => {
      const v = ddPost.value;
      const { dep, po } = lesUrlTilstand();
      naviger({
        dep,
        po,
        post: v ? parseInt(v, 10) : null,
      });
    });
  }
  if (ddFra) {
    ddFra.addEventListener("change", () => {
      settFilterStateOgRender({ fra: parseInt(ddFra.value, 10) });
    });
  }
  if (ddTil) {
    ddTil.addEventListener("change", () => {
      settFilterStateOgRender({ til: parseInt(ddTil.value, 10) });
    });
  }
  if (ddBasis) {
    ddBasis.addEventListener("change", () => {
      settFilterStateOgRender({ basis: parseInt(ddBasis.value, 10) });
    });
  }

  document.querySelectorAll("[data-niva-knapp]").forEach((knapp) => {
    knapp.addEventListener("click", () => {
      const niva = parseInt(knapp.dataset.nivaKnapp, 10);
      const depId = knapp.dataset.dep ? parseInt(knapp.dataset.dep, 10) : null;
      const poNr = knapp.dataset.po ? parseInt(knapp.dataset.po, 10) : null;
      if (niva === 0) naviger({ dep: null, po: null, post: null });
      else if (niva === 1) naviger({ dep: depId, po: null, post: null });
      else if (niva === 2) naviger({ dep: depId, po: poNr, post: null });
    });
  });

  document.querySelectorAll("input[name='dd-type']").forEach((radio) => {
    radio.addEventListener("change", () => {
      settFilterStateOgRender({ type: radio.value });
    });
  });
  const p90Checkbox = document.getElementById("dd-p90");
  if (p90Checkbox) {
    p90Checkbox.addEventListener("change", () => {
      settFilterStateOgRender({ p90: p90Checkbox.checked });
    });
  }
}

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

// Postgrupper er postnummer-serier i statsbudsjettet, jf. CLAUDE.md.
// Hver gruppe har sin egen prisutvikling; Finansdepartementet bruker
// foreloepig to brede deflatorer (statlig vs kommunal), men nedtrekket
// her viser at funksjonaliteten er klar naar mer detaljerte deflatorer
// per postgruppe blir tilgjengelig.
const POSTGRUPPER = [
  {
    id: "drift",
    navn: "Utgifter til drift (01–29)",
    deflator: "statlig",
    postnr: "01-29",
  },
  {
    id: "investering",
    navn: "Utgifter til investeringer (30–49)",
    deflator: "statlig",
    postnr: "30-49",
  },
  {
    id: "overforing-stat",
    navn: "Overføringer til andre statsregnskap (50–59)",
    deflator: "statlig",
    postnr: "50-59",
  },
  {
    id: "overforing-kommune",
    navn: "Overføringer til kommuner og fylkeskommuner (60–69)",
    deflator: "kommunal",
    postnr: "60-69",
  },
  {
    id: "overforing-andre",
    navn: "Andre overføringer (70–89)",
    deflator: "statlig",
    postnr: "70-89",
  },
  {
    id: "utlaan",
    navn: "Utlån, kapitaltilskudd, aksjer (90–99)",
    deflator: "statlig",
    postnr: "90-99",
  },
];

async function visPriskalkulator() {
  const oversikt = await hentOversikt();
  const meta = oversikt.metadata;
  const aar = meta.prisindeks?.aar || [];
  const state = lesUrlTilstand();

  // Defaults: konverter fra start til slutt i metadata.
  const fraAr = state.kalkFra ?? meta.start;
  const tilAr = state.kalkTil ?? meta.slutt;
  const belop = state.kalkBelop ?? 100000;
  const valgtPostgruppeId = state.kalkPostgruppe || "drift";
  const valgtPostgruppe =
    POSTGRUPPER.find((g) => g.id === valgtPostgruppeId) || POSTGRUPPER[0];
  const deflatorType = valgtPostgruppe.deflator;

  const resultat = priskonvertering(meta.prisindeks, deflatorType, belop, fraAr, tilAr);

  const aarValg = (selected) =>
    aar.map((a) => `<option value="${a}" ${a === selected ? "selected" : ""}>${a}</option>`).join("");

  const postgruppeOptions = POSTGRUPPER.map(
    (g) =>
      `<option value="${g.id}" ${
        g.id === valgtPostgruppe.id ? "selected" : ""
      }>${g.navn}</option>`
  ).join("");

  const main = document.getElementById("hovedinnhold");
  main.innerHTML = `
    <section class="kalkulator" aria-labelledby="kalk-tittel">
      <header class="seksjon-header">
        <p class="seksjon-kicker">Verktøy</p>
        <h2 id="kalk-tittel">Realverdikalkulator per post</h2>
        <p class="seksjon-beskrivelse">
          Beregn hva et beløp i ett år tilsvarer i et annet år, justert
          for prisstigning. Postgruppen styrer hvilken deflator som brukes.
          Foreløpig anvendes to brede deflatorer i Finansdepartementet:
          statsbudsjettets utgiftsdeflator for de fleste poster, og kommunal
          deflator for overføringer til kommuner og fylkeskommuner (60–69).
          Nedtrekket viser at kalkulatoren er klar til å håndtere finere
          deflatorer per postgruppe når slike data blir tilgjengelig.
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

        <label class="kalkulator__felt kalkulator__felt--postgruppe">
          <span class="filter-felt__etikett">Postgruppe</span>
          <select id="kalk-postgruppe">${postgruppeOptions}</select>
          <span class="filter-felt__hjelp">
            Bruker ${deflatorType === "kommunal" ? "kommunal deflator" : "statsbudsjettets utgiftsdeflator"}
            i denne versjonen.
          </span>
        </label>
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
    const postgruppeSelect = document.getElementById("kalk-postgruppe");
    const belop = Number(belopInput.value);
    const fra = parseInt(fraSelect.value, 10);
    const til = parseInt(tilSelect.value, 10);
    const postgruppe = postgruppeSelect ? postgruppeSelect.value : null;
    const naa = lesUrlTilstand();
    const ny = {
      ...naa,
      kalkBelop: Number.isFinite(belop) && belop >= 0 ? belop : null,
      kalkFra: fra,
      kalkTil: til,
      kalkPostgruppe: postgruppe,
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
      await rendreDrilldownNav();
      await visPriskalkulator();
    } else {
      settPanelerSynlige(true);
      await rendreDrilldownNav();
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
