# 02 — Informasjonsarkitektur

Dette dokumentet beskriver hvordan dashbordet er strukturert og hvordan brukeren beveger seg gjennom det. Skal leses sammen med `01-principles.md` (designprinsipper) og `03-components.md` (komponentbibliotek).

## Overordnet modell

Dashbordet er bygget rundt **to ortogonale dimensjoner**:

1. **Navigasjon** — drilldown gjennom budsjetthierarkiet, fra alle departementer ned til én post.
2. **Filtrering** — selektiv begrensning uavhengig av hvor i hierarkiet brukeren befinner seg.

Disse to dimensjonene kombineres fritt: en bruker kan filtrere på post-type 30–49 (investeringer) mens hun samtidig drillder inn på Forsvarsdepartementet.

## Navigasjonshierarkiet

Fire nivåer, ett aktivt om gangen:

```
Nivå 0  Alle departementer
        |
Nivå 1  Ett departement
        |
Nivå 2  Ett programområde (nestet i departementet)
        |
Nivå 3  Én post (med kapittel- og post-type-detaljer)
```

### Nivåspesifikt innhold

| Nivå | Hovedvisning | Toppliste under |
|------|---|---|
| 0 | Realvekst-rangering av alle departementer | — |
| 1 | Tidsserie nominell + reell for departementet | Programområder under |
| 2 | Tidsserie nominell + reell for programområdet | Poster under |
| 3 | Tidsserie for posten + tabell med år-for-år | (ingen — bladnivå) |

Hvert nivå deler den samme hovedstrukturen:

1. **Brødsmulesti** med klikkbare nivåer
2. **Hero-blokk** med KPI-kort for valgt enhet
3. **Tidsserie-graf** med nominell og reell linje
4. **Toppliste** med underordnede enheter (når aktuelt)
5. **Metode-merknad** under hver visualisering

### Faglig forutsetning: programområder og departementer

Tre programområder krysser departementer (Arbeidsliv folketrygden, Konstitusjonelle institusjoner, Olje- og energiformål). Drilldown håndterer dette ved å **alltid filtrere på det valgte departementet**. På nivå 2 ser brukeren bare den delen av programområdet som tilhører departementet hun har drilldown'et inn på. For tverrgående analyser bruker hun filterfunksjonen i stedet.

Dette er en bevisst forenkling: drilldown svarer på "hva er innenfor det jeg ser nå?", filteret svarer på "vis meg alt som matcher kriterium X, uavhengig av sted".

## Filtermodell

Filtre virker globalt over hele dashbordet, uavhengig av navigasjonsnivå:

| Filter | Type | Virker på |
|---|---|---|
| Post-type | Multivalg | Drift, investering, overføringer, utlån |
| Tekstsøk | Frisøk | Departement, programområde, kapittelnavn, kapittelnummer, postnavn, postnummer |
| Realvekst-terskel | Slider | Absolutt realvekst |
| Periode | To år | Basisår og sammenligningsår |
| Basisår | Enkeltvalg | Hvilket år som er = 100 i prisindeksen |

Når et filter aktiveres, oppdateres alle tall og visualiseringer samtidig.

## Tilstand i URL

Både navigasjonssted og filtervalg persisteres i URL-en:

```
?dep=10&program=04&filter=drift,investering&start=2014&slutt=2026
```

Konsekvenser:

- Brukere kan dele lenker som peker direkte til en spesifikk analytisk visning
- Browser-back/forward fungerer som forventet i drilldown
- Bokmerker er meningsfulle

URL-parametre dokumenteres i komponentbiblioteket (`03-components.md`).

## Strukturelle brudd — hvordan de vises

Når en visning krysser et kjent strukturelt brudd (Energidep, Nærings- og fiskeridep, Digitaliserings- og forvaltningsdep), markeres dette **alltid**, aldri skjult:

- KPI-kort: en `var(--farge-advarsel)` ikon ved siden av tallet
- Tidsserie: vertikal linje på bruddåret, og en advarselsboks under grafen med fagligfaglig forklaring (hentet fra `src.analyse.brudd.STRUKTURELLE_BRUDD_DEPARTEMENT`)
- Toppliste: prikkstørrelse eller margin-indikator viser at tallet er upålitelig

Dette er en fagligfaglig forpliktelse: verktøyet skal ikke lyve med tall.

## Tilgjengelighetskrav

Hver visualisering har et **tabell-alternativ** for skjermlesere:

```html
<figure>
  <div class="graf" aria-describedby="graf-1-tabell">…</div>
  <details>
    <summary>Vis data som tabell</summary>
    <table id="graf-1-tabell">…</table>
  </details>
  <figcaption>Metode-merknad</figcaption>
</figure>
```

Tastaturnavigering:

- `Tab` flytter mellom interaktive kontroller (toggler, filtre, drilldown-knapper)
- `Enter` aktiverer
- `Esc` lukker eventuelle åpne menyer
- Drilldown er klikkbart i KPI-kort og toppliste-rader, alltid med fokusindikator

Skip-link er første fokuserbare element og fører til `<main>`.
