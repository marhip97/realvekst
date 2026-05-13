# Status — realvekst-statsbudsjett

Sist oppdatert: 2026-05-13

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
- Prototype av datalag overført til src/data/bevilgning.py med tester i tests/test_bevilgning.py

## Hva er under arbeid

- Fase 2 fortsetter: src/data/deflator.py (kumulativ indeks)
- Fase 3 forberedes: src/analyse/realvekst.py, aggregering.py, brudd.py

## Hva er blokkert

- Ingenting

## Neste konkrete steg

1. PR `feature/datalag-bevilgning`: verifisere at tests/test_bevilgning.py passerer mot rådata, justere ved behov
2. PR `feature/datalag-deflator`: implementere src/data/deflator.py med kumulativ indeks og tester
3. PR `feature/analyse-realvekst`: src/analyse/realvekst.py med deflator-anvendelse basert på postnummer
4. PR `feature/analyse-hierarki`: aggregering på alle nivåer og bruddmarkering
5. PR `feature/designsystem`: docs/design/02-*, 03-*, src/dashboard/tokens.css
6. PR `feature/frontend-dashboard`: index.html, styles.css, dashboard.js (kan deles)

## Validerte referansetall (fra prototypen)

Disse brukes som testcase for å verifisere at modulene gir samme svar som prototypen:

### Rammetilskudd kommuner, innbyggertilskudd (kapittel 571, post 60, kommunal deflator)
- 2014: 115,8 mrd nominell, 163,3 mrd i 2024-priser
- 2026: 202,1 mrd nominell, 185,4 mrd i 2024-priser

### Forsvarsdepartementet (samlet)
- 2014: 42,4 mrd nominell, 58,5 mrd reell
- 2026: 178,0 mrd nominell, 164,5 mrd reell
- Realvekst 2014-2026: +181,2 %

### Realvekst per departement 2014-2026 (forventede tall)
- Forsvarsdepartementet: +181,2 %
- Klima- og miljødepartementet: +104,8 %
- Kultur- og likestillingsdepartementet: +53,7 %
- Landbruks- og matdepartementet: +34,7 %
- Helse- og omsorgsdepartementet: +28,7 %
- Justis- og beredskapsdepartementet: +27,0 %

### Strukturelle brudd
- Energidepartementet: vises som negativ realvekst, må markeres som brudd
- Nærings- og fiskeridepartementet: meningsløst negativt tall, må markeres som brudd
- Digitaliserings- og forvaltningsdepartementet: fantes ikke i 2014, må markeres

## Åpne spørsmål

- Hvor skal dashbordet hostes for visning under kurset? (GitHub Pages, intern server, lokal)
- Skal regnskapsdata med fra Fase 2 eller utsettes? (Planlagt: utsettes)
