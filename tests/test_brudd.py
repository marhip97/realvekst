"""Tester for src.analyse.brudd.

Forankrer at de tre kjente strukturelle bruddene fra STATUS.md blir
korrekt markert.
"""

import pandas as pd
import pytest

from src.analyse.brudd import STRUKTURELLE_BRUDD_DEPARTEMENT, marker_brudd_departement


class TestStrukturelleBruddDepartement:
    """Innhold i konstantlisten."""

    def test_energidep_er_markert(self):
        assert "Energidepartementet" in STRUKTURELLE_BRUDD_DEPARTEMENT

    def test_nfd_er_markert(self):
        assert "Nærings- og fiskeridepartementet" in STRUKTURELLE_BRUDD_DEPARTEMENT

    def test_dfd_er_markert(self):
        assert (
            "Digitaliserings- og forvaltningsdepartementet"
            in STRUKTURELLE_BRUDD_DEPARTEMENT
        )

    def test_alle_beskrivelser_er_tekst(self):
        for navn, beskrivelse in STRUKTURELLE_BRUDD_DEPARTEMENT.items():
            assert isinstance(beskrivelse, str)
            assert len(beskrivelse) > 20, f"For kort beskrivelse for {navn}"


class TestMarkerBruddDepartement:
    """Annotering av datasett med brudd-flagg og beskrivelse."""

    @pytest.fixture
    def df(self):
        return pd.DataFrame(
            {
                "Fagdepartement": [
                    "Forsvarsdepartementet",
                    "Energidepartementet",
                    "Nærings- og fiskeridepartementet",
                    "Digitaliserings- og forvaltningsdepartementet",
                    "Helse- og omsorgsdepartementet",
                ],
                "verdi": [1, 2, 3, 4, 5],
            }
        )

    def test_legger_til_kolonner(self, df):
        ut = marker_brudd_departement(df)
        assert "har_strukturelt_brudd" in ut.columns
        assert "brudd_beskrivelse" in ut.columns

    def test_forsvar_ikke_brudd(self, df):
        ut = marker_brudd_departement(df)
        rad = ut[ut["Fagdepartement"] == "Forsvarsdepartementet"].iloc[0]
        assert rad["har_strukturelt_brudd"] is False or not rad["har_strukturelt_brudd"]
        assert rad["brudd_beskrivelse"] is None or pd.isna(rad["brudd_beskrivelse"])

    def test_energidep_markert_med_beskrivelse(self, df):
        ut = marker_brudd_departement(df)
        rad = ut[ut["Fagdepartement"] == "Energidepartementet"].iloc[0]
        assert rad["har_strukturelt_brudd"]
        assert "omorganisering" in rad["brudd_beskrivelse"].lower()

    def test_nfd_markert(self, df):
        ut = marker_brudd_departement(df)
        rad = ut[ut["Fagdepartement"] == "Nærings- og fiskeridepartementet"].iloc[0]
        assert rad["har_strukturelt_brudd"]
        assert rad["brudd_beskrivelse"] is not None

    def test_dfd_markert(self, df):
        ut = marker_brudd_departement(df)
        rad = ut[
            ut["Fagdepartement"] == "Digitaliserings- og forvaltningsdepartementet"
        ].iloc[0]
        assert rad["har_strukturelt_brudd"]
        assert "2014" in rad["brudd_beskrivelse"]

    def test_endrer_ikke_input(self, df):
        original = df.copy()
        marker_brudd_departement(df)
        pd.testing.assert_frame_equal(df, original)

    def test_feil_uten_fagdepartement_kolonne(self):
        df_uten = pd.DataFrame({"annet": [1, 2]})
        with pytest.raises(ValueError, match="Fagdepartement"):
            marker_brudd_departement(df_uten)
