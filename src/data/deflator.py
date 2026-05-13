"""Bygg kumulativ prisindeks fra årlige deflatorer.

To deflatorer brukes i Finansdepartementet, og hvilken som gjelder bestemmes
av postnummeret (se src/analyse/realvekst.py):

- **Statsbudsjettets utgiftsdeflator**: brukes for de fleste poster
- **Kommunal deflator**: brukes for poster 60-69 (overføringer til kommuner
  og fylkeskommuner)

Råfilen i data/raw/deflatorer.csv har én rad per år, med vekstratene angitt
som prosent (norsk konvensjon med komma og %-tegn). En vekstrate for år Y
representerer prisstigningen fra år Y-1 til år Y.

For å beregne realvekst over flere år bygges en kumulativ prisindeks med
valgt basisår = 100. Denne modulen produserer indeksen.

Eksempel: med basisår 2024 vil indeks_kommunal være rundt 70,9 i 2014 og
rundt 109,0 i 2026. Et nominelt beløp i 2014 omregnes til 2024-priser ved
å multiplisere med (100 / indeks_2014).
"""

from pathlib import Path

import pandas as pd

DATA_RAW = Path(__file__).resolve().parents[2] / "data" / "raw"
DEFLATOR_FIL = DATA_RAW / "deflatorer.csv"

# Default basisår: forrige avsluttede budsjettår per inneværende kontekst.
# Brukeren kan overstyre dette via parametre i bygg_prisindeks.
DEFAULT_BASISAAR = 2024


def _parse_prosent(verdi) -> float:
    """Konverter '4,0 %' til 0.04 (vekstfaktor som desimal).

    Kildefilen oppgir vekstrater på norsk format ('4,0 %'). For matematikken
    trenger vi rate som desimal (0.04). Aksepterer også rene tall — da
    antas det at verdien allerede er på desimalform.
    """
    if isinstance(verdi, (int, float)):
        return float(verdi)
    s = str(verdi).strip().replace("%", "").replace(",", ".").strip()
    if not s:
        return 0.0
    return float(s) / 100.0


def les_deflatorer() -> pd.DataFrame:
    """Les rå deflator-CSV og normaliser format.

    Returnerer DataFrame med kolonner:
    - Ar (int): året
    - statlig (float): statsbudsjettets utgiftsdeflator som desimal (0.04 = 4 %)
    - kommunal (float): kommunal deflator som desimal

    Rader sorteres stigende på år.
    """
    if not DEFLATOR_FIL.exists():
        raise FileNotFoundError(f"Mangler deflator-fil: {DEFLATOR_FIL}")

    df = pd.read_csv(DEFLATOR_FIL, sep="\t", encoding="utf-8")
    df = df.rename(
        columns={
            "År": "Ar",
            "Statsbudsjettets utgiftsdeflator": "statlig",
            "Kommunal deflator": "kommunal",
        }
    )
    df["statlig"] = df["statlig"].apply(_parse_prosent)
    df["kommunal"] = df["kommunal"].apply(_parse_prosent)
    df["Ar"] = df["Ar"].astype(int)
    return df.sort_values("Ar").reset_index(drop=True)


def bygg_prisindeks(basisaar: int = DEFAULT_BASISAAR) -> pd.DataFrame:
    """Bygg kumulativ prisindeks med basisår = 100.

    For hvert år Y og hver av de to deflatorene:
    - Hvis Y = basisår: indeks_Y = 100
    - Hvis Y > basisår: indeks_Y = indeks_(Y-1) * (1 + rate_Y)
    - Hvis Y < basisår: indeks_Y = indeks_(Y+1) / (1 + rate_(Y+1))

    Begrunnelse for retningen: en rate angitt for år Y er prisstigningen
    fra Y-1 til Y. For å gå fra basisår nedover til Y deler vi gjennom
    rate-ene for hvert mellomliggende år.

    Returnerer DataFrame med kolonner:
    - Ar
    - indeks_statlig (basisår = 100)
    - indeks_kommunal (basisår = 100)
    """
    df = les_deflatorer()
    if basisaar not in df["Ar"].values:
        raise ValueError(
            f"Basisår {basisaar} finnes ikke i deflator-dataene "
            f"(periode {df['Ar'].min()}-{df['Ar'].max()})"
        )

    basisidx = int(df.index[df["Ar"] == basisaar][0])

    for rate_kol, indeks_kol in [
        ("statlig", "indeks_statlig"),
        ("kommunal", "indeks_kommunal"),
    ]:
        indeks = [0.0] * len(df)
        indeks[basisidx] = 100.0
        # Framover fra basisår: multipliser med (1 + rate)
        for i in range(basisidx + 1, len(df)):
            indeks[i] = indeks[i - 1] * (1 + df.at[i, rate_kol])
        # Bakover fra basisår: del med (1 + rate) for året over
        for i in range(basisidx - 1, -1, -1):
            indeks[i] = indeks[i + 1] / (1 + df.at[i + 1, rate_kol])
        df[indeks_kol] = indeks

    return df[["Ar", "indeks_statlig", "indeks_kommunal"]].copy()


if __name__ == "__main__":
    indeks = bygg_prisindeks()
    print(f"Kumulativ prisindeks med basisår {DEFAULT_BASISAAR} = 100")
    print(indeks.to_string(index=False))
