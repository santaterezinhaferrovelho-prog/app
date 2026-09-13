import os
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import server


@pytest.mark.anyio
async def test_calculate_delivery_quote_falls_back_when_ors_is_unavailable(monkeypatch):
    lojista = {
        "neighborhood": "Centro",
        "street": "Rua das Flores",
        "address_number": "100",
        "city": "São Paulo",
        "state": "SP",
        "postal_code": "01000000",
        "delivery_fee_per_km": 2.5,
        "delivery_fee_same_neighborhood": 8.0,
    }

    def fake_fetch_cep(postal_code: str):
        return {
            "postal_code": postal_code,
            "street": "Avenida Paulista",
            "neighborhood": "Vila Mariana",
            "city": "São Paulo",
            "state": "SP",
        }

    def fake_geocode_address(address: str):
        raise HTTPException(status_code=503, detail="OpenRouteService unavailable")

    monkeypatch.setattr(server, "fetch_cep", fake_fetch_cep)
    monkeypatch.setattr(server, "geocode_address", fake_geocode_address)

    quote = await server.calculate_delivery_quote(lojista, "04001000")

    assert quote["same_neighborhood"] is False
    assert quote["distance_km"] > 0
    assert quote["delivery_fee"] > 0


def test_search_address_details_from_street_name(monkeypatch):
    class DummyResponse:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    payload = [{
        "display_name": "Avenida Paulista, Bela Vista, São Paulo, SP, Brasil",
        "address": {
            "road": "Avenida Paulista",
            "suburb": "Bela Vista",
            "city": "São Paulo",
            "state": "São Paulo",
            "postcode": "01310-100"
        }
    }]

    monkeypatch.setattr(server.requests, "get", lambda *args, **kwargs: DummyResponse(payload))

    result = server.search_address_details("Avenida Paulista 1000", expected_city="São Paulo", expected_state="SP")

    assert result["street"] == "Avenida Paulista"
    assert result["neighborhood"] == "Bela Vista"
    assert result["city"] == "São Paulo"
    assert result["state"] == "São Paulo"
    assert result["postal_code"] == "01310100"


def test_search_address_details_rejects_ambiguous_locations(monkeypatch):
    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return [
                {"lat": "-23.5", "lon": "-46.6", "address": {"road": "Rua X", "city": "São Paulo", "state": "São Paulo", "postcode": "01000000"}},
                {"lat": "-23.6", "lon": "-46.7", "address": {"road": "Rua X", "city": "São Paulo", "state": "São Paulo", "postcode": "02000000"}},
            ]

    monkeypatch.setattr(server.requests, "get", lambda *args, **kwargs: DummyResponse())

    result = server.search_address_details("Rua X 123", expected_city="São Paulo", expected_state="SP")

    assert result["postal_code"] == ""
    assert result["street"] == "Rua X 123"


def test_search_address_details_recovers_postal_code_from_same_location(monkeypatch):
    class DummyResponse:
        def __init__(self, payload):
            self.payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self.payload

    responses = iter([
        DummyResponse([{
            "lat": "-23.5",
            "lon": "-46.6",
            "address": {
                "road": "Rua X",
                "suburb": "Centro",
                "city": "São Paulo",
                "state": "São Paulo",
            },
        }]),
        DummyResponse({"address": {
            "road": "Rua X",
            "suburb": "Centro",
            "city": "São Paulo",
            "state": "São Paulo",
            "postcode": "01001-000",
        }}),
    ])

    monkeypatch.setattr(server.requests, "get", lambda *args, **kwargs: next(responses))

    result = server.search_address_details("Rua X 123", expected_city="São Paulo", expected_state="SP")

    assert result["postal_code"] == "01001000"
    assert result["street"] == "Rua X"
    assert result["neighborhood"] == "Centro"


def test_fetch_cep_rejects_invalid_postal_code():
    with pytest.raises(HTTPException) as error:
        server.fetch_cep("123")

    assert error.value.status_code == 400


def test_fetch_cep_reports_provider_failure(monkeypatch):
    class FailedResponse:
        def raise_for_status(self):
            raise server.requests.RequestException("service unavailable")

    monkeypatch.setattr(server.requests, "get", lambda *args, **kwargs: FailedResponse())

    with pytest.raises(HTTPException) as error:
        server.fetch_cep("01310100")

    assert error.value.status_code == 502


@pytest.mark.anyio
async def test_calculate_delivery_quote_from_street_and_number(monkeypatch):
    lojista = {
        "neighborhood": "Centro",
        "street": "Rua das Flores",
        "address_number": "100",
        "city": "São Paulo",
        "state": "SP",
        "postal_code": "01000000",
        "delivery_fee_per_km": 2.5,
        "delivery_fee_same_neighborhood": 8.0,
    }

    def fake_search_address_details(address: str, **kwargs):
        assert "Rua Eugênio da Fonseca" in address
        assert "São Paulo" in address
        assert "SP" in address
        return {
            "postal_code": "03664070",
            "street": "Rua Eugênio da Fonseca",
            "neighborhood": "Vila Mariana",
            "city": "São Paulo",
            "state": "SP",
        }

    def fake_geocode_address(address: str):
        return (0.0, 0.0)

    def fake_route_distance_km(origin, destination):
        return 4.5

    monkeypatch.setattr(server, "search_address_details", fake_search_address_details)
    monkeypatch.setattr(server, "geocode_address", fake_geocode_address)
    monkeypatch.setattr(server, "route_distance_km", fake_route_distance_km)

    quote = await server.calculate_delivery_quote(lojista, "", "Rua Eugênio da Fonseca 123")

    assert quote["postal_code"] == "03664070"
    assert quote["street"] == "Rua Eugênio da Fonseca"
    assert quote["neighborhood"] == "Vila Mariana"
    assert quote["city"] == "São Paulo"
    assert quote["state"] == "SP"
    assert quote["delivery_fee"] > 0


@pytest.mark.anyio
async def test_delivery_quote_uses_fixed_fee_for_same_neighborhood(monkeypatch):
    lojista = {
        "neighborhood": "Centro",
        "street": "Rua das Flores",
        "postal_code": "01000000",
        "delivery_fee_per_km": 2.5,
        "delivery_fee_same_neighborhood": 8.0,
    }
    customer = {
        "postal_code": "01001000",
        "street": "Rua Nova",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "state": "SP",
    }

    monkeypatch.setattr(server, "search_address_details", lambda address, **kwargs: customer)
    monkeypatch.setattr(server, "geocode_address", lambda address: (_ for _ in ()).throw(AssertionError("route must not be calculated")))

    quote = await server.calculate_delivery_quote(lojista, "", "Rua Nova 10")

    assert quote["same_neighborhood"] is True
    assert quote["distance_km"] is None
    assert quote["delivery_fee"] == 8.0


@pytest.mark.anyio
async def test_delivery_quote_uses_per_kilometer_fee_for_other_neighborhood(monkeypatch):
    lojista = {
        "neighborhood": "Centro",
        "street": "Rua das Flores",
        "postal_code": "01000000",
        "delivery_fee_per_km": 2.5,
        "delivery_fee_same_neighborhood": 8.0,
    }
    customer = {
        "postal_code": "04001000",
        "street": "Avenida Paulista",
        "neighborhood": "Bela Vista",
        "city": "São Paulo",
        "state": "SP",
    }

    monkeypatch.setattr(server, "search_address_details", lambda address, **kwargs: customer)
    monkeypatch.setattr(server, "geocode_address", lambda address: (0.0, 0.0))
    monkeypatch.setattr(server, "route_distance_km", lambda origin, destination: 4.5)

    quote = await server.calculate_delivery_quote(lojista, "", "Avenida Paulista 1000")

    assert quote["same_neighborhood"] is False
    assert quote["distance_km"] == 4.5
    assert quote["delivery_fee"] == 11.25
