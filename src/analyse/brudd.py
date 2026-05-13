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
        "Energidepartementet er en omorganisering. Tidsserien viser "
        "negativ realvekst fordi det historiske området ikke er sammenlignbart. "
        "Bruk filtreringsfunksjonen for tverrgående analyser."
    ),
    "Nærings- og fiskeridepartementet": (
        "Strukturelt brudd: omorganisering med endret virkeområde gjør at "
        "tidsserien gir et meningsløst negativt realvekst-tall. Tallet skal "
        "ikke tolkes som faktisk nedgang."
    ),
    "Digitaliserings- og forvaltningsdepartementet": (
        "Departementet eksisterte ikke i 2014. Realvekst over hele perioden "
        "er udefinert og må markeres som strukturelt brudd."
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
