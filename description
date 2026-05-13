"""Tester for src.data.bevilgning.

Disse testene forankrer den faglige logikken i konkrete referansetall fra
prototypen. Hvis modulen endres, må disse fortsatt passere.
"""

import pandas as pd
import pytest

from src.data.bevilgning import (
    _parse_belop,
    aggreger_til_aarsbevilgning,
    last_bevilgning,
    split_kapittel_og_post,
)


class TestParseBelop:
    """Test at norske desimaltall parses korrekt."""

    def test_heltall_returneres_uendret(self):
        assert _parse_belop(1000) == 1000.0

    def test_float_returneres_uendret(self):
        assert _parse_belop(1234.56) == 1234.56

    def test_tekststreng_med_komma_konverteres(self):
        assert _parse_belop("1234,56") == 1234.56

    def test_tekststreng_med_mellomrom_renses(self):
        assert _parse_belop("1 234,56") == 1234.56

    def test_tom_streng_blir_null(self):
        assert _parse_belop("") == 0.0


class TestSplitKapittelOgPost:
    """Test at Post_id splittes riktig i kapittel og postnummer."""

    def test_standard_post_id(self):
        df = pd.DataFrame({
            "Post_id": [74001, 53345, 57160],
            "Kapittel_id": [740, 533, 571],
        })
        resultat = split_kapittel_og_post(df)
        assert resultat["kapittel_nr"].tolist() == [740, 533, 571]
        assert resultat["post_nr"].tolist() == [1, 45, 60]

    def test_kapittel_nr_matcher_kapittel_id(self):
        """En viktig invariant: utledd kapittel_nr må alltid være lik Kapittel_id."""
        df = pd.DataFrame({
            "Post_id": [74001, 53345, 57160, 10001],
            "Kapittel_id": [740, 533, 571, 100],
        })
        resultat = split_kapittel_og_post(df)
        assert (resultat["kapittel_nr"] == resultat["Kapittel_id"]).all()


class TestLastBevilgning:
    """Integrasjonstester mot de faktiske datafilene.

    Disse forankrer referansetall fra prototypen.
    """

    @pytest.fixture(scope="class")
    def bev(self):
        return last_bevilgning()

    def test_antall_rader(self, bev):
        """Aggregert bør gi 21 326 rader (validert mot prototype)."""
        assert len(bev) == 21326

    def test_periode_dekker_2014_til_2026(self, bev):
        aar_kolonne = "Ar" if "Ar" in bev.columns else "År"
        assert bev[aar_kolonne].min() == 2014
        assert bev[aar_kolonne].max() == 2026

    def test_antall_departementer(self, bev):
        assert bev["Fagdepartement"].nunique() == 16

    def test_kapittel_og_post_er_separate_kolonner(self, bev):
        """Sentralt: kapittel og post må holdes som to konsepter."""
        assert "kapittel_nr" in bev.columns
        assert "post_nr" in bev.columns

    def test_rammetilskudd_innbyggertilskudd_2014(self, bev):
        """Validering mot prototype: 2014 = 115,8 mrd."""
        aar_kol = "Ar" if "Ar" in bev.columns else "År"
        rad = bev[
            (bev[aar_kol] == 2014)
            & (bev["Kapittel"] == "Rammetilskudd til kommuner")
            & (bev["Post"] == "Innbyggertilskudd")
        ]
        assert len(rad) == 1
        verdi_mrd = rad["Bevilgning_beløp"].iloc[0] / 1e9
        assert 115.0 < verdi_mrd < 116.5

    def test_rammetilskudd_innbyggertilskudd_2026(self, bev):
        """Validering mot prototype: 2026 = 202,1 mrd."""
        aar_kol = "Ar" if "Ar" in bev.columns else "År"
        rad = bev[
            (bev[aar_kol] == 2026)
            & (bev["Kapittel"] == "Rammetilskudd til kommuner")
            & (bev["Post"] == "Innbyggertilskudd")
        ]
        assert len(rad) == 1
        verdi_mrd = rad["Bevilgning_beløp"].iloc[0] / 1e9
        assert 201.5 < verdi_mrd < 202.5

    def test_innbyggertilskudd_er_60_post(self, bev):
        """Innbyggertilskuddet er post 60 (kommunal deflator)."""
        rad = bev[
            (bev["Kapittel"] == "Rammetilskudd til kommuner")
            & (bev["Post"] == "Innbyggertilskudd")
        ].iloc[0]
        assert rad["post_nr"] == 60
