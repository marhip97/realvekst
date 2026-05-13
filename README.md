# Realvekst statsbudsjett

Dashbord for Finansavdelingen i Finansdepartementet som beregner og visualiserer realvekst i bevilgninger på alle nivåer av statsbudsjettets hierarki: Departement → Programområde → Post.

## Hva verktøyet løser

Statsregnskapets rådata viser nominelle bevilgningstall. For meningsfull tidsserieanalyse må disse omregnes til faste priser ved hjelp av deflatorer. Verktøyet:

- Anvender korrekt deflator basert på postnummer (60-69 = kommunal deflator, ellers statsbudsjettets utgiftsdeflator)
- Bygger kumulativ prisindeks med justerbart basisår
- Markerer strukturelle brudd som gjør sammenligning over tid usikker
- Lar brukeren bore seg ned fra departement til programområde til enkeltpost

## Datakilder

- Bevilgningsdata fra statsregnskapet 2014-2026 (Excel)
- Prisomregningsfaktorer fra Finansdepartementet (statsbudsjettets utgiftsdeflator og kommunal deflator)

## Teknologi

- Python (pandas) for databearbeiding
- Statisk HTML + CSS + JavaScript for frontend
- Plotly.js for visualisering
- GitHub Pages for hosting

## Mappestruktur

```
data/                  Datafiler (rå og prosessert)
src/data/              Python-moduler for innlasting og rensing
src/analyse/           Realvekstberegning og aggregering
src/dashboard/         Statisk frontend (HTML/CSS/JS)
tests/                 Pytest-tester
docs/design/           Designdokumenter
notebooks/             Utforskende analyser
```

## Komme i gang

```bash
# Installer avhengigheter
pip install -e .

# Kjør databearbeiding
python -m src.data.bygg_datasett

# Start frontend lokalt
cd src/dashboard && python -m http.server 8000
# Åpne http://localhost:8000
```

## Status

Se [STATUS.md](STATUS.md) for hva som er ferdig, under arbeid, og neste steg.
Se [PROJECT_PLAN.md](PROJECT_PLAN.md) for den overordnede planen.

## Bidrag

Prosjektet følger feature branch-flyt med pull requests. Aldri direkte commits til main.
Se [CLAUDE.md](CLAUDE.md) for fagligfaglige konvensjoner og prosjektkontekst.
