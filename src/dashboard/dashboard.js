/*
 * Dashbord-renderer for nivå 0 (alle departementer).
 *
 * Henter data/oversikt.json og rendrer:
 *   - KPI-rad med nøkkeltall
 *   - Horisontal toppliste-graf via Plotly
 *   - Tabell-alternativ for skjermleser
 *   - Brudd-seksjon med fagligfaglig forklaring per markert departement
 *   - Tidsstempel for datagenerering i footer
 *
 * Alle visuelle valg leses fra CSS-tokens via getComputedStyle, slik at
 * Plotly-tema automatisk følger tokens.css. Tall formateres på norsk
 * konvensjon (komma som desimaltegn, ikke-brytende mellomrom).
 */

"use strict";

const SI_KONVERTERER = 1e9; // NOK -> mrd. kr

// --- Hjelpere ---

function lesCssToken(navn) {
  return getComputedStyle(document.documentElement).getPropertyValue(navn).trim();
}

function formaterMrd(nok) {
  if (nok === null || nok === undefined) return "—";
  const mrd = nok / SI_KONVERTERER;
  return mrd.toLocaleString("nb-NO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formaterProsent(pst) {
  if (pst === null || pst === undefined) return "—";
  const tegn = pst >= 0 ? "+" : "";
  return `${tegn}${pst.toLocaleString("nb-NO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

function settTekst(id, tekst) {
  const el = document.getElementById(id);
  if (el) el.textContent = tekst;
}

// --- KPI-rad ---

function renderKpiRad(data) {
  const { metadata, departementer } = data;

  settTekst("kpi-periode", `${metadata.start}–${metadata.slutt}`);
  settTekst(
    "kpi-periode-beskrivelse",
    `Realvekst i ${metadata.basisaar}-kroner`
  );

  settTekst("kpi-antall", String(departementer.length));

  // Høyeste og laveste blant departementer UTEN strukturelt brudd
  const sammenlignbare = departementer.filter(
    (d) => !d.har_strukturelt_brudd && d.realvekst_pst !== null
  );
  if (sammenlignbare.length > 0) {
    const hoyest = sammenlignbare.reduce((a, b) =>
      a.realvekst_pst > b.realvekst_pst ? a : b
    );
    const lavest = sammenlignbare.reduce((a, b) =>
      a.realvekst_pst < b.realvekst_pst ? a : b
    );
    settTekst("kpi-hoyest-pst", formaterProsent(hoyest.realvekst_pst));
    settTekst("kpi-hoyest-navn", hoyest.navn);
    settTekst("kpi-lavest-pst", formaterProsent(lavest.realvekst_pst));
    settTekst("kpi-lavest-navn", lavest.navn);
  }
}

// --- Plotly toppliste-graf ---

function renderToppliste(data) {
  const sammenlignbare = data.departementer.filter(
    (d) => !d.har_strukturelt_brudd && d.realvekst_pst !== null
  );
  // Plotly tegner førsteelement nederst, så vi sorterer stigende
  const sortert = [...sammenlignbare].sort(
    (a, b) => a.realvekst_pst - b.realvekst_pst
  );

  const primaerFarge = lesCssToken("--farge-primaer") || "#1a3a6d";
  const tekstFarge = lesCssToken("--farge-tekst") || "#1a1a1a";
  const dempetFarge = lesCssToken("--farge-tekst-dempet") || "#6e6e6e";
  const kantFarge = lesCssToken("--graf-rutenett") || "#d4d4d4";
  const fontStack = lesCssToken("--font-stack-sans") ||
    "system-ui, sans-serif";

  const trace = {
    type: "bar",
    orientation: "h",
    x: sortert.map((d) => d.realvekst_pst),
    y: sortert.map((d) => d.navn),
    marker: { color: primaerFarge },
    text: sortert.map((d) => formaterProsent(d.realvekst_pst)),
    textposition: "outside",
    cliponaxis: false,
    hovertemplate:
      "<b>%{y}</b><br>Realvekst: %{x:.1f} %<br>" +
      "Reell 2014: %{customdata[0]} mrd. kr<br>" +
      "Reell 2026: %{customdata[1]} mrd. kr<extra></extra>",
    customdata: sortert.map((d) => [
      formaterMrd(d.reell_start),
      formaterMrd(d.reell_slutt),
    ]),
  };

  const layout = {
    margin: { l: 240, r: 80, t: 20, b: 60 },
    height: Math.max(420, sortert.length * 36 + 80),
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: fontStack, color: tekstFarge, size: 13 },
    xaxis: {
      title: { text: "Realvekst 2014–2026 (pst.)", standoff: 16 },
      gridcolor: kantFarge,
      zeroline: true,
      zerolinecolor: dempetFarge,
      zerolinewidth: 1,
      tickformat: ",.0f",
      separatethousands: true,
      ticksuffix: " %",
    },
    yaxis: {
      automargin: true,
      tickfont: { size: 13 },
    },
    showlegend: false,
  };

  const config = {
    displayModeBar: false,
    responsive: true,
    locale: "nb",
  };

  Plotly.newPlot("toppliste-graf", [trace], layout, config);
}

// --- Tabell-alternativ ---

function renderTopplisteTabell(data) {
  const tbody = document.querySelector("#toppliste-tabell tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Vis alle, inkludert brudd, men marker dem
  for (const d of data.departementer) {
    const rad = document.createElement("tr");
    rad.innerHTML = `
      <th scope="row">${d.navn}</th>
      <td class="tall-kol">${
        d.realvekst_pst === null ? "—" : formaterProsent(d.realvekst_pst)
      }</td>
      <td class="tall-kol">${formaterMrd(d.reell_start)}</td>
      <td class="tall-kol">${formaterMrd(d.reell_slutt)}</td>
      <td>${d.har_strukturelt_brudd ? "Strukturelt brudd" : ""}</td>
    `;
    tbody.appendChild(rad);
  }
}

// --- Brudd-seksjon ---

function renderBruddSeksjon(data) {
  const brudd = data.departementer.filter((d) => d.har_strukturelt_brudd);
  if (brudd.length === 0) return;

  const seksjon = document.getElementById("brudd-seksjon");
  const liste = document.getElementById("brudd-liste");
  if (!seksjon || !liste) return;

  seksjon.hidden = false;
  liste.innerHTML = "";

  for (const d of brudd) {
    const li = document.createElement("li");
    li.className = "brudd-kort";
    li.innerHTML = `
      <h3>${d.navn}</h3>
      <p>${d.brudd_beskrivelse || ""}</p>
    `;
    liste.appendChild(li);
  }
}

// --- Footer-metadata ---

function renderMetadata(data) {
  const dato = new Date(data.metadata.generert);
  const formattert = dato.toLocaleString("nb-NO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  settTekst("datasett-generert", formattert);
}

// --- Hovedflyt ---

async function main() {
  try {
    const respons = await fetch("data/oversikt.json", { cache: "no-cache" });
    if (!respons.ok) {
      throw new Error(`HTTP ${respons.status}`);
    }
    const data = await respons.json();

    renderKpiRad(data);
    renderToppliste(data);
    renderTopplisteTabell(data);
    renderBruddSeksjon(data);
    renderMetadata(data);
  } catch (err) {
    console.error("Kunne ikke laste data:", err);
    const main = document.getElementById("hovedinnhold");
    if (main) {
      const feil = document.createElement("p");
      feil.role = "alert";
      feil.textContent =
        "Kunne ikke laste data. Sjekk at data/oversikt.json er publisert.";
      main.prepend(feil);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
