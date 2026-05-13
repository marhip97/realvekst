"""Aggregér reell bevilgning på hierarkinivåer.

Inngangspunktet er datasettet fra `src.analyse.realvekst.beregn_reell_bevilgning`,
som har én rad per (post × år) med både nominell og reell verdi. Denne
modulen ruller dataene opp til de tre nivåene som brukes i drilldown-
navigasjonen:

- **Departement** (nivå 0/1)
- **Programområde innenfor departement** (nivå 2) — alltid nestet i
  departementet, fordi tre programområder krysser departementer
  (Arbeidsliv, Konstitusjonelle institusjoner, Olje- og energiformål).
  Tverrgående analyser gjøres via filterfunksjonen, ikke drilldown.
- **Post** (nivå 3) — input-rader allerede aggregert til dette nivået.

Hver aggregeringsfunksjon returnerer en DataFrame med kolonnene
`nominell`, `reell` og hierarkiidentifikatorene relevant for nivået.
Realvekst-prosent over en periode kan beregnes på toppen ved å bruke
`realvekst_for_periode`.
"""

import pandas as pd

from src.analyse.realvekst import realvekst_prosent


def _aarskolonne(df: pd.DataFrame) -> str:
    return "Ar" if "Ar" in df.columns else "År"


def aggreger_per_departement(bev_reell: pd.DataFrame) -> pd.DataFrame:
    """Aggregér til (departement × år).

    Returnerer DataFrame med kolonner:
    - Fagdepartement_id, Fagdepartement, Ar
    - nominell (sum Bevilgning_beløp)
    - reell (sum Bevilgning_reell)
    """
    aar_kol = _aarskolonne(bev_reell)
    return (
        bev_reell.groupby(
            ["Fagdepartement_id", "Fagdepartement", aar_kol], as_index=False
        )
        .agg(nominell=("Bevilgning_beløp", "sum"), reell=("Bevilgning_reell", "sum"))
        .rename(columns={aar_kol: "Ar"})
    )


def aggreger_per_programomraade(bev_reell: pd.DataFrame) -> pd.DataFrame:
    """Aggregér til (departement × programområde × år).

    Programområder holdes alltid nestet i departement fordi tre av dem
    krysser departementer (jf. CLAUDE.md). For tverrgående visning må
    konsumenten filtrere på Programområde_nr på tvers.
    """
    aar_kol = _aarskolonne(bev_reell)
    return (
        bev_reell.groupby(
            [
                "Fagdepartement_id",
                "Fagdepartement",
                "Programområde_nr",
                "Programområde",
                aar_kol,
            ],
            as_index=False,
        )
        .agg(nominell=("Bevilgning_beløp", "sum"), reell=("Bevilgning_reell", "sum"))
        .rename(columns={aar_kol: "Ar"})
    )


def aggreger_per_kapittel(bev_reell: pd.DataFrame) -> pd.DataFrame:
    """Aggregér til (departement × kapittel × år).

    Brukes i visninger der man ser alle poster under et kapittel
    (typisk på nivå 3 før man drillder til enkeltpost).
    """
    aar_kol = _aarskolonne(bev_reell)
    return (
        bev_reell.groupby(
            [
                "Fagdepartement_id",
                "Fagdepartement",
                "kapittel_nr",
                "Kapittel",
                aar_kol,
            ],
            as_index=False,
        )
        .agg(nominell=("Bevilgning_beløp", "sum"), reell=("Bevilgning_reell", "sum"))
        .rename(columns={aar_kol: "Ar"})
    )


def realvekst_for_periode(
    aggregert: pd.DataFrame,
    id_kolonner: list[str],
    start: int,
    slutt: int,
) -> pd.DataFrame:
    """Beregn realvekst mellom to år for et aggregert datasett.

    `id_kolonner` er listen av kolonner som identifiserer en enhet — f.eks.
    `['Fagdepartement_id', 'Fagdepartement']` for departementsnivå eller
    `['Fagdepartement_id', 'Fagdepartement', 'Programområde_nr', 'Programområde']`
    for programområde.

    Returnerer DataFrame med id-kolonnene, `reell_start`, `reell_slutt`,
    `nominell_start`, `nominell_slutt` og `realvekst_pst` (NaN hvis enheten
    ikke finnes i begge år, eller hvis startverdien er null).
    """
    start_df = aggregert[aggregert["Ar"] == start][
        [*id_kolonner, "nominell", "reell"]
    ].rename(columns={"nominell": "nominell_start", "reell": "reell_start"})
    slutt_df = aggregert[aggregert["Ar"] == slutt][
        [*id_kolonner, "nominell", "reell"]
    ].rename(columns={"nominell": "nominell_slutt", "reell": "reell_slutt"})

    sammen = start_df.merge(slutt_df, on=id_kolonner, how="outer")
    sammen["realvekst_pst"] = sammen.apply(
        lambda r: realvekst_prosent(r["reell_start"], r["reell_slutt"])
        if pd.notna(r["reell_start"]) and pd.notna(r["reell_slutt"])
        else float("nan"),
        axis=1,
    )
    return sammen
