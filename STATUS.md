# Status — realvekst-statsbudsjett

Sist oppdatert: 2026-05-15

## Hva er ferdig

- Repo opprettet med komplett mappestruktur (src/data, src/analyse, src/dashboard, tests, docs/design, data/raw, data/processed)
- Dokumentasjon på plass: CLAUDE.md, PROJECT_PLAN.md, README.md
- pyproject.toml med avhengigheter (pandas, openpyxl, numpy; dev: pytest, ruff)
- .gitignore på plass
- Rådata flyttet til data/raw/:
  - bevilgning_2014_2019.xlsx
  - bevilgning_2020_2026.xlsx
  - deflatorer.csv
- Designprinsipper dokumentert i docs/design/01-principles.md
- Datalag og analyselag implementert: src/data/bevilgning.py, deflator.py; src/analyse/realvekst.py, aggregering.py, brudd.py med tester
- Datasett-generator src/data/bygg_datasett.py som skriver oversikt + per-departement JSON til src/dashboard/data/
- Frontend (PR #9): drilldown nivå 0-3 i src/dashboard/index.html, styles.css, dashboard.js
- GitHub Pages-deploy stabilisert (PR #10): workflow trigges ved alle push til main + debug-log av opplastede filer
- Plotly-script lastes nå riktig (PR #11): feilaktig SRI-hash fjernet
- Filter-system (PR #13): tekstsøk og post-type-multivalg på alle drilldown-nivåer, med URL-state
- Cache-busting (PR #14): CSS/JS får query-suffix i Pages-deploy
- Bruddmarkering i UI (PR #15): badge i brødsmulesti, toppliste, tabell og inline-advarsel
- Periode-valg (PR #16): brukeren kan velge fra-år og til-år for sammenligningen
- Realvekst-terskel-filter: vis kun elementer der |realvekst| ≥ valgt grense
- WCAG-revisjon (PR #17): prefers-reduced-motion respekteres i Plotly, alle tabeller har caption, fokus flyttes til ny overskrift etter drilldown, og tastatur-alternativet via tabellene er beskrevet i klikk-instruksjoner
- UX-revisjon (PR #18): tydelig drilldown-affordans (klikkbare tabellrader med chevron, hover-tilstand på Plotly-stolper, klikk-hint over grafer), brødsmulesti med retningssignal, mindre dominant filter-panel med "aktiv"-tilstand, felles knappestil .knapp/.knapp--sekundaer, og seksjons-kicker for bedre hierarki
- Data-defaults (PR #18 followup): default basisår endret fra 2024 til 2026, default-periode fra 2014–2026 til 2022–2026. Adresserer to bekymringer: mange poster med null realvekst (fordi de ikke fantes i 2014), og tre departementer med meningsløse tall pga omorganiseringer (Energidep., Nær.- og fisk.dep., Dig.- og forv.dep.). Bruddtekstene er omskrevet til å forklare bakgrunnen (omorganiseringer 2024, post 90-serie gir negative netto-summer)
- Tab-navigering og priskalkulator (PR #18 followup): ny topplinje med "Drilldown" (default) og "Priskalkulator" tabs. Priskalkulatoren konverterer beløp mellom to år ved hjelp av kumulativ prisindeks (statlig eller kommunal deflator). Prisindeksene eksponeres i oversikt.json metadata via bygg_datasett.py
- Drilldown-nav og periode-presets (PR #18 followup): hurtigknapper for direkte nivå-hopp (Alle departementer / Departement / Programområde), tre progressive nedtrekksvelgere (Departement → Programområde → Post), "Siste 4 år"-preset og "Tilpass"-akkordion på periode-velger, chip-toggle på post-type-filter
- Dashbord live og verifisert fungerende av bruker

## Hva er under arbeid

- Ingenting akutt

## Hva er blokkert

- Ingenting

## Neste konkrete steg

1. Eksport av visning til Excel/CSV og PNG (Plotly har innebygd toImage; CSV bygges fra eksisterende tidsserier)
2. Lighthouse Accessibility-audit kjørt manuelt i Chrome for å verifisere WCAG ≥ 95
3. Manuell skjermleser-test (VoiceOver / NVDA) for å verifisere at filter-status, drilldown-fokus og tab-navigering oppleves naturlig
4. Eventuell videre polering: tab-rekkefølge gjennom hele dashbordet, kontrast-sjekk av --advarsel-700 mot oransje stolpe-bakgrunn
5. Vurder å utvide priskalkulator med post-spesifikk modus (brukeren velger faktisk post og ser konvertert beløp mot postens tidsserie). I dag bruker kalkulatoren generelle deflatorer
6. Vurder å la priskalkulatoren håndtere fortidige år (data finnes fra 2014, men default-periode er 2022)

## Bevisst utelatt fra første versjon

- SRI-hash på Plotly-script: CDN-en publiserer ikke en stabil hash; å hardkode en hash vil bryte ved CDN-oppdatering.
- Regnskapsdata: utsatt til Fase 2 (kun bevilgning i første versjon).
- Eksport til PNG/Excel: planlagt, ikke implementert.

## Validerte referansetall (fra prototypen, med basisår 2024 og periode 2014–2026)

Disse brukes som testcase for å verifisere at modulene gir samme svar som prototypen. Default i nåværende kode er basisår 2026 og periode 2022–2026, så referansetallene må kjøres eksplisitt med de gamle parameterne.

### Rammetilskudd kommuner, innbyggertilskudd (kapittel 571, post 60, kommunal deflator)
- 2014: 115,8 mrd nominell, 163,3 mrd i 2024-priser
- 2026: 202,1 mrd nominell, 185,4 mrd i 2024-priser

### Forsvarsdepartementet (samlet)
- 2014: 42,4 mrd nominell, 58,5 mrd reell
- 2026: 178,0 mrd nominell, 164,5 mrd reell
- Realvekst 2014–2026: +181,2 %

### Realvekst per departement 2014–2026 (forventede tall, basisår 2024)
- Forsvarsdepartementet: +181,2 %
- Klima- og miljødepartementet: +104,8 %
- Kultur- og likestillingsdepartementet: +53,7 %
- Landbruks- og matdepartementet: +34,7 %
- Helse- og omsorgsdepartementet: +28,7 %
- Justis- og beredskapsdepartementet: +27,0 %

### Strukturelle brudd
- Energidepartementet: vises som negativ realvekst, må markeres som brudd. Bruddtekst forklarer at departementet ble etablert 1. januar 2024 og at post 90-serien gir negative netto-summer
- Nærings- og fiskeridepartementet: meningsløst negativt tall pga post 90-serien (kapitaltilskudd/utlån). Anbefalt å drille ned til programområde- eller post-nivå
- Digitaliserings- og forvaltningsdepartementet: fantes ikke før 1. januar 2024. Brukeren anbefales å velge periode fra 2024 og framover

## Åpne spørsmål

- Hvor skal dashbordet hostes for visning under kurset? (GitHub Pages, intern server, lokal)
- Skal regnskapsdata med fra Fase 2 eller utsettes? (Planlagt: utsettes)
