"""Shared fixtures for the Google ADK agent service tests.

Every fixture builds a REAL platform store (SQLite, the same schema used by
`server/platform/store.ts`) so the specialists have to read genuine records
instead of returning hardcoded constants.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

REPO_ROOT = SERVICE_ROOT.parents[1]

CATALOGUE_VERSION = 7

PUBLISHED_PRODUCTS = (
    {
        "id": "prod-sambal-klasik",
        "name": "Sambal Colek Klasik",
        "description": "Sambal colek isi ikan bilis.",
        "priceSen": 1200,
        "currency": "MYR",
        "packSize": 1,
        "revision": 2,
        "status": "published",
    },
    {
        "id": "prod-belacan-ori",
        "name": "Colek Belacan Ori",
        "description": "Belacan statutori dengan sambal.",
        "priceSen": 1850,
        "currency": "MYR",
        "packSize": 1,
        "revision": 1,
        "status": "published",
    },
)

DRAFT_PRODUCT = {
    "id": "prod-kombo-draf",
    "name": "Pek Kombo Draf",
    "description": "Belum diterbitkan.",
    "priceSen": 9900,
    "currency": "MYR",
    "packSize": 3,
    "revision": 1,
    "status": "draft",
}

STOCK_LOTS = (
    {
        "id": "lot-hq-1",
        "productId": "prod-sambal-klasik",
        "ownerId": "business",
        "locationId": "hq",
        "custodyId": "custody-hq",
        "quantity": 50,
        "status": "available",
        "batchId": "batch-a",
        "revision": 1,
    },
)

RESERVATIONS = (
    {
        "id": "res-1",
        "orderId": "ord-1",
        "productId": "prod-sambal-klasik",
        "ownerId": "business",
        "locationId": "hq",
        "quantity": 5,
        "status": "active",
        "expiresAt": "2099-01-01T00:00:00.000Z",
        "revision": 1,
    },
)

CASES = (
    {
        "id": "case-1",
        "orderId": "ord-1",
        "customerId": "cust-1",
        "status": "investigating",
        "revision": 1,
        "subject": "Botol bocor",
        "description": "Botol bocor semasa penghantaran.",
        "createdAt": "2026-10-19T04:00:00.000Z",
    },
)

QC_ASSESSMENTS = (
    {
        "caseId": "case-1",
        "schemaVersion": 1,
        "method": "local_rules",
        "dimensions": {"seal": "pass", "label": "pass"},
        "evidenceIds": ["ev-1"],
        "unknownReasons": ["supplier lot review pending"],
        "assessedAt": "2026-10-19T05:00:00.000Z",
    },
)


def _create_store(
    path: Path,
    *,
    catalogue: Iterable[Dict[str, Any]] = (),
    lots: Iterable[Dict[str, Any]] = (),
    reservations: Iterable[Dict[str, Any]] = (),
    cases: Iterable[Dict[str, Any]] = (),
    qc: Iterable[Dict[str, Any]] = (),
    catalogue_version: Optional[int] = CATALOGUE_VERSION,
) -> Path:
    """Create a platform store with the same schema as the TypeScript store."""
    connection = sqlite3.connect(str(path))
    try:
        connection.execute(
            "CREATE TABLE records (kind TEXT NOT NULL,id TEXT NOT NULL,"
            "data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,id))"
        )
        connection.execute(
            "CREATE TABLE metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL)"
        )

        def insert(kind: str, records: Iterable[Dict[str, Any]]) -> None:
            for record in records:
                record_id = str(record.get("id") or record.get("caseId") or "")
                connection.execute(
                    "INSERT INTO records(kind,id,data,updated_at) VALUES(?,?,?,?)",
                    (
                        kind,
                        record_id,
                        json.dumps(record),
                        str(record.get("updatedAt", "2026-10-19T00:00:00.000Z")),
                    ),
                )

        insert("catalogue", catalogue)
        insert("lots", lots)
        insert("reservations", reservations)
        insert("cases", cases)
        insert("qc", qc)

        if catalogue_version is not None:
            connection.execute(
                "INSERT INTO metadata(key,value) VALUES('catalogue_version',?)",
                (str(catalogue_version),),
            )
        connection.commit()
    finally:
        connection.close()
    return path


@pytest.fixture()
def platform_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A populated platform store with two published products."""
    path = _create_store(
        tmp_path / "platform.sqlite",
        catalogue=PUBLISHED_PRODUCTS + (DRAFT_PRODUCT,),
        lots=STOCK_LOTS,
        reservations=RESERVATIONS,
        cases=CASES,
        qc=QC_ASSESSMENTS,
    )
    monkeypatch.setenv("PLATFORM_DATABASE", str(path))
    return path


@pytest.fixture()
def empty_platform_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A reachable platform store with no catalogue, case or QC records."""
    path = _create_store(tmp_path / "empty.sqlite")
    monkeypatch.setenv("PLATFORM_DATABASE", str(path))
    return path


@pytest.fixture()
def missing_platform_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A platform store path that does not exist at all."""
    path = tmp_path / "does-not-exist.sqlite"
    monkeypatch.setenv("PLATFORM_DATABASE", str(path))
    return path


@pytest.fixture()
def client():
    """FastAPI test client bound to the real ADK service."""
    from fastapi.testclient import TestClient

    import app as service

    with TestClient(service.app) as test_client:
        yield test_client
