from io import StringIO
from unittest.mock import patch
from urllib.error import URLError

import pytest


def test_quote_authentication_permissions_and_provider_failure(client, user_factory, login):
    from app.exchange_rates import QuoteUnavailable
    person = user_factory(kind="person", email="quote@example.test")
    project = user_factory(kind="project", email="quote-project@example.test")
    assert client.get("/api/solana-payments/quote").status_code == 401
    assert client.get("/api/solana-payments/quote", headers=login(project)).status_code == 403
    with patch("app.main.sol_brl_quote", side_effect=QuoteUnavailable("Cotação indisponível")):
        assert client.get("/api/solana-payments/quote", headers=login(person)).status_code == 503
    with patch("app.main.sol_brl_quote", return_value={"brl_per_sol": "500", "updated_at": 1000, "expires_at": 1300, "source": "CoinGecko"}):
        response = client.get("/api/solana-payments/quote", headers=login(person))
        assert response.status_code == 200
        assert response.json()["brl_per_sol"] == "500"


def test_quote_reuses_fresh_cache_and_refreshes_after_a_minute(monkeypatch):
    from app import exchange_rates as rates
    monkeypatch.setattr(rates, "_cached", None)
    monkeypatch.setattr(rates, "_cached_at", 0)
    with patch.object(rates, "time", return_value=1000), patch.object(rates, "urlopen", side_effect=lambda *a, **k: StringIO('{"solana":{"brl":500.12,"last_updated_at":1000}}')) as fetch:
        assert rates.sol_brl_quote()["brl_per_sol"] == "500.12"
        assert rates.sol_brl_quote()["expires_at"] == 1300
        assert fetch.call_count == 1
        with patch.object(rates, "time", return_value=1061):
            rates.sol_brl_quote()
        assert fetch.call_count == 2


@pytest.mark.parametrize("data", [
    '{}', 'not-json', '{"solana":{"brl":-1,"last_updated_at":1000}}',
    '{"solana":{"brl":"NaN","last_updated_at":1000}}',
    '{"solana":{"brl":500,"last_updated_at":699}}',
    '{"solana":{"brl":500,"last_updated_at":2000}}',
])
def test_quote_rejects_invalid_or_stale_prices(monkeypatch, data):
    from app import exchange_rates as rates
    monkeypatch.setattr(rates, "_cached", None)
    with patch.object(rates, "time", return_value=1000), patch.object(rates, "urlopen", return_value=StringIO(data)):
        with pytest.raises(rates.QuoteUnavailable):
            rates.sol_brl_quote()


def test_quote_network_failure_does_not_use_expired_cache(monkeypatch):
    from app import exchange_rates as rates
    monkeypatch.setattr(rates, "_cached", {"expires_at": 900})
    monkeypatch.setattr(rates, "_cached_at", 995)
    with patch.object(rates, "time", return_value=1000), patch.object(rates, "urlopen", side_effect=URLError("offline")):
        with pytest.raises(rates.QuoteUnavailable):
            rates.sol_brl_quote()
