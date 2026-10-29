"""Indicative market prices, never an executable BRL purchase quote."""

import json
from decimal import Decimal, InvalidOperation
from threading import Lock
from time import time
from urllib.error import URLError
from urllib.request import Request, urlopen


class QuoteUnavailable(RuntimeError):
    pass


_lock = Lock()
_cached = None
_cached_at = 0.0
QUOTE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=brl&include_last_updated_at=true"


def sol_brl_quote():
    global _cached, _cached_at
    with _lock:
        now = time()
        if _cached and now - _cached_at < 60 and now < _cached["expires_at"]:
            return dict(_cached)
        try:
            request = Request(QUOTE_URL, headers={"Accept": "application/json", "User-Agent": "SocialTrade/1.0"})
            with urlopen(request, timeout=6) as response:
                data = json.load(response)["solana"]
            price = Decimal(str(data["brl"]))
            updated = int(data["last_updated_at"])
            if not price.is_finite() or price <= 0 or not now - 300 <= updated <= now + 60:
                raise ValueError("Cotação inválida ou desatualizada")
        except (URLError, OSError, ValueError, TypeError, KeyError, InvalidOperation) as error:
            raise QuoteUnavailable("Cotação SOL/BRL indisponível. Tente atualizar em instantes.") from error
        _cached = {
            "brl_per_sol": str(price), "updated_at": updated, "expires_at": updated + 300,
            "source": "CoinGecko",
        }
        _cached_at = now
        return dict(_cached)
