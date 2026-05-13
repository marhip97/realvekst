# Status — realvekst-statsbudsjett

Sist oppdatert: ved prosjektoppstart

## Hva er ferdig

- Repo opprettet med komplett mappestruktur
- CLAUDE.md, PROJECT_PLAN.md, STATUS.md, README.md på plass
- pyproject.toml med avhengigheter definert
- .gitignore på plass
- Prototype er bygget og validert utenfor prosjektrepoet:
  - Bevilgningsdata lastet og slått sammen (54 835 transaksjonsrader, 2014-2026)
  - Aggregert til 21 326 unike post-år-kombinasjoner
  - Deflatorer omregnet til kumulativ indeks (basisår 2024)
  - Riktig deflator anvendt basert på POSTNUMMER (60-69 = kommunal, ellers statlig)
  - Realvekst beregnet og validert mot kjente case (Forsvarsdep: +181 % real 2014-2026)
  - Strukturelle brudd identifisert (Energidep, Nærings- og fiskeridep)
  - 1 301 post-år-rader klassifisert som kommunal deflator, 20 025 som statlig

## Hva er under arbeid

- Fase 2: Overføre prototypelogikk til strukturerte moduler i src/data/ og src/analyse/

## Hva er blokkert

- Ingenting

## Neste konkrete steg

1. Initialisere git repo med første commit på main
2. Opprette feature branch `feature/datalag-bevilgning` for å skrive første modul
3. Implementere src/data/bevilgning.py med tester mot validerte referansetall
4. Pull request med selvkontroll, merge til main
5. Gjenta for src/data/deflator.py og src/analyse/realvekst.py

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
