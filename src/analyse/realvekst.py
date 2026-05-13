"""Anvend riktig deflator på bevilgningsdata og beregn reell verdi.

Den faglige forutsetningen er at hvilken deflator som gjelder for en
bevilgning bestemmes av **postnummeret**, ikke av Post_type-feltet:

- **Kommunal deflator**: poster 60-69 (overføringer til kommuner og
  fylkeskommuner)
- **Statsbudsjettets utgiftsdeflator**: alle andre poster

Postnummer-konvensjonen er den primære fagligfaglige regelen i
Finansdepartementet. Post_type kan være feilkategorisert eller mangle i
andre datakilder.

Modulen tilbyr to nivåer:

- `velg_deflator_type(post_nr)`: ren funksjon som returnerer 'statlig'
  eller 'kommunal' for ett enkelt postnummer.
- `beregn_reell_bevilgning(bev, basisaar)`: tar et bevilgningsdatasett
  (fra `src.data.bevilgning.last_bevilgning`) og returnerer det samme
  datasettet med tre nye kolonner: `deflator_type`, `prisindeks` og
  `Bevilgning_reell`.

Aggregering på departement- og programområdenivå er bevisst utenfor
denne modulen — det legges i `src.analyse.aggregering` i neste fase.
"""

import pandas as pd

from src.data.bevilgning import last_bevilgning
from src.data.deflator import DEFAULT_BASISAAR, bygg_prisindeks


def velg_deflator_type(post_nr: int) -> str:
    """Returner 'kommunal' for poster 60-69, ellers 'statlig'.

    Postnummerintervallet 60-69 dekker overføringer til kommuner og
    fylkeskommuner (jf. budsjettkonvensjonen for postnummerering).
    """
    if 60 <= post_nr <= 69:
        return "kommunal"
    return "statlig"


def _aarskolonne(df: pd.DataFrame) -> str:
    """Datasettene varierer mellom 'Ar' og 'År' avhengig av Excel-leser."""
    return "Ar" if "Ar" in df.columns else "År"


def beregn_reell_bevilgning(
    bev: pd.DataFrame,
    basisaar: int = DEFAULT_BASISAAR,
) -> pd.DataFrame:
    """Legg til reell bevilgning per rad ved hjelp av riktig deflator.

    Input forventes å være output fra `src.data.bevilgning.last_bevilgning`
    (aggregert per post × år). Funksjonen returnerer en kopi med tre nye
    kolonner:

    - `deflator_type` ('statlig' eller 'kommunal')
    - `prisindeks` (kumulativ indeks med basisår = 100)
    - `Bevilgning_reell` (nominell verdi omregnet til basisårspriser)

    Formel: `Bevilgning_reell = Bevilgning_beløp * 100 / prisindeks`.

    Basisår kan endres; det må finnes i deflator-dataenes år-spenn.
    """
    if "post_nr" not in bev.columns:
        raise ValueError(
            "Mangler kolonnen 'post_nr'. Kjør split_kapittel_og_post først "
            "(skjer automatisk i last_bevilgning)."
        )

    indeks_bred = bygg_prisindeks(basisaar=basisaar)
    # Smelt fra én rad per år med to indeks-kolonner til én rad per (år, type).
    indeks_lang = pd.melt(
        indeks_bred,
        id_vars=["Ar"],
        value_vars=["indeks_statlig", "indeks_kommunal"],
        var_name="deflator_type",
        value_name="prisindeks",
    )
    indeks_lang["deflator_type"] = indeks_lang["deflator_type"].str.replace(
        "indeks_", "", regex=False
    )

    ut = bev.copy()
    ut["deflator_type"] = ut["post_nr"].apply(velg_deflator_type)

    aar_kol = _aarskolonne(ut)
    ut = ut.merge(
        indeks_lang,
        left_on=[aar_kol, "deflator_type"],
        right_on=["Ar", "deflator_type"],
        how="left",
        suffixes=("", "_indeks"),
    )
    # Fjern duplikat-årskolonne fra merge hvis det oppstod
    if "Ar_indeks" in ut.columns:
        ut = ut.drop(columns=["Ar_indeks"])

    ut["Bevilgning_reell"] = ut["Bevilgning_beløp"] * 100 / ut["prisindeks"]
    return ut


def realvekst_prosent(reell_start: float, reell_slutt: float) -> float:
    """Beregn prosentvis endring i reell bevilgning mellom to tidspunkter.

    Returnerer NaN hvis startverdien er 0 (udefinert vekstrate).
    """
    if reell_start == 0:
        return float("nan")
    return (reell_slutt - reell_start) / reell_start * 100


if __name__ == "__main__":
    bev = last_bevilgning()
    bev_reell = beregn_reell_bevilgning(bev, basisaar=2024)
    aar_kol = _aarskolonne(bev_reell)

    print(f"Lastet {len(bev_reell):,} rader med deflator anvendt")
    print(f"Andel kommunal: {(bev_reell['deflator_type'] == 'kommunal').mean():.1%}")
    print()
    print("Forsvarsdepartementet, reell bevilgning i 2024-priser (mrd):")
    forsvar = bev_reell[bev_reell["Fagdepartement"] == "Forsvarsdepartementet"]
    per_aar = forsvar.groupby(aar_kol)["Bevilgning_reell"].sum() / 1e9
    print(per_aar.to_string())
    rv = realvekst_prosent(per_aar.loc[2014], per_aar.loc[2026])
    print(f"\nRealvekst 2014-2026: {rv:+.1f} %")
