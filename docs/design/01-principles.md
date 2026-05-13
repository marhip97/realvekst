# 01 — Designprinsipper

Dette dokumentet definerer prinsippene som styrer alle visuelle valg i dashbordet. Skal leses før noen frontend-kode skrives eller endres.

## Overordnet retning

Dashbordet skal oppleves som et profesjonelt fagverktøy, ikke en demo. Nordisk, presist, og pålitelig — på samme kvalitetsnivå som SFSs Ukraina-støtte-dashbord. Forankret i FINs supplerende designprofil for farger og typografi.

## Prinsipper

### 1. Ett designsystem som én sannhet

Alle visuelle valg dokumenteres i `src/dashboard/tokens.css`. Frontend-koden refererer alltid til tokens via `var(--token)` eller `getComputedStyle`. Ingen rå hex-verdier, ingen magic numbers i CSS eller JavaScript.

### 2. Mobile-first responsivt

Layout starter på mobil (1-kolonne) og utvides ved breakpoints:
- Mobile: default
- Tablet: ≥768px
- Desktop: ≥1100px

12-kolonne grid med `col-span-*`-klasser styrer kolonnefordeling per breakpoint.

### 3. WCAG 2.1 AA som minimum

- Skip-link til hovedinnhold
- Semantiske HTML-elementer (header, main, section, article, footer, nav)
- ARIA-labels og roller på interaktive elementer
- Fokusindikatorer med 3px outline
- Kontrast: 4,5:1 for normal tekst, 3:1 for store overskrifter og UI-komponenter
- prefers-reduced-motion respekteres
- Alle visualiseringer har tabell-alternativ for skjermleser
- Tastaturnavigering for alle kontroller

### 4. Fagligfaglig integritet i hver visualisering

Hver visualisering har:
- Tydelig overskrift som forklarer hva som vises
- Aksetitler med enhet (norsk konvensjon: "Mrd. kroner", "Prosent")
- Metode-merknad under: hvilken deflator, hvilket basisår, kjente avgrensninger
- Eksportknapp for PNG der relevant

Strukturelle brudd skal **aldri skjules**. Når en sammenligning krysser et brudd, vises en visuell advarsel ved siden av tallet.

### 5. Norsk presisjon i tallformatering

- Komma som desimaltegn: `12,4` (ikke `12.4`)
- Ikke-brytende mellomrom mellom tall og enhet: `12,4 mrd. kr` (slik at det ikke brytes over linjeskift)
- Mellomrom som tusenseparator: `4 200 mrd.`
- "mrd." for milliarder, "mill." for millioner
- "pst." eller "%" for prosent, med mellomrom mellom tall og prosenttegn
- Tabular-nums (`font-variant-numeric: tabular-nums`) for alle tallverdier i tabeller og KPI-kort

### 6. Inspirasjonskilde

SFSs Ukraina-støtte-dashbord (github.com/marhip97/ukrainastotte) er hovedreferansen for:
- Samlet kvalitetsnivå
- Struktur og informasjonsarkitektur
- WCAG-tilnærming
- Komponentmønstre (KPI-kort, komparativ-blokk, toppliste-graf)
- Eksport-funksjonalitet (PNG, docx)

Vi adopterer prinsippene, ikke den eksakte koden. Tilpasninger gjøres til budsjettdomenet.
