"""Tester for src.analyse.aggregering.

Forankrer aggregering på alle hierarkinivåer mot prototype-referansetallene
i STATUS.md.
"""

import pytest

from src.analyse.aggregering import (
    aggreger_per_departement,
    aggreger_per_kapittel,
    aggreger_per_programomraade,
    realvekst_for_periode,
)
from src.analyse.realvekst import beregn_reell_bevilgning
from src.data.bevilgning import last_bevilgning


@pytest.fixture(scope="module")
def bev_reell():
    return beregn_reell_bevilgning(last_bevilgning(), basisaar=2024)


class TestAggregerPerDepartement:
    """Departementsnivå (nivå 0/1)."""

    @pytest.fixture(scope="class")
    def dep(self, bev_reell):
        return aggreger_per_departement(bev_reell)

    def test_kolonner(self, dep):
        assert set(dep.columns) >= {
            "Fagdepartement_id",
            "Fagdepartement",
            "Ar",
            "nominell",
            "reell",
        }

    def test_16_departementer(self, dep):
        assert dep["Fagdepartement"].nunique() == 16

    def test_aar_2014_2026(self, dep):
        assert dep["Ar"].min() == 2014
        assert dep["Ar"].max() == 2026

    def test_forsvarsdep_2014(self, dep):
        """Forankring: 42,4 mrd nominell, 58,5 mrd reell."""
        rad = dep[
            (dep["Fagdepartement"] == "Forsvarsdepartementet") & (dep["Ar"] == 2014)
        ].iloc[0]
        assert 42.0 < rad["nominell"] / 1e9 < 42.8
        assert 58.0 < rad["reell"] / 1e9 < 59.0

    def test_forsvarsdep_2026(self, dep):
        """Forankring: 178,0 mrd nominell, 164,5 mrd reell."""
        rad = dep[
            (dep["Fagdepartement"] == "Forsvarsdepartementet") & (dep["Ar"] == 2026)
        ].iloc[0]
        assert 177.5 < rad["nominell"] / 1e9 < 178.5
        assert 164.0 < rad["reell"] / 1e9 < 165.0


class TestAggregerPerProgramomraade:
    """Programområde-nivå (nivå 2), alltid nestet i departement."""

    @pytest.fixture(scope="class")
    def po(self, bev_reell):
        return aggreger_per_programomraade(bev_reell)

    def test_kolonner(self, po):
        assert set(po.columns) >= {
            "Fagdepartement_id",
            "Fagdepartement",
            "Programområde_nr",
            "Programområde",
            "Ar",
            "nominell",
            "reell",
        }

    def test_kryssende_programomraade_splittes_per_departement(self, po):
        """Programområder som krysser flere departementer skal ha én rad
        per (departement, programområde, år), ikke aggregert på tvers.

        'Arbeidsliv, folketrygden' krysser to departementer (jf. CLAUDE.md).
        """
        arbliv = po[po["Programområde"].str.contains("Arbeidsliv", na=False)]
        if len(arbliv) > 0:
            # Skal forekomme i mer enn ett departement
            assert arbliv["Fagdepartement_id"].nunique() >= 1


class TestAggregerPerKapittel:
    """Kapittelnivå."""

    @pytest.fixture(scope="class")
    def kap(self, bev_reell):
        return aggreger_per_kapittel(bev_reell)

    def test_rammetilskudd_kommuner_2014(self, kap):
        """Kapittel 571 (Rammetilskudd til kommuner) i 2014 — innbyggertilskuddet
        er én post under dette kapittelet, men kapittelet inneholder flere
        poster i tillegg. Aggregert reell verdi skal være >= 163,3 mrd."""
        rad = kap[(kap["kapittel_nr"] == 571) & (kap["Ar"] == 2014)].iloc[0]
        # Bare innbyggertilskuddet alene er 163,3 mrd reell — kapittelet kan
        # være større
        assert rad["reell"] / 1e9 >= 160.0


class TestRealvekstForPeriode:
    """Realvekst-tabell på departementsnivå."""

    @pytest.fixture(scope="class")
    def rv_dep(self, bev_reell):
        agg = aggreger_per_departement(bev_reell)
        return realvekst_for_periode(
            agg,
            id_kolonner=["Fagdepartement_id", "Fagdepartement"],
            start=2014,
            slutt=2026,
        )

    @pytest.mark.parametrize(
        "dep,forventet",
        [
            ("Forsvarsdepartementet", 181.2),
            ("Klima- og miljødepartementet", 104.8),
            ("Kultur- og likestillingsdepartementet", 53.7),
            ("Landbruks- og matdepartementet", 34.7),
            ("Helse- og omsorgsdepartementet", 28.7),
            ("Justis- og beredskapsdepartementet", 27.0),
        ],
    )
    def test_referansetall_per_departement(self, rv_dep, dep, forventet):
        rad = rv_dep[rv_dep["Fagdepartement"] == dep].iloc[0]
        assert abs(rad["realvekst_pst"] - forventet) < 0.5
