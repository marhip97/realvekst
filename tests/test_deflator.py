"""Tester for src.data.deflator.

Forankrer kumulativ prisindeks mot referansetall fra prototypen.
Den sentrale forankringen er at innbyggertilskuddet i 2014-priser og
2026-priser, omregnet til 2024-kroner, matcher verdiene i STATUS.md.
"""

import pytest

from src.data.deflator import (
    DEFAULT_BASISAAR,
    _parse_prosent,
    bygg_prisindeks,
    les_deflatorer,
)


class TestParseProsent:
    """Konvertering fra '4,0 %' til 0.04."""

    def test_norsk_prosentnotasjon(self):
        assert _parse_prosent("4,0 %") == pytest.approx(0.04)

    def test_uten_prosenttegn(self):
        assert _parse_prosent("3,1") == pytest.approx(0.031)

    def test_engelsk_desimaltegn(self):
        assert _parse_prosent("2.5 %") == pytest.approx(0.025)

    def test_tall_returneres_som_desimal(self):
        assert _parse_prosent(0.04) == pytest.approx(0.04)

    def test_tom_streng_blir_null(self):
        assert _parse_prosent("") == 0.0


class TestLesDeflatorer:
    """Innlasting og normalisering av rå CSV."""

    @pytest.fixture(scope="class")
    def defl(self):
        return les_deflatorer()

    def test_kolonner_er_normalisert(self, defl):
        assert set(defl.columns) == {"Ar", "statlig", "kommunal"}

    def test_periode_2014_til_2026(self, defl):
        assert defl["Ar"].min() == 2014
        assert defl["Ar"].max() == 2026

    def test_alle_aar_dekket(self, defl):
        assert len(defl) == 13

    def test_rader_sortert_stigende(self, defl):
        assert defl["Ar"].is_monotonic_increasing

    def test_2024_kommunal_er_5_prosent(self, defl):
        rad = defl[defl["Ar"] == 2024].iloc[0]
        assert rad["kommunal"] == pytest.approx(0.050)

    def test_2024_statlig_er_4_4_prosent(self, defl):
        rad = defl[defl["Ar"] == 2024].iloc[0]
        assert rad["statlig"] == pytest.approx(0.044)


class TestByggPrisindeks:
    """Den kumulative indeksen — forankret mot prototype-referanse."""

    @pytest.fixture(scope="class")
    def indeks(self):
        return bygg_prisindeks(basisaar=2024)

    def test_basisaar_er_100(self, indeks):
        rad = indeks[indeks["Ar"] == 2024].iloc[0]
        assert rad["indeks_statlig"] == pytest.approx(100.0)
        assert rad["indeks_kommunal"] == pytest.approx(100.0)

    def test_indeks_stiger_over_tid(self, indeks):
        """Begge deflatorer er positive i hele perioden,
        så indeksen må være strengt voksende."""
        assert indeks["indeks_statlig"].is_monotonic_increasing
        assert indeks["indeks_kommunal"].is_monotonic_increasing

    def test_kommunal_2014_gir_innbyggertilskudd_referanse(self, indeks):
        """Forankring mot STATUS.md: 115,8 mrd i 2014 = 163,3 mrd i 2024-priser
        (innbyggertilskuddet, kommunal deflator)."""
        i_2014 = indeks[indeks["Ar"] == 2014].iloc[0]["indeks_kommunal"]
        reell_2014 = 115.8 * 100 / i_2014
        assert 163.0 < reell_2014 < 163.6

    def test_kommunal_2026_gir_innbyggertilskudd_referanse(self, indeks):
        """Forankring mot STATUS.md: 202,1 mrd i 2026 = 185,4 mrd i 2024-priser."""
        i_2026 = indeks[indeks["Ar"] == 2026].iloc[0]["indeks_kommunal"]
        reell_2026 = 202.1 * 100 / i_2026
        assert 185.0 < reell_2026 < 185.8

    def test_basisaar_kan_endres(self):
        """Brukeren skal kunne velge et annet basisår."""
        indeks_2020 = bygg_prisindeks(basisaar=2020)
        rad = indeks_2020[indeks_2020["Ar"] == 2020].iloc[0]
        assert rad["indeks_statlig"] == pytest.approx(100.0)
        assert rad["indeks_kommunal"] == pytest.approx(100.0)

    def test_ugyldig_basisaar_gir_feil(self):
        """Et basisår utenfor data-perioden må feile tydelig."""
        with pytest.raises(ValueError, match="Basisår 2010"):
            bygg_prisindeks(basisaar=2010)

    def test_default_basisaar_er_2024(self):
        """Default basisår er det forrige avsluttede budsjettåret."""
        assert DEFAULT_BASISAAR == 2024

    def test_statlig_og_kommunal_er_ulike(self, indeks):
        """De to deflatorer skal gi ulike indeks-verdier
        (ratene er forskjellige per år)."""
        forskjeller = (indeks["indeks_statlig"] - indeks["indeks_kommunal"]).abs()
        # Alle år utenfor basis bør ha en målbar forskjell
        ikke_basis = indeks[indeks["Ar"] != 2024]
        assert (forskjeller.loc[ikke_basis.index] > 0).all()
