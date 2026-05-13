# Realvekst statsbudsjett — prosjektkontekst for Claude Code

## Hva dette prosjektet er

Et dashbord for Finansavdelingen i Finansdepartementet som beregner og visualiserer realvekst i bevilgninger på alle nivåer av statsbudsjettets hierarki: Departement → Programområde → Post.

Verktøyet løser et reelt arbeidsbehov: at realveksten ikke fremgår direkte av rådata fra statsregnskapet, men krever korrekt prisomregning per postnummer og periode for å være meningsfull.

## Arbeidsspråk og konvensjoner

- All kommunikasjon, dokumentasjon, og UI-tekst på norsk bokmål
- Ingen emojier noe sted (organisasjonspolicy fra FIN)
- Variabelnavn i Python kan være engelske der det er etablert konvensjon (return, parse, etc.), norske der det er domenebegrep (bevilgning, deflator, realvekst)
- Kommentarer i koden på norsk

## Git-flyt

- Feature branches: `feature/<kort-beskrivelse>` eller `fix/<kort-beskrivelse>`
- Aldri direkte commits til main
- Pull request påkrevd for alle endringer
- Squash-and-merge for ferdige features

## Faglig forankring

### Sentrale definisjoner

- **Nominell bevilgning**: faktisk kronebeløp uten justering for prisstigning
- **Reell bevilgning**: nominell bevilgning omregnet til basisårets priser ved hjelp av deflator
- **Realvekst**: prosentvis endring i reell bevilgning mellom to år
- **Strukturelt brudd**: endring i hva som ligger under en post, kapittel eller departement (omorganisering, splitt, sammenslåing) som gjør tidsserier ikke direkte sammenlignbare

### Hierarkiet i statsbudsjettet

```
Departement (Fagdepartement_id, Fagdepartement)
  └── Programområde (Programområde_nr, Programområde)
       └── Kapittel (Kapittel_id, Kapittel)
            └── Post (post_nr, Post)
                 └── Post_type (kategori: drift, investering, overføringer)
```

VIKTIG: Kapittel og post skal alltid holdes som to separate konsepter i koden og UI:
- **Kapittel** er en større budsjettsamling (f.eks. kapittel 740 "Helsedirektoratet")
- **Post** er en spesifikk utgiftspost innen kapittelet (f.eks. post 01 "Driftsutgifter")

I rådataene er disse blandet i `Post_id`-feltet (f.eks. 74001 = kapittel 740, post 01). Datalaget splitter dette i to felter ved innlasting:
- `kapittel_nr` (de første n-2 sifrene av Post_id)
- `post_nr` (de to siste sifrene av Post_id)

Søk i dashbordet skal støtte både kapittelnavn, kapittelnummer, postnavn og postnummer.

### Hierarkiets unntak

Tre programområder krysser departementer:
- "Arbeidsliv, folketrygden" (Arbeids- og inkluderingsdepartementet og Nærings- og fiskeridepartementet)
- "Konstitusjonelle institusjoner" (tre departementer)
- "Olje- og energiformål" (Energidepartementet og forløperen)

Drilldown skal alltid filtrere på det valgte departementet. Tverrgående analyser gjøres via filterfunksjonen.

### Deflator-regel

To deflatorer brukes i Finansdepartementet, og hvilken som gjelder bestemmes av **postnummeret**, ikke av Post_type-feltet:

- **Kommunal deflator**: brukes for alle poster i 60-69-serien (overføringer til kommuner og fylkeskommuner)
- **Statsbudsjettets utgiftsdeflator**: brukes for alle andre poster

Denne regelen følger den etablerte budsjettkonvensjonen for postnummerering: 01-29 er drift, 30-49 er investeringer, 50-59 er overføringer til andre statsregnskap, 60-69 er overføringer til kommuner og fylkeskommuner, 70-89 er andre overføringer, 90+ er utlån/kapitaltilskudd.

VIKTIG: Bruk alltid postnummer-logikken, ikke Post_type-feltet, til å velge deflator. Selv om de i dette datasettet er ekvivalente, er postnummer-konvensjonen den primære fagligfaglige regelen. Post_type kan være feilkategorisert eller mangle i andre datakilder.

Begge deflatorer er årlige vekstrater. For å beregne realvekst over flere år bygges en **kumulativ prisindeks** med valgt basisår = 100.

### Basisår

Default basisår er forrige avsluttede budsjettår (per nå: 2024). Brukeren skal kunne endre dette, men det må alltid være tydelig hvilket basisår tallene refererer til.

### Robusthet

- Realvekst over en periode som krysser et strukturelt brudd er ikke pålitelig. Verktøyet skal **markere** slike tilfeller, ikke skjule dem.
- Bevilgningsdata er transaksjoner (saldert + RNB + tilleggsproposisjoner). Summer over et år gir stående bevilgning for en post.
- Bruk alltid ID-felter, aldri tekst, til gruppering (tekstvariasjoner som "m.v." vs "mv." finnes i dataene).

## Datakilder

Alle datafiler ligger i `data/raw/`:

- `bevilgning_2014_2019.xlsx` (25 026 rader)
- `bevilgning_2020_2026.xlsx` (29 809 rader)
- `deflatorer.csv` (årlige vekstrater)

### Viktige datavasking-konvensjoner

- Bevilgningsbeløp kan være tekststreng med komma som desimalskilletegn. Konverter alltid før beregning.
- Programområde-tekst kan ha små variasjoner ("m.v." vs "mv."). Bruk alltid ID-felter til gruppering.
- Excel-filer leses med pandas (`pd.read_excel`).

## Teknologivalg

- **Backend / dataprosessering:** Python (pandas, openpyxl). Genererer prosesserte CSV/JSON-filer som frontend leser.
- **Frontend:** statisk HTML + CSS + JavaScript. Ingen runtime-Python-avhengighet for sluttbrukerne.
- **Visualiseringsbibliotek:** Plotly.js (via CDN). Tema styres av CSS-tokens lest via getComputedStyle.
- **Deployment:** GitHub Pages eller intern server.

## Designsystem

Alle visuelle valg dokumenteres i `src/dashboard/tokens.css` og forklares i `docs/design/`. Frontend-koden (styles.css og dashboard.js) refererer alltid til tokens via `var(--token)` eller `getComputedStyle` — aldri rå hex-verdier eller magic numbers.

Designet arver kvalitetsnivået fra SFSs Ukraina-støtte-dashbord (github.com/marhip97/ukrainastotte) og forankres i FINs supplerende designprofil for farger og typografi.

WCAG 2.1 AA er minimum: skip-link, semantiske HTML-elementer, ARIA, fokusindikatorer, kontrastkrav, prefers-reduced-motion, og tabellalternativer for visualiseringer.

## Funksjonsoversikt

Dashbordet bygges rundt to ortogonale dimensjoner: **navigasjon** (drilldown) og **filtrering**.

### Navigasjonshierarki (drilldown)

- **Nivå 0** — Alle departementer
- **Nivå 1** — Ett departement (viser programområder under)
- **Nivå 2** — Ett programområde (viser poster under)
- **Nivå 3** — Én post (detaljvisning)

Brødsmulesti viser hele navigasjonsveien og er klikkbar.

### Filtre (uavhengige av navigasjon)

- Post-type (multivalg)
- Tekstsøk (matcher mot departement, programområde, kapittelnavn, kapittelnummer, postnavn, postnummer)
- Realvekst-terskel (vis kun elementer over/under valgt grense)
- Periode (basisår og sammenligningsår)

### Tilstand i URL

Navigasjonssted og filtervalg persisteres i URL for delbarhet.

## Filer som alltid skal leses ved sesjonsstart

1. STATUS.md
2. PROJECT_PLAN.md
3. data/raw/deflatorer.csv
4. docs/design/01-principles.md (når frontend-arbeid pågår)
5. src/dashboard/tokens.css (når frontend-arbeid pågår)

## Arbeidsmåte med Claude Code

- For endringer i datavasking eller deflator-logikk: legg alltid til tester
- For UI-endringer: vis først en skisse eller beskriv designet før implementering
- Oppdater STATUS.md etter hver fullført oppgave
- Foreslå commit-melding på norsk eller engelsk, men vær konsekvent innen ett PR
- Forklar resonnementet pedagogisk i prosa når du beskriver hva som blir gjort
