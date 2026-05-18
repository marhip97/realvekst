"""Bygg JSON-datasett for frontend.

Denne modulen er broen mellom analyselaget (pandas) og frontend (statisk
JavaScript). Den genererer JSON-filer som dashbordet i src/dashboard/
laster via fetch og rendrer med Plotly.js.

Filstruktur som genereres:

- `data/oversikt.json` — alle 16 departementer med nøkkeltall (nivå 0)
- `data/departementer/{id}.json` — én fil per departement med fullt
  hierarki (programområder med tidsserie og poster med tidsserie).
  Inneholder alt frontend trenger for å vise nivå 1, 2 og 3 under
  det departementet uten å laste flere filer.

Designvalg:
- Vi genererer én fil per departement, ikke per post. Det holder antall
  filer håndterbart (16) samtidig som hver enkelt fil er rask å laste
  (50–300 KB).
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
    aggreger_per_programkategori,
    realvekst_for_periode,
)
from src.analyse.brudd import marker_brudd_departement
from src.analyse.realvekst import beregn_reell_bevilgning, realvekst_prosent
from src.data.bevilgning import last_bevilgning

# Frontend leser fra src/dashboard/data/. Skrivebanen er relativ til
# prosjektroten (to nivåer opp fra denne filen).
PROSJEKT_ROT = Path(__file__).resolve().parents[2]
DASHBOARD_DATA = PROSJEKT_ROT / "src" / "dashboard" / "data"

DEFAULT_BASISAAR = 2026
DEFAULT_START = 2022
DEFAULT_SLUTT = 2026

# Laane- og petroleumstransaksjoner som ekskluderes fra realvekst-
# aggregat naar brukeren har 90-post-filteret av (default). Disse er
# enten finansielle overforinger til/fra Statens pensjonsfond utland,
# petroleumsrelaterte inntekter/utgifter, eller laanetransaksjoner —
# alle av typer som forvrenger realvekst-tall hvis de inkluderes.
# Postene beholdes i datasettet og kan inkluderes via toggle.
LPT_POST_IDS = {
    # Utgift
    244030,  # SDOE - investeringer
    280050,  # Overforing til Statens pensjonsfond utland
    280096,  # Finansposter overfort til fondet
    # Inntekt
    544024,  # SDOE - driftsresultat
    544030,  # SDOE - avskrivninger
    544080,  # SDOE - renter av statens kapital
    550771,  # Petroleumsskatt - ordinaer
    550772,  # Petroleumsskatt - saerskatt paa oljeinntekter
    550774,  # Petroleumsskatt - arealavgift mv.
    550870,  # CO2-avgift petroleum
    550970,  # NOx-avgift petroleum
    568585,  # Utbytte Equinor ASA
    580050,  # Overforing fra Statens pensjonsfond utland
    599990,  # Statslaanemidler
}


def _aarskolonne(df: pd.DataFrame) -> str:
    return "Ar" if "Ar" in df.columns else "År"


def _til_jsonfloat(verdi) -> float | None:
    """Konverter NaN/None til JSON-vennlig None, ellers float."""
    if verdi is None or (isinstance(verdi, float) and verdi != verdi):
        return None
    return float(verdi)


def _tidsserie_fra_aggregert(
    aggregert: pd.DataFrame, aar_kol: str = "Ar"
) -> list[dict[str, Any]]:
    """Konverter aggregert tabell til en liste tidsseriepunkter."""
    return [
        {
            "ar": int(r[aar_kol]),
            "nominell": _til_jsonfloat(r["nominell"]),
            "reell": _til_jsonfloat(r["reell"]),
        }
        for _, r in aggregert.sort_values(aar_kol).iterrows()
    ]


def _realvekst_fra_tidsserie(
    tidsserie: list[dict[str, Any]], start: int, slutt: int
) -> float | None:
    """Beregn realvekst-prosent fra en tidsserie hvis begge endepunkt finnes."""
    start_p = next((p for p in tidsserie if p["ar"] == start), None)
    slutt_p = next((p for p in tidsserie if p["ar"] == slutt), None)
    if not start_p or not slutt_p:
        return None
    if start_p["reell"] is None or slutt_p["reell"] is None:
        return None
    return _til_jsonfloat(realvekst_prosent(start_p["reell"], slutt_p["reell"]))


def bygg_oversikt(
    basisaar: int = DEFAULT_BASISAAR,
    start: int = DEFAULT_START,
    slutt: int = DEFAULT_SLUTT,
) -> dict[str, Any]:
    """Produser oversikten over alle departementer.

    Returnerer en dict klar for json.dump:
    - metadata: basisår, periode, generert-tidsstempel, kilde
    - departementer: liste med navn, nøkkeltall og full tidsserie per
      departement, sortert synkende på realvekst (brudd nederst)
    """
    bev = last_bevilgning()
    bev_reell = beregn_reell_bevilgning(bev, basisaar=basisaar)
    post_typer = _distinkte_post_typer(bev_reell)
    # 'dep' = aggregat med alle poster. Sammen med 'dep_uten_lpt'
    # eksponeres begge variantene slik at frontend kan toggle.
    er_90 = bev_reell["post_nr"].between(90, 99)
    er_lpt = bev_reell["Post_id"].isin(LPT_POST_IDS)
    bev_uten_lpt = bev_reell[~(er_90 | er_lpt)]
    dep = aggreger_per_departement(bev_reell)
    dep = marker_brudd_departement(dep)
    dep_uten_lpt = aggreger_per_departement(bev_uten_lpt)

    # Realvekst paa nivaa 0-topplista beregnes fra dep_uten_lpt slik at
    # topp 10-rangering ikke domineres av LPT-svingninger.
    realvekst = realvekst_for_periode(
        dep_uten_lpt,
        id_kolonner=["Fagdepartement_id", "Fagdepartement"],
        start=start,
        slutt=slutt,
    )
    # Brudd-info skal være på samme indekserings-grunnlag som realvekst.
    dep_uten_lpt = marker_brudd_departement(dep_uten_lpt)

    aar_kol = "Ar"
    departementer = []
    for _, rad in realvekst.iterrows():
        dep_id = int(rad["Fagdepartement_id"])
        navn = rad["Fagdepartement"]
        # tidsserie = alle poster (matcher sum av programkategorier).
        # tidsserie_uten_lpt = uten 90-poster og LPT (default visning).
        tidsserie_rader = dep[dep["Fagdepartement_id"] == dep_id].sort_values(aar_kol)
        tidsserie = _tidsserie_fra_aggregert(tidsserie_rader, aar_kol)
        tidsserie_uten_lpt_rader = dep_uten_lpt[
            dep_uten_lpt["Fagdepartement_id"] == dep_id
        ].sort_values(aar_kol)
        tidsserie_uten_lpt = _tidsserie_fra_aggregert(
            tidsserie_uten_lpt_rader, aar_kol
        )

        brudd_rad = dep_uten_lpt[dep_uten_lpt["Fagdepartement_id"] == dep_id].iloc[0]
        har_brudd = bool(brudd_rad["har_strukturelt_brudd"])
        brudd_beskrivelse = (
            brudd_rad["brudd_beskrivelse"]
            if har_brudd and pd.notna(brudd_rad["brudd_beskrivelse"])
            else None
        )

        post_typer_for_dep = _distinkte_post_typer(
            bev_reell[bev_reell["Fagdepartement_id"] == dep_id]
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
                "tidsserie_uten_lpt": tidsserie_uten_lpt,
                "post_typer": post_typer_for_dep,
            }
        )

    departementer.sort(
        key=lambda d: (
            d["har_strukturelt_brudd"],
            -(d["realvekst_pst"] if d["realvekst_pst"] is not None else -1e9),
        )
    )

    # Samlet tidsserie for hele statsbudsjettet, splittet på fire
    # kombinasjoner av type (utgift/inntekt) og 90-poster (av/på).
    # Brukes på nivå 0 i frontend for å vise samlet realvekst.
    # Kapittel 0001-2999 = utgift, 3000-5999 = inntekt; post 90-99 er
    # utlån/kapitaltilskudd som default ekskluderes.
    # 'uten90'-variantene ekskluderer 90-postene OG alle LPT-postene
    # (låne- og petroleumstransaksjoner). 'med90'-variantene inkluderer
    # alt slik at brukeren kan toggle.
    er_90 = bev_reell["post_nr"].between(90, 99)
    er_lpt = bev_reell["Post_id"].isin(LPT_POST_IDS)
    samlet = {}
    for type_navn, kap_filter in [
        ("utgift", bev_reell["kapittel_nr"] < 3000),
        ("inntekt", bev_reell["kapittel_nr"] >= 3000),
    ]:
        for p90_navn, ekskluderings_filter in [
            ("uten90", ~(er_90 | er_lpt)),
            ("med90", pd.Series(True, index=bev_reell.index)),
        ]:
            del_df = bev_reell[kap_filter & ekskluderings_filter]
            agg = (
                del_df.groupby(aar_kol, as_index=False)
                .agg(nominell=("Bevilgning_beløp", "sum"), reell=("Bevilgning_reell", "sum"))
                .rename(columns={aar_kol: "Ar"})
                .sort_values("Ar")
            )
            samlet[f"{type_navn}_{p90_navn}"] = _tidsserie_fra_aggregert(agg)

    meta = _metadata(basisaar, start, slutt, post_typer=post_typer)
    meta["samlet"] = samlet
    meta["lpt_post_ids"] = sorted(LPT_POST_IDS)
    return {
        "metadata": meta,
        "departementer": departementer,
    }


def _metadata(
    basisaar: int,
    start: int,
    slutt: int,
    post_typer: list[str] | None = None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {
        "basisaar": basisaar,
        "start": start,
        "slutt": slutt,
        "generert": datetime.now(UTC).isoformat(timespec="seconds"),
        "kilde": "Statsregnskapet 2014-2026 og Finansdepartementets deflatorer",
    }
    if post_typer is not None:
        meta["post_typer"] = post_typer

    # Prisindeksene eksporteres slik at frontend (priskalkulatoren) kan
    # konvertere belop mellom aarstall uten aa lese rade-CSV.
    from src.data.deflator import bygg_prisindeks

    indeks = bygg_prisindeks(basisaar=basisaar)
    meta["prisindeks"] = {
        "basisaar": basisaar,
        "aar": [int(a) for a in indeks["Ar"]],
        "statlig": [float(v) for v in indeks["indeks_statlig"]],
        "kommunal": [float(v) for v in indeks["indeks_kommunal"]],
    }
    return meta


def _distinkte_post_typer(bev: pd.DataFrame) -> list[str]:
    """Hent sortert liste over distinkte Post_type-verdier (uten NaN/tom)."""
    if "Post_type" not in bev.columns:
        return []
    verdier = bev["Post_type"].dropna().astype(str).str.strip()
    return sorted(v for v in verdier.unique() if v)


def bygg_departement(
    bev_reell: pd.DataFrame,
    dep_id: int,
    basisaar: int = DEFAULT_BASISAAR,
    start: int = DEFAULT_START,
    slutt: int = DEFAULT_SLUTT,
) -> dict[str, Any]:
    """Produser en komplett hierarkifil for ett departement.

    Strukturen inkluderer departementets tidsserie, alle programområder
    under departementet (med egen tidsserie) og alle poster under hvert
    programområde (med tidsserie og deflator-info). Frontend laster denne
    filen én gang og navigerer mellom nivå 1, 2 og 3 lokalt.
    """
    aar_kol = _aarskolonne(bev_reell)
    dep_data = bev_reell[bev_reell["Fagdepartement_id"] == dep_id]
    if dep_data.empty:
        raise ValueError(f"Ingen rader for departement-id {dep_id}")

    dep_navn = dep_data["Fagdepartement"].iloc[0]

    # To varianter: tidsserie inkluderer alle poster (sum av program-
    # kategori-tidsseriene), tidsserie_uten_lpt ekskluderer 90-poster
    # og LPT-poster (default visning).
    er_90_dep = dep_data["post_nr"].between(90, 99)
    er_lpt_dep = dep_data["Post_id"].isin(LPT_POST_IDS)
    dep_uten_lpt_data = dep_data[~(er_90_dep | er_lpt_dep)]

    dep_serie = (
        dep_data.groupby(aar_kol, as_index=False)
        .agg(nominell=("Bevilgning_beløp", "sum"), reell=("Bevilgning_reell", "sum"))
        .rename(columns={aar_kol: "Ar"})
    )
    dep_tidsserie = _tidsserie_fra_aggregert(dep_serie)
    dep_serie_uten_lpt = (
        dep_uten_lpt_data.groupby(aar_kol, as_index=False)
        .agg(nominell=("Bevilgning_beløp", "sum"), reell=("Bevilgning_reell", "sum"))
        .rename(columns={aar_kol: "Ar"})
    )
    dep_tidsserie_uten_lpt = _tidsserie_fra_aggregert(dep_serie_uten_lpt)

    # Brudd-info
    dep_med_brudd = marker_brudd_departement(
        pd.DataFrame({"Fagdepartement": [dep_navn]})
    )
    har_brudd = bool(dep_med_brudd["har_strukturelt_brudd"].iloc[0])
    brudd_beskrivelse = dep_med_brudd["brudd_beskrivelse"].iloc[0] if har_brudd else None

    # Programkategorier under departementet. JSON-feltet heter
    # 'programomraader' av historiske grunner, men innholdet er
    # programkategorier; frontend viser 'Programkategori'.
    # Inkluderer alle poster slik at sum av programkategorier =
    # dep.tidsserie og post-sum = programkategori.tidsserie.
    po_agg = aggreger_per_programkategori(dep_data)
    # Grupper kun på id; tekstvariasjoner ('m.v.' vs 'mv.') finnes i
    # rådata og gir dupliserte rader hvis vi grupperer på id+navn.
    programomraader = []
    for po_nr, gr in po_agg.groupby("Programkategori_id", sort=False):
        po_navn = gr["Programkategori"].iloc[0]
        gr = gr.groupby("Ar", as_index=False).agg(
            nominell=("nominell", "sum"), reell=("reell", "sum")
        )
        po_tidsserie = _tidsserie_fra_aggregert(gr.sort_values("Ar"))
        po_realvekst = _realvekst_fra_tidsserie(po_tidsserie, start, slutt)

        # Poster under denne programkategorien
        po_rader = dep_data[dep_data["Programkategori_id"] == po_nr]
        poster = []
        post_grupper = po_rader.groupby(
            [
                "Post_id",
                "Post",
                "kapittel_nr",
                "Kapittel",
                "post_nr",
                "Post_type",
                "deflator_type",
            ],
            sort=False,
        )
        for nokler, post_rader in post_grupper:
            (
                post_id,
                post_navn,
                kap_nr,
                kap_navn,
                post_nr,
                post_type,
                defl_type,
            ) = nokler
            post_serie_rader = post_rader.sort_values(aar_kol)
            post_tidsserie = [
                {
                    "ar": int(r[aar_kol]),
                    "nominell": _til_jsonfloat(r["Bevilgning_beløp"]),
                    "reell": _til_jsonfloat(r["Bevilgning_reell"]),
                }
                for _, r in post_serie_rader.iterrows()
            ]
            post_realvekst = _realvekst_fra_tidsserie(post_tidsserie, start, slutt)

            poster.append(
                {
                    "post_id": int(post_id),
                    "post_navn": post_navn,
                    "post_nr": int(post_nr),
                    "kapittel_nr": int(kap_nr),
                    "kapittel": kap_navn,
                    "post_type": post_type,
                    "deflator_type": defl_type,
                    "realvekst_pst": post_realvekst,
                    "tidsserie": post_tidsserie,
                }
            )

        # Sorter poster synkende på reell i sluttåret
        poster.sort(
            key=lambda p: next(
                (
                    t["reell"]
                    for t in p["tidsserie"]
                    if t["ar"] == slutt and t["reell"] is not None
                ),
                0.0,
            ),
            reverse=True,
        )

        programomraader.append(
            {
                "nr": po_nr,
                "navn": po_navn,
                "realvekst_pst": po_realvekst,
                "tidsserie": po_tidsserie,
                "poster": poster,
            }
        )

    # Sorter programområder etter nummer for stabilitet
    programomraader.sort(key=lambda p: p["nr"])

    dep_realvekst = _realvekst_fra_tidsserie(dep_tidsserie, start, slutt)
    post_typer = _distinkte_post_typer(bev_reell)

    return {
        "metadata": _metadata(basisaar, start, slutt, post_typer=post_typer),
        "departement": {
            "id": dep_id,
            "navn": dep_navn,
            "realvekst_pst": dep_realvekst,
            "har_strukturelt_brudd": har_brudd,
            "brudd_beskrivelse": brudd_beskrivelse,
            "tidsserie": dep_tidsserie,
            "tidsserie_uten_lpt": dep_tidsserie_uten_lpt,
        },
        "programomraader": programomraader,
    }


def skriv_alle(
    utfolder: Path = DASHBOARD_DATA,
    basisaar: int = DEFAULT_BASISAAR,
    start: int = DEFAULT_START,
    slutt: int = DEFAULT_SLUTT,
) -> list[Path]:
    """Generér og skriv alle JSON-filer for frontend.

    Skriver oversikt.json + én fil per departement i departementer/.
    Returnerer listen over skrevne filer.

    Basisår, start og slutt sendes eksplisitt til både
    `beregn_reell_bevilgning`, `bygg_oversikt` og `bygg_departement` slik at
    reell-kolonnen og metadata alltid refererer til samme basisår.
    """
    utfolder.mkdir(parents=True, exist_ok=True)
    (utfolder / "departementer").mkdir(exist_ok=True)
    skrevne = []

    # Forbered én gang og gjenbruk
    bev_reell = beregn_reell_bevilgning(last_bevilgning(), basisaar=basisaar)

    # Oversikt
    oversikt = bygg_oversikt(basisaar=basisaar, start=start, slutt=slutt)
    sti = utfolder / "oversikt.json"
    sti.write_text(
        json.dumps(oversikt, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    skrevne.append(sti)

    # Per-departement-filer. Kompakt JSON (uten innrykk) fordi filene er
    # store og diffs blir uleselige uansett — fokus er rask nedlasting.
    dep_ider = sorted(bev_reell["Fagdepartement_id"].unique())
    for dep_id in dep_ider:
        data = bygg_departement(
            bev_reell,
            dep_id=int(dep_id),
            basisaar=basisaar,
            start=start,
            slutt=slutt,
        )
        sti = utfolder / "departementer" / f"{int(dep_id)}.json"
        sti.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        skrevne.append(sti)

    return skrevne


if __name__ == "__main__":
    filer = skriv_alle()
    total = sum(f.stat().st_size for f in filer)
    for f in filer:
        print(f"Skrev {f.relative_to(PROSJEKT_ROT)} ({f.stat().st_size:,} bytes)")
    print(f"Totalt: {total:,} bytes i {len(filer)} filer")
