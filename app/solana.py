"""Small Solana Pay helpers backed by standard JSON-RPC methods."""

import json
import secrets
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import SOLANA_RPC_URL, SOLANA_WALLET_ADDRESS


BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


class SolanaRpcError(RuntimeError):
    pass


def base58_decode(value: str) -> bytes:
    number = 0
    for char in value:
        digit = BASE58_ALPHABET.find(char)
        if digit < 0:
            raise ValueError("Endereço Solana inválido.")
        number = number * 58 + digit
    body = number.to_bytes((number.bit_length() + 7) // 8, "big") if number else b""
    return (b"\0" * (len(value) - len(value.lstrip("1")))) + body


def is_solana_address(value: str) -> bool:
    try:
        return len(base58_decode(value)) == 32
    except ValueError:
        return False


def base58_encode(value: bytes) -> str:
    zeroes = len(value) - len(value.lstrip(b"\0"))
    number = int.from_bytes(value, "big")
    encoded = ""
    while number:
        number, remainder = divmod(number, 58)
        encoded = BASE58_ALPHABET[remainder] + encoded
    return "1" * zeroes + (encoded or ("" if zeroes else "1"))


def new_payment_reference() -> str:
    return base58_encode(secrets.token_bytes(32))


def _rpc(method: str, params: list) -> dict:
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    request = Request(SOLANA_RPC_URL, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(request, timeout=6) as response:
            result = json.loads(response.read())
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        raise SolanaRpcError("Não foi possível consultar a rede Solana agora.") from error
    if "error" in result or "result" not in result:
        raise SolanaRpcError("O provedor RPC retornou uma resposta inválida.")
    return result["result"]


def find_confirmed_payment(
    reference: str,
    recipient: str,
    amount_lamports: int,
) -> str | None:
    signatures = _rpc("getSignaturesForAddress", [reference, {"commitment": "confirmed", "limit": 5}])
    for entry in signatures:
        if entry.get("err") is not None or entry.get("confirmationStatus") not in {"confirmed", "finalized"}:
            continue
        signature = entry.get("signature")
        if not isinstance(signature, str):
            continue
        transaction = _rpc("getTransaction", [signature, {
            "commitment": "confirmed", "encoding": "jsonParsed", "maxSupportedTransactionVersion": 0,
        }])
        if not transaction or transaction.get("meta", {}).get("err") is not None:
            continue
        block_time = transaction.get("blockTime")
        if not isinstance(block_time, int):
            continue
        message = transaction.get("transaction", {}).get("message", {})
        account_keys = message.get("accountKeys", [])
        key_values = {key.get("pubkey") if isinstance(key, dict) else key for key in account_keys}
        if reference not in key_values:
            continue
        for instruction in message.get("instructions", []):
            parsed = instruction.get("parsed") or {}
            info = parsed.get("info") or {}
            if (
                instruction.get("program") == "system"
                and parsed.get("type") == "transfer"
                and info.get("destination") == recipient
                and info.get("lamports") == amount_lamports
            ):
                return signature
    return None


def payment_intent_view(row: dict) -> dict:
    amount = format(Decimal(row["amount_lamports"]) / Decimal(1_000_000_000), "f")
    if "." in amount:
        amount = amount.rstrip("0").rstrip(".")
    query = (
        f"amount={amount}&reference={row['reference']}&label=SocialTrade"
        "&message=Doacao%20SocialTrade"
    )
    return {
        "id": row["id"], "target": row["target"], "project_id": row["project_organization_id"],
        "cause_code": row["cause_code"], "amount_lamports": row["amount_lamports"],
        "reference": row["reference"], "recipient_address": SOLANA_WALLET_ADDRESS,
        "payment_uri": f"solana:{SOLANA_WALLET_ADDRESS}?{query}", "status": row["status"],
        "transaction_signature": row["transaction_signature"],
        "expires_at": None,
    }
