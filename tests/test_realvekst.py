"""Tester for src.analyse.realvekst.

Forankrer den faglige logikken mot konkrete referansetall fra prototypen
(se STATUS.md). Spesielt:
- Forsvarsdepartementet: 42,4 mrd nominell 2014 -> 58,5 mrd reell.
  178,0 mrd nominell 2026 -> 164,5 mrd reell. Realvekst +181,2 %.
- Innbyggertilskuddet (kap. 571 post 60, kommunal deflator):
  115,8 mrd nominell 2014 -> 163,3 mrd reell. 202,1 mrd nominell 2026
  -> 185,4 mrd reell.
- Per departement realvekst 2014-2026:
  Klima +104,8 %, Kultur +53,7 %, Landbruk +34,7 %, Helse +28,7 %,
  Justis +27,0 %.
"""

import pytest

from src.analyse.realvekst import (
    beregn_reell_bevilgning,
    realvekst_prosent,
    velg_deflator_type,
)
from src.data.bevilgning import last_bevilgning


class TestVelgDeflatorType:
    """Postnummer-regelen 60-69 = kommunal, ellers statlig."""

    @pytest.mark.parametrize("post_nr", [60, 61, 65, 69])
    def test_kommunal_intervall(self, post_nr):
        assert velg_deflator_type(post_nr) == "kommunal"

    @pytest.mark.parametrize("post_nr", [1, 21, 30, 50, 59, 70, 71, 90, 99])
    def test_statlig_for_alt_annet(self, post_nr):
        assert velg_deflator_type(post_nr) == "statlig"

    def test_grenser_eksakt(self):
        """Grenseverdier: 59 er statlig, 60 og 69 er kommunal, 70 er statlig."""
        assert velg_deflator_type(59) == "statlig"
        assert velg_deflator_type(60) == "kommunal"
        assert velg_deflator_type(69) == "kommunal"
        assert velg_deflator_type(70) == "statlig"


class TestBeregnReellBevilgning:
    """Anvendelse av deflator per rad og forankring mot referansetall."""

    @pytest.fixture(scope="class")
    def bev_reell(self):
        return beregn_reell_bevilgning(last_bevilgning(), basisaar=2024)

    def test_alle_rader_har_deflator_type(self, bev_reell):
        assert bev_reell["deflator_type"].isin(["statlig", "kommunal"]).all()

    def test_alle_rader_har_prisindeks(self, bev_reell):
        """Hver rad skal ha matchet med indeksen — ingen NaN."""
        assert bev_reell["prisindeks"].notna().all()

    def test_alle_rader_har_reell_verdi(self, bev_reell):
        assert bev_reell["Bevilgning_reell"].notna().all()

    def test_basisaar_gir_lik_nominell_og_reell(self, bev_reell):
        """I basisåret 2024 må reell = nominell (indeks = 100)."""
        aar_kol = "Ar" if "Ar" in bev_reell.columns else "År"
        i_2024 = bev_reell[bev_reell[aar_kol] == 2024]
        diff = (i_2024["Bevilgning_reell"] - i_2024["Bevilgning_beløp"]).abs()
        assert diff.max() < 1.0  # tillat litt floating-point støy

    def test_kommunal_andel(self, bev_reell):
        """Ifølge STATUS.md: 1 301 av 21 326 rader er kommunal deflator."""
        antall_kommunal = (bev_reell["deflator_type"] == "kommunal").sum()
        assert antall_kommunal == 1301

    def test_innbyggertilskudd_2014_reell(self, bev_reell):
        """Forankring: 115,8 mrd nominell 2014 -> 163,3 mrd reell (kommunal)."""
        aar_kol = "Ar" if "Ar" in bev_reell.columns else "År"
        rad = bev_reell[
            (bev_reell[aar_kol] == 2014)
            & (bev_reell["Kapittel"] == "Rammetilskudd til kommuner")
            & (bev_reell["Post"] == "Innbyggertilskudd")
        ].iloc[0]
        assert rad["deflator_type"] == "kommunal"
        reell_mrd = rad["Bevilgning_reell"] / 1e9
        assert 163.0 < reell_mrd < 163.6

    def test_innbyggertilskudd_2026_reell(self, bev_reell):
        """Forankring: 202,1 mrd nominell 2026 -> 185,4 mrd reell."""
        aar_kol = "Ar" if "Ar" in bev_reell.columns else "År"
        rad = bev_reell[
            (bev_reell[aar_kol] == 2026)
            & (bev_reell["Kapittel"] == "Rammetilskudd til kommuner")
            & (bev_reell["Post"] == "Innbyggertilskudd")
        ].iloc[0]
        reell_mrd = rad["Bevilgning_reell"] / 1e9
        assert 185.0 < reell_mrd < 185.8

    def test_forsvarsdep_reell_2014(self, bev_reell):
        """Forsvarsdepartementet 2014: 42,4 mrd nominell -> 58,5 mrd reell."""
        aar_kol = "Ar" if "Ar" in bev_reell.columns else "År"
        sum_reell = bev_reell[
            (bev_reell["Fagdepartement"] == "Forsvarsdepartementet")
            & (bev_reell[aar_kol] == 2014)
        ]["Bevilgning_reell"].sum() / 1e9
        assert 58.0 < sum_reell < 59.0

    def test_forsvarsdep_reell_2026(self, bev_reell):
        """Forsvarsdepartementet 2026: 178,0 mrd nominell -> 164,5 mrd reell."""
        aar_kol = "Ar" if "Ar" in bev_reell.columns else "År"
        sum_reell = bev_reell[
            (bev_reell["Fagdepartement"] == "Forsvarsdepartementet")
            & (bev_reell[aar_kol] == 2026)
        ]["Bevilgning_reell"].sum() / 1e9
        assert 164.0 < sum_reell < 165.0

    def test_konfigurerbart_basisaar(self):
        """Med basisår 2020 må reell = nominell for 2020."""
        bev_reell = beregn_reell_bevilgning(last_bevilgning(), basisaar=2020)
        aar_kol = "Ar" if "Ar" in bev_reell.columns else "År"
        i_2020 = bev_reell[bev_reell[aar_kol] == 2020]
        diff = (i_2020["Bevilgning_reell"] - i_2020["Bevilgning_beløp"]).abs()
        assert diff.max() < 1.0


class TestRealvekstProsent:
    """Hjelpefunksjon for prosentvis endring og dens forankring per departement."""

    def test_positiv_vekst(self):
        assert realvekst_prosent(100.0, 150.0) == pytest.approx(50.0)

    def test_negativ_vekst(self):
        assert realvekst_prosent(100.0, 80.0) == pytest.approx(-20.0)

    def test_uendret(self):
        assert realvekst_prosent(100.0, 100.0) == pytest.approx(0.0)

    def test_null_start_gir_nan(self):
        import math

        assert math.isnan(realvekst_prosent(0.0, 100.0))

    def test_forsvarsdep_2014_2026(self):
        """Den sentrale forankringen: Forsvar har +181,2 % realvekst 2014-2026."""
        bev_reell = beregn_reell_bevilgning(last_bevilgning(), basisaar=2024)
        aar_kol = "Ar" if "Ar" in bev_reell.columns else "År"
        sum_2014 = bev_reell[
            (bev_reell["Fagdepartement"] == "Forsvarsdepartementet")
            & (bev_reell[aar_kol] == 2014)
        ]["Bevilgning_reell"].sum()
        sum_2026 = bev_reell[
            (bev_reell["Fagdepartement"] == "Forsvarsdepartementet")
            & (bev_reell[aar_kol] == 2026)
        ]["Bevilgning_reell"].sum()
        rv = realvekst_prosent(sum_2014, sum_2026)
        assert 180.5 < rv < 181.9

    @pytest.mark.parametrize(
        "dep,forventet",
        [
            ("Klima- og miljødepartementet", 104.8),
            ("Kultur- og likestillingsdepartementet", 53.7),
            ("Landbruks- og matdepartementet", 34.7),
            ("Helse- og omsorgsdepartementet", 28.7),
            ("Justis- og beredskapsdepartementet", 27.0),
        ],
    )
    def test_realvekst_per_departement(self, dep, forventet):
        """Forankring mot listen i STATUS.md."""
        bev_reell = beregn_reell_bevilgning(last_bevilgning(), basisaar=2024)
        aar_kol = "Ar" if "Ar" in bev_reell.columns else "År"
        sum_2014 = bev_reell[
            (bev_reell["Fagdepartement"] == dep) & (bev_reell[aar_kol] == 2014)
        ]["Bevilgning_reell"].sum()
        sum_2026 = bev_reell[
            (bev_reell["Fagdepartement"] == dep) & (bev_reell[aar_kol] == 2026)
        ]["Bevilgning_reell"].sum()
        rv = realvekst_prosent(sum_2014, sum_2026)
        # Toleranse ±0,5 prosentpoeng dekker avrunding i kildetallene
        assert abs(rv - forventet) < 0.5
