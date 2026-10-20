"""Google ADK specialist: commerce_reader.

Read-only commerce intelligence. The specialist answers from the *real*
platform catalogue (`var/lib/platform/platform.sqlite`, table `records`,
kind `catalogue`) and never claims catalogue content it did not read.

If the platform store cannot be reached, the specialist says so with an
explicit reason code instead of inventing SKUs.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from google.adk.agents import LlmAgent

from domain import reason_codes
from domain.a2ui import build_card
from domain.platform_store import published_catalogue
from domain.provenance import (
    PERSISTENCE_NONE,
    PERSISTENCE_READ_ONLY,
    PERSISTENCE_UNAVAILABLE,
    build_provenance,
)

AGENT_NAME = "commerce_reader"
TOOL_NAME = "read_published_catalogue"

INSTRUCTION = (
    "Anda adalah specialists commerce_reader platform AbangColek.\n"
    "Tugas: baca katalog produk yang benar-benar diterbitkan daripada storan "
    "platform (baca sahaja) dan laporkan hasilnya.\n"
    "Peraturan: jangan sekali-kali melaporkan SKU, jumlah produk atau harga yang "
    "tidak dibaca daripada storan sebenar. Jika storan platform tidak dapat "
    "dicaapai, laporkan kod sebab sebenar."
)


def read_published_catalogue(query: str = "") -> Dict[str, Any]:
    """Read the real published AbangColek catalogue from the platform store.

    Args:
        query: free-text request from the operator (used for echo only).

    Returns:
        A dict describing what was actually read, including an explicit
        `reasonCode` when the catalogue could not be established.
    """
    catalogue = published_catalogue()
    products: List[Dict[str, Any]] = catalogue.get("products", []) or []
    published_products = catalogue.get("publishedProducts")

    if not catalogue.get("available"):
        summary = (
            "Storan platform tidak dapat dicapai; tiada kandungan katalog boleh "
            "dipaparkan."
        )
    elif not products:
        summary = (
            f"Tiada produk berstatus 'published' dalam katalog semasa "
            f"(catalogue version {catalogue.get('catalogueVersion')})."
        )
    else:
        names = ", ".join(product.get("name", "") for product in products)
        summary = (
            f"Katalog semasa mengandungi {len(products)} produk diterbitkan: {names}."
        )

    return {
        "available": bool(catalogue.get("available")),
        "storeAvailable": bool(catalogue.get("available")),
        "reasonCode": catalogue.get("reasonCode"),
        "detail": catalogue.get("detail"),
        "summary": summary,
        "publishedProducts": published_products,
        "catalogueVersion": catalogue.get("catalogueVersion"),
        "products": products,
        "databasePath": catalogue.get("databasePath"),
        "readAt": catalogue.get("readAt"),
        "query": query,
    }


def build_agent(model: Any) -> LlmAgent:
    """Create the real ADK specialist agent."""
    return LlmAgent(
        name=AGENT_NAME,
        model=model,
        description=(
            "Read-only commerce intelligence agent for the AbangColek platform. "
            "Reads the published catalogue from the platform store and reports "
            "exactly what is published."
        ),
        instruction=INSTRUCTION,
        tools=[read_published_catalogue],
    )


def build_result(
    tool_payload: Optional[Dict[str, Any]],
    request_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Convert the ADK tool result into the specialist response payload."""
    payload = tool_payload or {}
    store_available = bool(payload.get("storeAvailable", payload.get("available")))
    reason_code = payload.get("reasonCode")

    if store_available:
        source = "platform_sqlite"
        persistence = PERSISTENCE_READ_ONLY
    else:
        source = "unavailable"
        persistence = PERSISTENCE_UNAVAILABLE

    provenance = build_provenance(
        source=source,
        agent=AGENT_NAME,
        tool=TOOL_NAME,
        tool_status="completed" if tool_payload else "not_run",
        persistence=persistence,
        detail=payload.get("detail"),
        extra={
            "databasePath": payload.get("databasePath"),
            "catalogueVersion": payload.get("catalogueVersion"),
            "readAt": payload.get("readAt"),
        },
    )

    products = payload.get("products") or []
    props: Dict[str, Any] = {
        "title": "Analisis Katalog & Jualan Runcit",
        "summary": payload.get("summary")
        or "Tiada data katalog boleh dipaparkan.",
        "publishedProducts": payload.get("publishedProducts"),
        "catalogueVersion": payload.get("catalogueVersion"),
        "readOnly": True,
        "products": [
            {
                "id": product.get("id"),
                "name": product.get("name"),
                "priceSen": product.get("priceSen"),
                "packSize": product.get("packSize"),
                "availableQuantity": product.get("availableQuantity"),
            }
            for product in products
        ],
        "reasonCode": reason_code,
    }

    return {
        "status": "success" if store_available else "unavailable",
        "specialist": AGENT_NAME,
        "access": "read_only",
        "schemaVersion": "a2ui.v1",
        "reasonCode": reason_code,
        "a2ui": build_card(
            component="OperationsBriefCard",
            props=props,
            provenance=provenance,
        ),
        "reply": props["summary"],
    }


__all__ = [
    "AGENT_NAME",
    "TOOL_NAME",
    "INSTRUCTION",
    "read_published_catalogue",
    "build_agent",
    "build_result",
]
