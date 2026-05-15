"""Markér strukturelle brudd i bevilgningstidsserier.

Et strukturelt brudd er en endring i hva som ligger under et departement,
programområde, kapittel eller post — for eksempel en omorganisering,
splittelse eller sammenslåing — som gjør at tidsserier ikke kan
sammenlignes direkte.

Per fagligfaglig forpliktelse (jf. CLAUDE.md og PROJECT_PLAN.md):
strukturelle brudd skal **aldri skjules**. Når en sammenligning krysser
et brudd, må verktøyet markere det visuelt slik at brukeren ser at
realvekst-tallet ikke er pålitelig over hele perioden.

Modulen tilbyr:

- `STRUKTURELLE_BRUDD_DEPARTEMENT`: konstant ordbok med kjente brudd
  på departementsnivå, basert på prototypens analyse.
- `marker_brudd_departement(df)`: legger på kolonnene `har_strukturelt_brudd`
  (bool) og `brudd_beskrivelse` (str eller None) basert på `Fagdepartement`-
  feltet.

Brudd på lavere nivåer (programområde, kapittel, post) kan legges til
senere; rammeverket er det samme.
"""

from collections.abc import Mapping

import pandas as pd

# Kjente strukturelle brudd på departementsnivå.
# Listen er forankret i prototype-analysen og dokumentert i STATUS.md.
STRUKTURELLE_BRUDD_DEPARTEMENT: Mapping[str, str] = {
    "Energidepartementet": (
        "Energidepartementet ble etablert 1. januar 2024 ved utskilling fra "
        "Olje- og energidepartementet. Tidsserien inneholder dessuten netto "
        "kapitaltilskudd/utlån (post 90-serien) som gir store negative "
        "summer. Realvekst-tallet er ikke direkte sammenlignbart med øvrige "
        "departementer. Bruk drilldown på programområde- og post-nivå for "
        "konsistente sammenligninger."
    ),
    "Nærings- og fiskeridepartementet": (
        "Departementet aggregerer netto kapitaltilskudd/utlån (post 90-serien) "
        "som gir store negative summer i flere år. Realvekst-tallet på "
        "departementsnivå er derfor ikke meningsfullt. Drill ned til "
        "programområde- eller post-nivå for å se reelle bevegelser."
    ),
    "Digitaliserings- og forvaltningsdepartementet": (
        "Departementet ble etablert 1. januar 2024 ved utskilling fra "
        "Kommunal- og distriktsdepartementet. Realvekst over en periode "
        "som krysser etableringsåret er ikke definert. Velg en periode "
        "fra 2024 og framover, eller drill ned til underliggende poster."
    ),
}


def marker_brudd_departement(df: pd.DataFrame) -> pd.DataFrame:
    """Annoter et datasett med kolonner som markerer strukturelle brudd.

    Input må ha kolonnen `Fagdepartement`. Funksjonen returnerer en kopi
    med to nye kolonner:

    - `har_strukturelt_brudd` (bool): True for rader hvor Fagdepartement
      finnes i `STRUKTURELLE_BRUDD_DEPARTEMENT`.
    - `brudd_beskrivelse` (str eller None): den fagligfaglige forklaringen,
      eller None for rader uten brudd.
    """
    if "Fagdepartement" not in df.columns:
        raise ValueError("Mangler kolonnen 'Fagdepartement'.")

    ut = df.copy()
    ut["har_strukturelt_brudd"] = ut["Fagdepartement"].isin(
        STRUKTURELLE_BRUDD_DEPARTEMENT
    )
    ut["brudd_beskrivelse"] = ut["Fagdepartement"].map(
        lambda navn: STRUKTURELLE_BRUDD_DEPARTEMENT.get(navn)
    )
    return ut
