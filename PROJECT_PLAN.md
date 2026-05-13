# Prosjektplan — realvekst-statsbudsjett

## Mål

Bygge et fungerende dashbord som demonstrerer mulighetsrommet for Claude Code under FIN-kurset. Skal samtidig være et nyttig arbeidsverktøy for kollegene som faktisk vil bruke det videre.

Designet skal være på samme profesjonelle nivå som SFSs Ukraina-støtte-dashbord (github.com/marhip97/ukrainastotte) — med ett designsystem som én sannhet, WCAG-tilgjengelighet bakt inn, og fagligfaglig respekt for brukeren gjennom metode-merknader og presis tallformatering.

## Funksjonsoversikt — slik prosjektet legges opp nå

Dashbordet skal være et arbeidsverktøy for FIN som besvarer spørsmålet "hvordan har bevilgningen utviklet seg reelt?" på alle nivåer av budsjetthierarkiet.

### Informasjonsarkitektur

Dashbordet er strukturert rundt to ortogonale dimensjoner: **navigasjon** (drilldown gjennom hierarkiet) og **filtrering** (selektiv begrensning av hva som vises). Disse kan kombineres fritt.

### Navigasjonsmodell (drilldown)

Brukeren beveger seg gjennom fire nivåer:

- **Nivå 0 — Alle departementer.** Oversiktsvisning med realvekst per departement.
- **Nivå 1 — Ett departement.** Viser departementets utvikling og programområder under det.
- **Nivå 2 — Ett programområde (innenfor det valgte departementet).** Viser programområdets utvikling og enkeltposter under det.
- **Nivå 3 — Én post.** Detaljert visning av posten med kapittel, post-type, og deflator brukt.

Brødsmulesti på toppen viser hele navigasjonsveien. Klikk i brødsmulestien går tilbake til ønsket nivå.

### Faglig forutsetning om hierarkiet

I de aller fleste tilfeller er programområder nestet under ett departement. Det finnes tre unntak (Arbeidsliv folketrygden, Konstitusjonelle institusjoner, Olje- og energiformål) som krysser departementer. Disse håndteres ved at drilldown alltid filtrerer på det valgte departementet — brukeren ser kun den delen av programområdet som tilhører departementet hun har valgt. For tverrgående analyser brukes filterfunksjonen i stedet.

### Filtermodell

Filtre virker uavhengig av navigasjonsnivå:

- **Post-type-filter** (multivalg): drift, investeringer, overføringer til andre, overføringer til kommuner og fylkeskommuner, utlån og kapitaltilskudd
- **Tekstsøk** på tvers av departementer, programområder, kapitler, og poster
- **Realvekst-terskel**: vis kun elementer der absolutt realvekst overstiger en valgt grense
- **Periode**: basisår og sammenligningsår

Når et filter aktiveres, oppdateres alle tall og visualiseringer.

### Tilstand i URL

Navigasjonssted og filtervalg persisteres i URL. Brukere kan dele lenker som peker direkte til en spesifikk analytisk visning.

### Hovedfunksjoner per nivå

**Alle nivåer:**
- Nominell og reell tidsserie for valgt enhet
- KPI-kort med nøkkeltall (nominell verdi siste år, reell verdi siste år, realvekst, andel av overordnet enhet)
- Toppliste av underliggende enheter, sortert på valgt kriterium
- Justerbart basisår (default forrige avsluttede budsjettår, p.t. 2024)
- Eksport av visning til Excel og PNG

**Alle departementer (nivå 0):**
- Realvekst-rangering av alle departementer
- Strukturelle brudd markeres tydelig (Energidep, Nærings- og fiskeridep)
- Filter-toppmeny med alle filtertyper

**Ett departement (nivå 1):**
- Departementets samlede utvikling
- Realvekst per programområde under departementet
- Andel av departementets bevilgning per programområde

**Ett programområde (nivå 2):**
- Programområdets samlede utvikling
- Realvekst per post under programområdet
- Fordeling på post-typer (drift, investering osv.)

**Én post (nivå 3):**
- Postens detaljerte utvikling
- Tabell med år-for-år nominelle og reelle tall
- Metadata: kapittelnummer, post-id, post-type, deflator brukt
- Eventuelle transaksjonsdetaljer (saldert, RNB, tilleggsbevilgninger)

### Hva som er bevisst utelatt fra første versjon

Følgende kan komme i senere versjoner:

- Programkategori som eget navigasjonsnivå (mellom departement og programområde)
- Regnskapsdata integrert (kun bevilgning i første versjon)
- AI-generert tekstuell tolkning av tall
- Sankey-visualisering av budsjettstrømmer
- Sammenligning på tvers av regjeringsperioder
- Avansert bruddhåndtering (manuell korreksjon)
- Multivalg av poster eller departementer for direkte sammenligning

Begrunnelse: Vi prioriterer en *fullstendig fungerende* førsteversjon over en halvferdig versjon med mange features.

## Faser

### Fase 1: Fundament (dag 1-2)

Opprett repo og legg inn:
- CLAUDE.md, STATUS.md, PROJECT_PLAN.md, README.md
- pyproject.toml med avhengigheter
- Mappestruktur
- Data fra prototype overført til data/raw/
- **Designdokumenter under docs/design/** (se Designspor)

Resultat: Funksjonelt repo, alle filer på plass.

### Fase 2: Datalag (dag 3-5)

Bygg modulene i src/data/:
- bevilgning.py: leser begge Excel-filer, parser, aggregerer
- deflator.py: bygger kumulativ indeks med valgt basisår

Tester med validering mot kjente referansetall.

### Fase 3: Analyselag (dag 6-8)

Bygg modulene i src/analyse/:
- realvekst.py: deflator-anvendelse (60-69 = kommunal, ellers statlig)
- aggregering.py: aggregering på alle nivåer i hierarkiet
- brudd.py: deteksjon av strukturelle brudd

### Fase 4: Designsystem og tokens (dag 9-10)

Før noen frontend-kode skrives, etabler designsystemet:
- docs/design/01-principles.md (designprinsipper)
- docs/design/02-architecture.md (informasjonsarkitektur)
- docs/design/03-components.md (komponenter)
- src/dashboard/tokens.css (én sannhet for visuelle valg)

Dette gjøres FØR frontend-kode for å unngå inkonsistente valg.

### Fase 5: Frontend (dag 11-17)

Bygg dashbordet med tokens som grunnlag:
- index.html med semantisk struktur, WCAG-grunnlag
- styles.css som kun bruker var(--token)
- dashboard.js for interaktivitet
- Implementering seksjon for seksjon (hero, hierarkisk navigasjon, toppliste, sammenligning, eksport)

### Fase 6: Polering og demo-forberedelse (dag 18-21)

- Tilgjengelighetstest (skjermleser, tastaturnavigering, kontrast)
- Cross-browser-test
- Demo-script: hva skal bygges live foran publikum?
- Backup-plan for tekniske feil
- Øvelse på presentasjonen

## Designspor

Designet skal arve den profesjonelle kvaliteten fra Ukraina-dashbordet. Dette betyr ikke kopi, men adopsjon av samme prinsipper, tilpasset budsjettdomenet.

### Designsystem som én sannhet

Alle visuelle valg dokumenteres i src/dashboard/tokens.css og forklares i docs/design/. Ingen rå hex-verdier i styles.css. Ingen magic numbers i JavaScript. Tokens leses i JS via getComputedStyle slik at Plotly-tema automatisk følger CSS.

### Fargepalett

Hovedfarger forankret i FINs supplerende designprofil (se fin-designprofil-skill). Skal harmonere med Ukraina-dashbordets struktur:

- En primær aksentfarge (FINs blå-palett) for det fremhevede elementet (typisk det departementet eller posten brukeren utforsker)
- Dempet sekundærfarge for sammenligningselementer
- Nøytrale farger for tekst, kortbakgrunn, kantlinjer
- Semantiske farger: positiv (vekst), negativ (nedgang), advarsel (strukturelt brudd, datakvalitet)
- Kategorifarger for nominell vs. reell linje (sekvensielle blåtoner)

Hver farge skal ha dokumentert WCAG-kontrast mot relevant bakgrunn.

### Typografi

Skala 1.25 (major third). Tabular-nums for alle tallverdier. Norsk komma som desimaltegn, ikke-brytende mellomrom mellom tall og enhet ("12,4 mrd"). Skala fra micro (kildehenvisning) til hero (det fremhevede tallet).

### Layout

12-kolonne grid med tre breakpoints: mobile (default), tablet (≥768px), desktop (≥1100px). Mobile-first.

### Komponenter som arves direkte

- KPI-kort (hero og standard varianter)
- Komparativ-blokk (filter-rullgardin + grid med profilkort)
- Toppliste-graf (horisontal stolpe, fremhevet element i sterk farge, andre i dempet)
- Periode-/valg-togglere med radio-knapper styled som knappegrupper
- Metode-merknader under hver graf
- Footer med datalast-ned-detaljer

### WCAG-tilgjengelighet

WCAG 2.1 AA som minimum:

- Skip-link til hovedinnhold
- Semantiske HTML-elementer (header, main, section, article, footer)
- ARIA-labels og roller på interaktive elementer
- Fokusindikatorer med 3px outline i fokusring-farge
- Kontrast-krav (4,5:1 for normal tekst, 3:1 for store overskrifter og UI-komponenter)
- prefers-reduced-motion respekteres
- Alle datavisualiseringer har tabell-alternativ for skjermleser
- Tastaturnavigering for alle kontroller

### Fagligfaglig integritet

Hver visualisering skal ha:

- Tydelig overskrift som forklarer hva som vises
- Aksetitler med enhet
- Metode-merknad under: hvilken deflator, hvilket basisår, kjente avgrensninger
- Eksportknapp for PNG der relevant

Strukturelle brudd skal aldri skjules. Når en sammenligning krysser et brudd, vises en visuell advarsel ved siden av tallet. Dette er en faglig forpliktelse — verktøyet skal ikke lyve med tall.

### Inspirasjonskilder

- SFSs Ukraina-støtte-dashbord (github.com/marhip97/ukrainastotte) for samlet kvalitetsnivå, struktur, WCAG-tilnærming
- FINs supplerende designprofil (fin-designprofil) for fargepalett og typografiske valg
- Norges Bank, SSB, og DFØ for benchmark på hvordan offentlige fagverktøy formidler tall

## Suksesskriterier for kurset

1. Dashbordet kjører feilfritt under demo
2. Designet oppleves som profesjonelt og på linje med offentlige fagverktøy
3. Minst én faglig kollega sier "dette ville jeg brukt" etter demoen
4. Minst én kollega prøver Claude Code etter kurset basert på inspirasjon herfra

## Teknologivalg

- **Backend / dataprosessering:** Python (pandas, openpyxl)
- **Frontend-tilnærming:** statisk HTML + CSS + JavaScript (samme som Ukraina-dashbordet)
- **Visualiseringsbibliotek:** Plotly.js (via CDN), tema styres av CSS-tokens
- **Deployment:** GitHub Pages eller intern server (avklares senere)

Begrunnelse for statisk frontend: enklere å vedlikeholde enn Streamlit, bedre design-kontroll, ingen runtime-Python-avhengighet for sluttbrukerne, og direkte sammenligbar med referansedashbordet. Datafilene genereres en gang av Python-pipelinen og serves som CSV/JSON som frontend leser.
