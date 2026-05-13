"""Last og rens bevilgningsdata fra statsregnskapet.

Denne modulen håndterer rådata fra statsregnskapet (Excel-filer) og produserer
et rent pandas-datasett klart for analyse. To filer slås sammen:
- bevilgning_2014_2019.xlsx
- bevilgning_2020_2026.xlsx

Begge har identisk kolonnestruktur. Modulen utfører tre operasjoner:

1. **Innlasting** av begge filer med Excel-leser
2. **Datavasking**: konvertering av norske desimaltall (komma) til float,
   splitting av Post_id i kapittel og post (to separate konsepter i
   statsbudsjettet)
3. **Aggregering**: rådata er transaksjoner (saldert + RNB + tilleggsbevilgninger).
   For å få stående bevilgning per post per år summeres alle transaksjoner.

Faglig forutsetning: Post_id er sammensatt av kapittelnummer og postnummer.
For eksempel 74001 betyr kapittel 740, post 01. Splittingen er nødvendig
fordi kapittel og post er to ulike konsepter i statsbudsjettets terminologi:
- Kapittel: en større budsjettsamling (f.eks. 740 "Helsedirektoratet")
- Post: spesifikk utgiftspost innen kapittelet (f.eks. 01 "Driftsutgifter")

Søk i dashbordet skal støtte begge nivåene separat.
"""

from pathlib import Path

import pandas as pd

# Stier til rådatafiler. Forventer at de ligger i data/raw/ relativt til prosjektroten.
DATA_RAW = Path(__file__).resolve().parents[2] / "data" / "raw"
FIL_2014_2019 = DATA_RAW / "bevilgning_2014_2019.xlsx"
FIL_2020_2026 = DATA_RAW / "bevilgning_2020_2026.xlsx"


def _parse_belop(verdi) -> float:
    """Konverter bevilgningsbeløp til float.

    Excel-filene har noen rader der beløpet er en tekststreng med komma som
    desimaltegn (norsk konvensjon). Disse må konverteres til float for å kunne
    summeres. Tomme verdier returneres som 0.0.
    """
    if isinstance(verdi, (int, float)):
        return float(verdi)
    if isinstance(verdi, str):
        renset = verdi.replace(",", ".").replace(" ", "")
        if not renset:
            return 0.0
        return float(renset)
    return 0.0


def les_raadata() -> pd.DataFrame:
    """Les begge Excel-filer og slå dem sammen til ett datasett.

    Returnerer rådata med én rad per transaksjon. Tallformat normalisert.
    Returnerer DataFrame med kolonnene:
    - Ar (År)
    - Programområde_nr, Programområde
    - Programkategori_id, Programkategori
    - Fagdepartement_id, Fagdepartement
    - Kapittel_id, Kapittel
    - Post_id, Post, Post_type
    - Bevilgning_beløp (float)
    """
    if not FIL_2014_2019.exists():
        raise FileNotFoundError(f"Mangler datafil: {FIL_2014_2019}")
    if not FIL_2020_2026.exists():
        raise FileNotFoundError(f"Mangler datafil: {FIL_2020_2026}")

    df_eldre = pd.read_excel(FIL_2014_2019)
    df_nyere = pd.read_excel(FIL_2020_2026)

    # Konsistenssjekk: kolonnestruktur må være identisk på tvers av filer
    if list(df_eldre.columns) != list(df_nyere.columns):
        raise ValueError(
            "Filene har ulik kolonnestruktur. "
            f"2014-2019: {list(df_eldre.columns)}, "
            f"2020-2026: {list(df_nyere.columns)}"
        )

    df = pd.concat([df_eldre, df_nyere], ignore_index=True)
    df["Bevilgning_beløp"] = df["Bevilgning_beløp"].apply(_parse_belop)
    return df


def split_kapittel_og_post(df: pd.DataFrame) -> pd.DataFrame:
    """Splitt Post_id i kapittel_nr og post_nr.

    Post_id er på formen XXXNN der XXX er kapittelnummeret og NN er postnummeret.
    For eksempel: 74001 betyr kapittel 740, post 01.

    Legger til to nye kolonner:
    - kapittel_nr (int): kapittelnummer, skal matche Kapittel_id
    - post_nr (int): postnummeret innen kapittelet (1-99)

    Brukes til:
    - Velge riktig deflator (postnummer 60-69 = kommunal, ellers statlig)
    - Søk i dashbordet (kapittelnummer og postnummer er to ulike søkenivåer)
    """
    df = df.copy()
    post_id_str = df["Post_id"].astype(str)
    df["kapittel_nr"] = post_id_str.str[:-2].astype(int)
    df["post_nr"] = post_id_str.str[-2:].astype(int)
    return df


def aggreger_til_aarsbevilgning(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregér transaksjoner til stående årsbevilgning per post.

    Rådata har én rad per bevilgningstransaksjon (saldert budsjett, RNB,
    tilleggsbevilgninger osv.). For analyseformål trenger vi stående
    bevilgning per post per år — det vil si summen av alle transaksjoner.

    Eksempel: en post med tre rader (saldert + RNB + tilleggsbevilgning) gir
    én rad i aggregert form, med summen som totalbevilgning.

    Bevarer all hierarkiinformasjon (departement, programområde, kapittel, post).
    """
    grupperingsfelt = [
        "Ar" if "Ar" in df.columns else "År",
        "Fagdepartement_id", "Fagdepartement",
        "Programområde_nr", "Programområde",
        "Programkategori_id", "Programkategori",
        "Kapittel_id", "Kapittel",
        "Post_id", "Post",
        "kapittel_nr", "post_nr",
        "Post_type",
    ]
    # Sjekk at alle felter finnes (vi har kanskje ikke splittet ennå)
    eksisterende_felt = [f for f in grupperingsfelt if f in df.columns]
    return df.groupby(eksisterende_felt, as_index=False)["Bevilgning_beløp"].sum()


def last_bevilgning() -> pd.DataFrame:
    """Hovedfunksjon: last, rens, splitt, og aggregér bevilgningsdata.

    Returnerer DataFrame klar for analyse, med én rad per (post × år).
    """
    df = les_raadata()
    df = split_kapittel_og_post(df)
    df = aggreger_til_aarsbevilgning(df)
    return df


if __name__ == "__main__":
    # Sanity check ved direkte kjøring
    df = last_bevilgning()
    aar_kolonne = "Ar" if "Ar" in df.columns else "År"
    print(f"Lastet {len(df):,} rader (post × år)")
    print(f"Periode: {df[aar_kolonne].min()}-{df[aar_kolonne].max()}")
    print(f"Departementer: {df['Fagdepartement'].nunique()}")
    print(f"Unike kapitler: {df['Kapittel_id'].nunique()}")
    print(f"Unike postnumre: {df['post_nr'].nunique()}")
