"""Read-only access to the AbangColek platform store (SQLite).

The platform store is the authoritative record for products, cases, QC
assessments and stock lots. This module opens it with SQLite's `mode=ro`
flag, so the agent service physically cannot mutate platform state.

If the store cannot be reached, every reader returns an explicit failure with
a machine-readable reason code instead of inventing content.
"""

from __future__ import annotations

import json
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import reason_codes
from .provenance import utc_now_iso

#: Repository root (agents/google-adk/domain/platform_store.py -> repo root).
REPO_ROOT = Path(__file__).resolve().parents[3]

#: Default platform database, matching `PLATFORM_DATABASE` in the TS build.
DEFAULT_DATABASE_RELATIVE = Path("var") / "lib" / "platform" / "platform.sqlite"

#: Record kinds used by `server/platform/store.ts`.
KIND_CATALOGUE = "catalogue"
KIND_LOTS = "lots"
KIND_RESERVATIONS = "reservations"
KIND_CASES = "cases"
KIND_QC = "qc"
KIND_ORDERS = "orders"
KIND_CAMPAIGNS = "campaigns"

#: Key used to tag each merged record with the kind it was read from.
RECORD_KIND_KEY = "__recordKind__"

#: Kinds read when a caller does not restrict the read.
DEFAULT_KINDS = (
    KIND_CATALOGUE,
    KIND_LOTS,
    KIND_RESERVATIONS,
    KIND_CASES,
    KIND_QC,
    KIND_ORDERS,
    KIND_CAMPAIGNS,
)


def platform_database_path() -> Path:
    """Resolve the platform database path.

    Honours `PLATFORM_DATABASE` (same env var the TypeScript build uses) and
    falls back to `<repo>/var/lib/platform/platform.sqlite`.
    """
    configured = os.environ.get("PLATFORM_DATABASE", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return (REPO_ROOT / DEFAULT_DATABASE_RELATIVE).resolve()


@dataclass(frozen=True)
class StoreReadResult:
    """Outcome of a read against the platform store."""

    available: bool
    reason_code: Optional[str]
    database_path: str
    records: List[Dict[str, Any]]
    metadata: Dict[str, str]
    read_at: str
    detail: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "available": self.available,
            "reasonCode": self.reason_code,
            "databasePath": self.database_path,
            "records": self.records,
            "metadata": self.metadata,
            "readAt": self.read_at,
            "detail": self.detail,
        }


def _connect_readonly(database_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(
        f"file:{database_path.as_posix()}?mode=ro", uri=True, timeout=5.0
    )
    connection.row_factory = sqlite3.Row
    return connection


def read_store(
    kinds: Optional[List[str]] = None,
    database_path: Optional[Path] = None,
) -> StoreReadResult:
    """Read the requested record kinds from the platform store, read-only.

    Never raises for an unreachable store: the failure is reported as data.
    """
    resolved = database_path or platform_database_path()
    read_at = utc_now_iso()
    path_text = str(resolved)

    if not resolved.exists():
        return StoreReadResult(
            available=False,
            reason_code=reason_codes.CATALOGUE_STORE_UNAVAILABLE,
            database_path=path_text,
            records=[],
            metadata={},
            read_at=read_at,
            detail="Fail pangkalan data platform tidak dijumpai.",
        )

    try:
        connection = _connect_readonly(resolved)
    except sqlite3.Error as exc:
        return StoreReadResult(
            available=False,
            reason_code=reason_codes.CATALOGUE_STORE_UNAVAILABLE,
            database_path=path_text,
            records=[],
            metadata={},
            read_at=read_at,
            detail=f"Gagal membuka pangkalan data platform: {exc.__class__.__name__}.",
        )

    try:
        metadata: Dict[str, str] = {}
        try:
            for row in connection.execute("SELECT key, value FROM metadata"):
                metadata[str(row["key"])] = str(row["value"])
        except sqlite3.Error:
            metadata = {}

        records: List[Dict[str, Any]] = []
        wanted = kinds if kinds is not None else DEFAULT_KINDS
        for kind in wanted:
            try:
                rows = connection.execute(
                    'SELECT data FROM records WHERE kind=? ORDER BY updated_at DESC, id',
                    (kind,),
                ).fetchall()
            except sqlite3.Error:
                rows = []
            for row in rows:
                try:
                    parsed = json.loads(row["data"])
                except (TypeError, ValueError):
                    continue
                if isinstance(parsed, dict):
                    tagged = dict(parsed)
                    tagged[RECORD_KIND_KEY] = kind
                    records.append(tagged)
    except sqlite3.Error as exc:
        return StoreReadResult(
            available=False,
            reason_code=reason_codes.CATALOGUE_READ_FAILED,
            database_path=path_text,
            records=[],
            metadata={},
            read_at=read_at,
            detail=f"Gagal membaca pangkalan data platform: {exc.__class__.__name__}.",
        )
    finally:
        connection.close()

    return StoreReadResult(
        available=True,
        reason_code=None,
        database_path=path_text,
        records=records,
        metadata=metadata,
        read_at=read_at,
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def published_catalogue(
    database_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Read the real published catalogue, mirroring `server/platform/commerce.ts`.

    A product is published when `status === 'published'`. Available quantity
    follows the same HQ / business-owner arithmetic used by the public build.
    """
    store = read_store(
        kinds=[KIND_CATALOGUE, KIND_LOTS, KIND_RESERVATIONS],
        database_path=database_path,
    )

    if not store.available:
        return {
            "available": False,
            "reasonCode": store.reason_code,
            "detail": store.detail,
            "databasePath": store.database_path,
            "publishedProducts": None,
            "catalogueVersion": None,
            "products": [],
            "readAt": store.read_at,
        }

    catalogue_version_raw = store.metadata.get("catalogue_version")
    try:
        catalogue_version = int(catalogue_version_raw) if catalogue_version_raw else 0
    except (TypeError, ValueError):
        catalogue_version = 0

    lots = [r for r in store.records if _record_kind(r) == KIND_LOTS]
    reservations = [
        r for r in store.records if _record_kind(r) == KIND_RESERVATIONS
    ]
    catalogue = [r for r in store.records if _record_kind(r) == KIND_CATALOGUE]

    now = _now_iso()
    published: List[Dict[str, Any]] = []
    for product in catalogue:
        if product.get("status") != "published":
            continue
        product_id = str(product.get("id", ""))
        available = _available_quantity(product_id, lots, reservations, now)
        published.append(
            {
                "id": product_id,
                "name": str(product.get("name", "")),
                "description": str(product.get("description", "")),
                "priceSen": _as_int(product.get("priceSen")),
                "currency": str(product.get("currency", "MYR")),
                "packSize": _as_int(product.get("packSize")),
                "publishedVersion": catalogue_version,
                "availableQuantity": available,
            }
        )

    return {
        "available": True,
        "reasonCode": (
            reason_codes.CATALOGUE_EMPTY if not published else reason_codes.PASS
        ),
        "detail": (
            None
            if published
            else "Tiada produk berstatus 'published' dalam katalog semasa."
        ),
        "databasePath": store.database_path,
        "publishedProducts": len(published),
        "catalogueVersion": catalogue_version,
        "products": published,
        "readAt": store.read_at,
    }


def _record_kind(record: Dict[str, Any]) -> str:
    """Records are stored per kind; the reader merges kinds, so tag them."""
    return str(record.get(RECORD_KIND_KEY, ""))


def _as_int(value: Any) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return 0


def _available_quantity(
    product_id: str,
    lots: List[Dict[str, Any]],
    reservations: List[Dict[str, Any]],
    now_iso: str,
) -> int:
    on_hand = 0
    for lot in lots:
        if str(lot.get("productId", "")) != product_id:
            continue
        if lot.get("ownerId") != "business" or lot.get("locationId") != "hq":
            continue
        if lot.get("status") != "available":
            continue
        expiry = lot.get("expiryAt")
        if expiry and str(expiry) <= now_iso:
            continue
        on_hand += _as_int(lot.get("quantity"))

    reserved = 0
    for reservation in reservations:
        if str(reservation.get("productId", "")) != product_id:
            continue
        if reservation.get("ownerId") != "business" or reservation.get("locationId") != "hq":
            continue
        if reservation.get("status") != "active":
            continue
        expires_at = reservation.get("expiresAt")
        if expires_at and str(expires_at) <= now_iso:
            continue
        reserved += _as_int(reservation.get("quantity"))

    return max(0, on_hand - reserved)


__all__ = [
    "REPO_ROOT",
    "DEFAULT_DATABASE_RELATIVE",
    "KIND_CATALOGUE",
    "KIND_LOTS",
    "KIND_RESERVATIONS",
    "KIND_CASES",
    "KIND_QC",
    "KIND_ORDERS",
    "KIND_CAMPAIGNS",
    "StoreReadResult",
    "platform_database_path",
    "read_store",
    "published_catalogue",
]
