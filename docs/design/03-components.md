# 03 — Komponentbibliotek

Dette dokumentet katalogiserer komponentene som brukes på tvers av dashbordet. Hver komponent beskrives med formål, struktur (HTML), tilstander og hvilke design-tokens som styrer utseendet.

Alle komponenter:

- Henter alle farger, fonter, avstander og border-radius fra `src/dashboard/tokens.css` via `var(--token)`
- Følger WCAG 2.1 AA (kontrast, fokus, tastaturnavigering)
- Bruker semantiske HTML-elementer der det finnes (`<table>`, `<button>`, `<nav>`, `<details>`, `<dialog>`, osv.)

## Layout-primitiver

### Side-shell

Topp-til-bunn rekkefølge:

1. Skip-link (visuelt skjult, vises ved fokus)
2. `<header>` — kicker, hero-tittel, ingress, brødsmulesti
3. `<main>` — innholdsseksjoner
4. `<footer>` — datalast-ned, metode-merknad, kildehenvisning

Maks lesebredde: `--maks-bredde-innhold` (typisk 72rem).

### Grid

12-kolonne grid med tre breakpoints:

```css
.grid {
  display: grid;
  gap: var(--avstand-l);
  grid-template-columns: repeat(12, 1fr);
}
.col-span-12 { grid-column: span 12; }
.col-span-6  { grid-column: span 12; }   /* mobile */
.col-span-4  { grid-column: span 12; }
@media (min-width: 768px) {
  .col-span-6 { grid-column: span 6; }
  .col-span-4 { grid-column: span 6; }
}
@media (min-width: 1100px) {
  .col-span-4 { grid-column: span 4; }
}
```

## Datavisning

### KPI-kort

To varianter: **hero** (én stor, sentralt plassert) og **standard** (mindre, 2–4 ved siden av hverandre).

Struktur:

```html
<article class="kpi" data-variant="hero">
  <p class="kpi__etikett">Reell bevilgning 2026</p>
  <p class="kpi__tall"><span class="tall">164,5</span> mrd. kr</p>
  <p class="kpi__endring kpi__endring--positiv">+181,2 % siden 2014</p>
  <p class="kpi__brudd-advarsel" hidden>Strukturelt brudd</p>
</article>
```

Tilstander:

| Attributt | Effekt |
|---|---|
| `data-variant="hero"` | Stor typografi, full bredde |
| `data-variant="standard"` | Mindre, kolonne i grid |
| `kpi__endring--positiv` | Grønn farge `var(--farge-positiv)` |
| `kpi__endring--negativ` | Rød farge `var(--farge-negativ)` |
| `kpi__brudd-advarsel` synlig | Oransje ikon `var(--farge-advarsel)` |

Tall formateres med tabular-nums og norsk konvensjon (komma som desimaltegn, ikke-brytende mellomrom mellom tall og enhet).

### Tidsserie-graf

Plotly.js-graf med tema styrt av tokens. Hver graf:

- To linjer: nominell (dempet, `var(--farge-sekundaer)`) og reell (fremhevet, `var(--farge-primaer)`)
- Y-akse: "Mrd. kr"
- X-akse: år (2014–2026)
- Hover-tooltip på norsk format
- Tabell-alternativ i `<details>` for skjermleser
- Metode-merknad under: "Reell bevilgning: nominell omregnet til [basisår]-priser via [statlig/kommunal] deflator."

Strukturelt brudd vises som vertikal stiplet linje på bruddåret.

### Toppliste-graf

Horisontal stolpegraf med fremhevet element i sterk farge, andre i dempet.

```html
<figure class="toppliste">
  <figcaption>Realvekst per departement, 2014–2026</figcaption>
  <ol class="toppliste__rader">
    <li class="toppliste__rad" data-fremhevet="false">
      <span class="toppliste__navn">Forsvarsdepartementet</span>
      <span class="toppliste__verdi tall">+181,2 %</span>
      <div class="toppliste__bar" style="--andel: 0.92"></div>
    </li>
    <!-- ... -->
  </ol>
</figure>
```

Sortering toggles via knapper over listen.

### Komparativ-blokk

Brukes på nivå 0 og 1 for å vise flere KPI-er ved siden av hverandre med en felles filterkontekst.

```html
<section class="komparativ">
  <header class="komparativ__filter">
    <!-- post-type-toggles, basisår-velger -->
  </header>
  <div class="komparativ__grid">
    <article class="kpi">...</article>
    <article class="kpi">...</article>
    <article class="kpi">...</article>
  </div>
</section>
```

## Navigasjon

### Brødsmulesti

```html
<nav aria-label="Brødsmulesti" class="brodsmule">
  <ol>
    <li><a href="?">Alle departementer</a></li>
    <li><a href="?dep=10">Forsvarsdepartementet</a></li>
    <li aria-current="page">Programområde 04 - Militært forsvar</li>
  </ol>
</nav>
```

Skilletegn (`›`) genereres med `::after` i CSS, ikke i HTML — slik at skjermleser ikke leser dem opp.

### Filterpanel

Sticky topp på desktop, kollapserbart på mobil.

| Kontrolltype | Element |
|---|---|
| Post-type-filter | `<fieldset>` med `<input type="checkbox">` per type |
| Tekstsøk | `<input type="search">` med debounce |
| Realvekst-terskel | `<input type="range">` med live-verdi |
| Periode | To `<select>` (start, slutt) |
| Basisår | `<select>` |

Aktive filtre vises som "chips" under filterlinjen, med kryss for å fjerne enkeltvis. Knapp "Nullstill alle" lengst til høyre.

## Støttekomponenter

### Metode-merknad

Plassert direkte under hver graf eller KPI-blokk, som `<figcaption>` der relevant:

> Reell bevilgning beregnet ved kumulativ prisindeks med basisår 2024. Postnummer 60–69 bruker kommunal deflator, øvrige bruker statsbudsjettets utgiftsdeflator.

Typografi: `var(--font-storrelse-s)`, farge `var(--farge-tekst-dempet)`.

### Brudd-advarsel

Vises under graf eller ved siden av tall når visningen krysser et kjent strukturelt brudd. Bakgrunn `var(--farge-advarsel-svak)`, ikon `var(--farge-advarsel)`, tekst som siterer beskrivelsen fra `src.analyse.brudd.STRUKTURELLE_BRUDD_DEPARTEMENT`.

```html
<aside class="brudd-advarsel" role="note">
  <strong>Strukturelt brudd:</strong>
  Energidepartementet er en omorganisering. Tidsserien viser negativ
  realvekst fordi det historiske området ikke er sammenlignbart.
</aside>
```

### Eksport-knapp

Plassert øverst til høyre i hver graf-blokk. To handlinger:

- PNG-eksport av grafen
- CSV-eksport av underliggende tabell

Knapper bruker semantisk `<button>`, ikke `<a>`, fordi de utfører en handling og ikke navigerer.

## Tilstander som gjenbrukes

| Tilstand | Visuell markering |
|---|---|
| Fokus (tastatur) | 3px outline i `var(--farge-fokus)`, offset 2px |
| Hover (peker) | Subtil bakgrunnsendring, aldri eneste indikator |
| Aktiv (valgt) | Border-tykning og bakgrunn `var(--farge-aktiv-bakgrunn)` |
| Lasting | Skeleton-blokker med animasjon, respekterer `prefers-reduced-motion` |
| Tom tilstand | Tekstbeskjed med forslag til neste handling |
