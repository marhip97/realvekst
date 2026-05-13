"""Bygg JSON-datasett for frontend.

Denne modulen er broen mellom analyselaget (pandas) og frontend (statisk
JavaScript). Den genererer JSON-filer som dashbordet i src/dashboard/
laster via fetch og rendrer med Plotly.js.

Designvalg:
- Vi genererer én JSON per visningsnivå/oversikt, ikke ett gigantisk
  datasett. Det holder hver enkelt fil liten og rask å parse i nettleser.
- Tallene oppgis i NOK (ikke MNOK eller GNOK) for å unngå avrundingsfeil.
  Frontend formaterer til mrd/mill ved presentasjon.
- Metadata-blokken dokumenterer basisår, periode og genereringstidspunkt.

Kjør: `python -m src.data.bygg_datasett` for å regenerere alle filer.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd

from src.analyse.aggregering import (
    aggreger_per_departement,
    realvekst_for_periode,
)
from src.analyse.brudd import marker_brudd_departement
from src.analyse.realvekst import beregn_reell_bevilgning
from src.data.bevilgning import last_bevilgning

# Frontend leser fra src/dashboard/data/. Skrivebanen er relativ til
# prosjektroten (to nivåer opp fra denne filen).
PROSJEKT_ROT = Path(__file__).resolve().parents[2]
DASHBOARD_DATA = PROSJEKT_ROT / "src" / "dashboard" / "data"

DEFAULT_BASISAAR = 2024
DEFAULT_START = 2014
DEFAULT_SLUTT = 2026


def _aarskolonne(df: pd.DataFrame) -> str:
    return "Ar" if "Ar" in df.columns else "År"


def bygg_oversikt(
    basisaar: int = DEFAULT_BASISAAR,
    start: int = DEFAULT_START,
    slutt: int = DEFAULT_SLUTT,
) -> dict[str, Any]:
    """Produser oversikten over alle departementer.

    Returnerer en dict klar for json.dump:
    - metadata: basisår, periode, generert-tidsstempel, kilde
    - departementer: liste med navn, nøkkeltall og full tidsserie per
      departement, sortert synkende på realvekst
    """
    bev = last_bevilgning()
    bev_reell = beregn_reell_bevilgning(bev, basisaar=basisaar)
    dep = aggreger_per_departement(bev_reell)
    dep = marker_brudd_departement(dep)

    realvekst = realvekst_for_periode(
        dep,
        id_kolonner=["Fagdepartement_id", "Fagdepartement"],
        start=start,
        slutt=slutt,
    )

    aar_kol = "Ar"
    departementer = []
    for _, rad in realvekst.iterrows():
        dep_id = int(rad["Fagdepartement_id"])
        navn = rad["Fagdepartement"]
        tidsserie_rader = dep[dep["Fagdepartement_id"] == dep_id].sort_values(aar_kol)
        tidsserie = [
            {
                "ar": int(r[aar_kol]),
                "nominell": float(r["nominell"]),
                "reell": float(r["reell"]),
            }
            for _, r in tidsserie_rader.iterrows()
        ]
        # Brudd-info hentes fra én tilfeldig rad - flagget er likt for hele
        # departementet
        brudd_rad = dep[dep["Fagdepartement_id"] == dep_id].iloc[0]
        har_brudd = bool(brudd_rad["har_strukturelt_brudd"])
        brudd_beskrivelse = (
            brudd_rad["brudd_beskrivelse"]
            if har_brudd and pd.notna(brudd_rad["brudd_beskrivelse"])
            else None
        )

        departementer.append(
            {
                "id": dep_id,
                "navn": navn,
                "nominell_start": _til_jsonfloat(rad.get("nominell_start")),
                "nominell_slutt": _til_jsonfloat(rad.get("nominell_slutt")),
                "reell_start": _til_jsonfloat(rad.get("reell_start")),
                "reell_slutt": _til_jsonfloat(rad.get("reell_slutt")),
                "realvekst_pst": _til_jsonfloat(rad.get("realvekst_pst")),
                "har_strukturelt_brudd": har_brudd,
                "brudd_beskrivelse": brudd_beskrivelse,
                "tidsserie": tidsserie,
            }
        )

    # Sorter synkende på realvekst, men plasser brudd nederst
    departementer.sort(
        key=lambda d: (
            d["har_strukturelt_brudd"],
            -(d["realvekst_pst"] if d["realvekst_pst"] is not None else -1e9),
        )
    )

    return {
        "metadata": {
            "basisaar": basisaar,
            "start": start,
            "slutt": slutt,
            "generert": datetime.now(UTC).isoformat(timespec="seconds"),
            "kilde": "Statsregnskapet 2014-2026 og Finansdepartementets deflatorer",
        },
        "departementer": departementer,
    }


def _til_jsonfloat(verdi) -> float | None:
    """Konverter NaN/None til JSON-vennlig None, ellers float."""
    if verdi is None or (isinstance(verdi, float) and verdi != verdi):
        return None
    return float(verdi)


def skriv_alle(utfolder: Path = DASHBOARD_DATA) -> list[Path]:
    """Generér og skriv alle JSON-filer for frontend.

    Returnerer listen over skrevne filer. Bruker pretty-print for
    leselighet i git-diff; filene er små nok at det ikke koster noe.
    """
    utfolder.mkdir(parents=True, exist_ok=True)
    skrevne = []

    oversikt = bygg_oversikt()
    sti = utfolder / "oversikt.json"
    sti.write_text(
        json.dumps(oversikt, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    skrevne.append(sti)
    return skrevne


if __name__ == "__main__":
    filer = skriv_alle()
    for f in filer:
        print(f"Skrev {f.relative_to(PROSJEKT_ROT)} ({f.stat().st_size:,} bytes)")
