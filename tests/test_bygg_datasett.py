"""Tester for src.data.bygg_datasett.

Forankrer at JSON-strukturen som leveres til frontend har riktig form
og inneholder de samme referansetallene som testene i de underliggende
modulene allerede har verifisert.
"""

import math

import pytest

from src.data.bygg_datasett import bygg_oversikt


@pytest.fixture(scope="module")
def oversikt():
    return bygg_oversikt(basisaar=2024, start=2014, slutt=2026)


class TestMetadata:
    """Metadata-blokken må være selvforklarende for frontend."""

    def test_har_paakrevde_felt(self, oversikt):
        m = oversikt["metadata"]
        for felt in ("basisaar", "start", "slutt", "generert", "kilde"):
            assert felt in m, f"Mangler metadata-felt: {felt}"

    def test_basisaar_2024(self, oversikt):
        assert oversikt["metadata"]["basisaar"] == 2024

    def test_periode_2014_2026(self, oversikt):
        assert oversikt["metadata"]["start"] == 2014
        assert oversikt["metadata"]["slutt"] == 2026

    def test_generert_er_iso8601(self, oversikt):
        from datetime import datetime

        # Skal være parsbar som ISO 8601
        datetime.fromisoformat(oversikt["metadata"]["generert"])


class TestDepartementsstruktur:
    """Hver departementsblokk må ha alle feltene frontend forventer."""

    def test_16_departementer(self, oversikt):
        assert len(oversikt["departementer"]) == 16

    def test_har_paakrevde_felt(self, oversikt):
        paakrevde = {
            "id",
            "navn",
            "nominell_start",
            "nominell_slutt",
            "reell_start",
            "reell_slutt",
            "realvekst_pst",
            "har_strukturelt_brudd",
            "brudd_beskrivelse",
            "tidsserie",
        }
        for dep in oversikt["departementer"]:
            assert paakrevde <= set(dep.keys()), (
                f"{dep.get('navn', '?')} mangler felt: {paakrevde - set(dep.keys())}"
            )

    def test_tidsserie_dekker_2014_2026(self, oversikt):
        for dep in oversikt["departementer"]:
            aar_i_serien = sorted(int(p["ar"]) for p in dep["tidsserie"])
            # Departementer som ikke fantes i hele perioden kan ha kortere
            # serier, men de skal være sammenhengende
            for forrige, neste in zip(aar_i_serien, aar_i_serien[1:], strict=False):
                assert neste == forrige + 1, (
                    f"{dep['navn']} har hull i tidsserien: {aar_i_serien}"
                )


class TestSortering:
    """Sortering: synkende på realvekst, brudd nederst."""

    def test_brudd_plassert_nederst(self, oversikt):
        deps = oversikt["departementer"]
        # Finn første brudd-indeks; alle etter skal også være brudd
        forste_brudd = next(
            (i for i, d in enumerate(deps) if d["har_strukturelt_brudd"]),
            len(deps),
        )
        for d in deps[forste_brudd:]:
            assert d["har_strukturelt_brudd"], (
                f"{d['navn']} har ikke brudd men kommer etter et brudd"
            )

    def test_ikke_brudd_sortert_synkende(self, oversikt):
        deps = [d for d in oversikt["departementer"] if not d["har_strukturelt_brudd"]]
        for forrige, neste in zip(deps, deps[1:], strict=False):
            assert forrige["realvekst_pst"] >= neste["realvekst_pst"], (
                f"Sortering brutt: {forrige['navn']} ({forrige['realvekst_pst']}) "
                f"før {neste['navn']} ({neste['realvekst_pst']})"
            )


class TestReferansetall:
    """Sentral forankring: de samme referansetallene som i STATUS.md."""

    def _finn(self, oversikt, navn):
        for d in oversikt["departementer"]:
            if d["navn"] == navn:
                return d
        raise AssertionError(f"Fant ikke departement: {navn}")

    def test_forsvar_realvekst(self, oversikt):
        f = self._finn(oversikt, "Forsvarsdepartementet")
        assert 180.5 < f["realvekst_pst"] < 181.9

    def test_forsvar_reell_start(self, oversikt):
        """58,5 mrd reell i 2014."""
        f = self._finn(oversikt, "Forsvarsdepartementet")
        assert 58.0 < f["reell_start"] / 1e9 < 59.0

    def test_forsvar_reell_slutt(self, oversikt):
        """164,5 mrd reell i 2026."""
        f = self._finn(oversikt, "Forsvarsdepartementet")
        assert 164.0 < f["reell_slutt"] / 1e9 < 165.0

    def test_forsvar_tidsserie_2014_basisaar(self, oversikt):
        """Tidsserie for 2024 (basisår) skal ha nominell = reell."""
        f = self._finn(oversikt, "Forsvarsdepartementet")
        rad = next(p for p in f["tidsserie"] if p["ar"] == 2024)
        assert abs(rad["nominell"] - rad["reell"]) < 1.0

    @pytest.mark.parametrize(
        "navn,forventet",
        [
            ("Klima- og miljødepartementet", 104.8),
            ("Kultur- og likestillingsdepartementet", 53.7),
            ("Landbruks- og matdepartementet", 34.7),
            ("Helse- og omsorgsdepartementet", 28.7),
            ("Justis- og beredskapsdepartementet", 27.0),
        ],
    )
    def test_realvekst_per_departement(self, oversikt, navn, forventet):
        d = self._finn(oversikt, navn)
        assert abs(d["realvekst_pst"] - forventet) < 0.5


class TestStrukturelleBrudd:
    """Alle tre kjente brudd må være markert."""

    def test_energidep_markert(self, oversikt):
        e = next(
            d for d in oversikt["departementer"] if d["navn"] == "Energidepartementet"
        )
        assert e["har_strukturelt_brudd"]
        assert e["brudd_beskrivelse"]

    def test_nfd_markert(self, oversikt):
        n = next(
            d
            for d in oversikt["departementer"]
            if d["navn"] == "Nærings- og fiskeridepartementet"
        )
        assert n["har_strukturelt_brudd"]
        assert n["brudd_beskrivelse"]

    def test_dfd_markert(self, oversikt):
        d = next(
            x
            for x in oversikt["departementer"]
            if x["navn"] == "Digitaliserings- og forvaltningsdepartementet"
        )
        assert d["har_strukturelt_brudd"]
        assert d["brudd_beskrivelse"]


class TestJsonSerialiserbar:
    """JSON skal ikke inneholde NaN eller andre uregelmessigheter."""

    def test_ingen_nan_i_realvekst(self, oversikt):
        """Brudd-departementer kan ha None, men aldri NaN."""
        import json

        # json.dumps skal lykkes uten allow_nan
        s = json.dumps(oversikt, allow_nan=False)
        assert "NaN" not in s

    def test_ingen_nan_i_tidsserie(self, oversikt):
        for dep in oversikt["departementer"]:
            for punkt in dep["tidsserie"]:
                assert not math.isnan(punkt["nominell"])
                assert not math.isnan(punkt["reell"])
