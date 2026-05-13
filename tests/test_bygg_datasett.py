"""Tester for src.data.bygg_datasett.

Forankrer at JSON-strukturen som leveres til frontend har riktig form
og inneholder de samme referansetallene som testene i de underliggende
modulene allerede har verifisert.
"""

import math

import pytest

from src.analyse.realvekst import beregn_reell_bevilgning
from src.data.bevilgning import last_bevilgning
from src.data.bygg_datasett import bygg_departement, bygg_oversikt


@pytest.fixture(scope="module")
def oversikt():
    return bygg_oversikt(basisaar=2024, start=2014, slutt=2026)


@pytest.fixture(scope="module")
def bev_reell():
    return beregn_reell_bevilgning(last_bevilgning(), basisaar=2024)


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

        datetime.fromisoformat(oversikt["metadata"]["generert"])


class TestPostTyper:
    """Filter-funksjonalitet i frontend trenger en liste over distinkte post-typer."""

    def test_post_typer_finnes_i_metadata(self, oversikt):
        assert "post_typer" in oversikt["metadata"]

    def test_post_typer_er_liste(self, oversikt):
        pt = oversikt["metadata"]["post_typer"]
        assert isinstance(pt, list)
        assert all(isinstance(v, str) for v in pt)

    def test_post_typer_er_sortert_unike(self, oversikt):
        pt = oversikt["metadata"]["post_typer"]
        assert pt == sorted(set(pt))

    def test_post_typer_ikke_tom(self, oversikt):
        assert len(oversikt["metadata"]["post_typer"]) >= 2


class TestOversiktDepartementer:
    """Hver departementsblokk i oversikten har feltene frontend forventer."""

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

    def test_tidsserie_har_sammenhengende_aar(self, oversikt):
        for dep in oversikt["departementer"]:
            aar_i_serien = sorted(int(p["ar"]) for p in dep["tidsserie"])
            for forrige, neste in zip(aar_i_serien, aar_i_serien[1:], strict=False):
                assert neste == forrige + 1


class TestSortering:
    """Sortering: synkende på realvekst, brudd nederst."""

    def test_brudd_plassert_nederst(self, oversikt):
        deps = oversikt["departementer"]
        forste_brudd = next(
            (i for i, d in enumerate(deps) if d["har_strukturelt_brudd"]),
            len(deps),
        )
        for d in deps[forste_brudd:]:
            assert d["har_strukturelt_brudd"]

    def test_ikke_brudd_sortert_synkende(self, oversikt):
        deps = [d for d in oversikt["departementer"] if not d["har_strukturelt_brudd"]]
        for forrige, neste in zip(deps, deps[1:], strict=False):
            assert forrige["realvekst_pst"] >= neste["realvekst_pst"]


class TestOversiktReferansetall:
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
        f = self._finn(oversikt, "Forsvarsdepartementet")
        assert 58.0 < f["reell_start"] / 1e9 < 59.0

    def test_forsvar_reell_slutt(self, oversikt):
        f = self._finn(oversikt, "Forsvarsdepartementet")
        assert 164.0 < f["reell_slutt"] / 1e9 < 165.0

    def test_forsvar_tidsserie_2024_basisaar(self, oversikt):
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

    def test_dfd_markert(self, oversikt):
        d = next(
            x
            for x in oversikt["departementer"]
            if x["navn"] == "Digitaliserings- og forvaltningsdepartementet"
        )
        assert d["har_strukturelt_brudd"]


class TestJsonSerialiserbar:
    """JSON skal ikke inneholde NaN eller andre uregelmessigheter."""

    def test_ingen_nan_i_oversikt(self, oversikt):
        import json

        json.dumps(oversikt, allow_nan=False)


class TestBygDepartement:
    """Per-departement-filer for niv 1-3."""

    @pytest.fixture(scope="class")
    def forsvar(self, bev_reell):
        # Forsvarsdepartementet har id-en som vi henter dynamisk
        dep_id = int(
            bev_reell.loc[
                bev_reell["Fagdepartement"] == "Forsvarsdepartementet",
                "Fagdepartement_id",
            ].iloc[0]
        )
        return bygg_departement(bev_reell, dep_id=dep_id)

    def test_har_metadata(self, forsvar):
        assert "metadata" in forsvar
        assert forsvar["metadata"]["basisaar"] == 2024

    def test_departement_blokk(self, forsvar):
        dep = forsvar["departement"]
        for felt in (
            "id",
            "navn",
            "realvekst_pst",
            "har_strukturelt_brudd",
            "tidsserie",
        ):
            assert felt in dep
        assert dep["navn"] == "Forsvarsdepartementet"

    def test_forsvar_realvekst(self, forsvar):
        """Departementsnivå skal reprodusere +181,2 %."""
        assert 180.5 < forsvar["departement"]["realvekst_pst"] < 181.9

    def test_forsvar_tidsserie_dekker_perioden(self, forsvar):
        aar = sorted(p["ar"] for p in forsvar["departement"]["tidsserie"])
        assert aar[0] == 2014
        assert aar[-1] == 2026

    def test_har_programomraader(self, forsvar):
        assert len(forsvar["programomraader"]) >= 1
        for po in forsvar["programomraader"]:
            for felt in ("nr", "navn", "realvekst_pst", "tidsserie", "poster"):
                assert felt in po

    def test_programomraade_sum_matcher_departement(self, forsvar):
        """For 2026 skal sum av reell over alle programområder være
        lik departementets totale reell."""
        po_sum_2026 = sum(
            next(p["reell"] for p in po["tidsserie"] if p["ar"] == 2026)
            for po in forsvar["programomraader"]
        )
        dep_2026 = next(
            p["reell"] for p in forsvar["departement"]["tidsserie"] if p["ar"] == 2026
        )
        assert abs(po_sum_2026 - dep_2026) < 1.0

    def test_poster_har_paakrevde_felt(self, forsvar):
        for po in forsvar["programomraader"]:
            for post in po["poster"]:
                paakrevde = {
                    "post_id",
                    "post_navn",
                    "post_nr",
                    "kapittel_nr",
                    "kapittel",
                    "deflator_type",
                    "tidsserie",
                }
                assert paakrevde <= set(post.keys())

    def test_deflator_type_er_kommunal_for_60_til_69(self, forsvar):
        for po in forsvar["programomraader"]:
            for post in po["poster"]:
                if 60 <= post["post_nr"] <= 69:
                    assert post["deflator_type"] == "kommunal"
                else:
                    assert post["deflator_type"] == "statlig"

    def test_post_sum_matcher_programomraade(self, forsvar):
        """For 2026 skal sum av reell over alle poster i et programområde
        være lik programområdets totale reell. Noen poster mangler kanskje
        2026-data (avskaffet); de bidrar med 0."""
        for po in forsvar["programomraader"]:
            post_sum_2026 = sum(
                next(
                    (t["reell"] for t in p["tidsserie"] if t["ar"] == 2026),
                    0.0,
                )
                for p in po["poster"]
            )
            po_2026 = next(t["reell"] for t in po["tidsserie"] if t["ar"] == 2026)
            assert abs(post_sum_2026 - po_2026) < 1.0


class TestBygDepartementUgyldigId:
    def test_ukjent_id_gir_feil(self, bev_reell):
        with pytest.raises(ValueError, match="9999"):
            bygg_departement(bev_reell, dep_id=9999)


class TestIngenNanIDepartementsfil:
    def test_forsvarsfil_serialiserbar(self, bev_reell):
        import json

        dep_id = int(
            bev_reell.loc[
                bev_reell["Fagdepartement"] == "Forsvarsdepartementet",
                "Fagdepartement_id",
            ].iloc[0]
        )
        data = bygg_departement(bev_reell, dep_id=dep_id)
        # Skal være serialiserbar uten allow_nan=True
        s = json.dumps(data, allow_nan=False)
        assert "NaN" not in s

    def test_alle_tall_er_finite(self, bev_reell):
        dep_id = int(
            bev_reell.loc[
                bev_reell["Fagdepartement"] == "Forsvarsdepartementet",
                "Fagdepartement_id",
            ].iloc[0]
        )
        data = bygg_departement(bev_reell, dep_id=dep_id)
        for p in data["departement"]["tidsserie"]:
            assert not math.isnan(p["nominell"])
            assert not math.isnan(p["reell"])
        for po in data["programomraader"]:
            for p in po["tidsserie"]:
                assert not math.isnan(p["nominell"])
                assert not math.isnan(p["reell"])
