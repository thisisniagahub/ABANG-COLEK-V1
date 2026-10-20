"""Tests for the AbangColek Google ADK agent service.

These tests exercise the REAL service:

    * the real `google.adk` runtime (LlmAgent, Runner, InMemorySessionService)
    * the real AG-UI event stream produced by `ag_ui_adk.EventTranslator`
    * the real Margin Guardian arithmetic (integer sen + basis points)
    * the real platform store reader (read-only SQLite)

They deliberately do NOT assert hardcoded constants of the previous stub
implementation (for example a hardcoded `marginSafe is True` derived from a
hardcoded 28.5% margin).
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

import app as service  # noqa: E402
import runtime as adk_runtime  # noqa: E402
from domain import reason_codes  # noqa: E402
from domain.margin import (  # noqa: E402
    DEFAULT_MINIMUM_CONTRIBUTION_SEN,
    MarginInputError,
    evaluate_margin_contribution,
    margin_input_from_mapping,
)


# ---------------------------------------------------------------------------
# Real Google ADK runtime
# ---------------------------------------------------------------------------
def test_service_uses_real_google_adk_classes():
    """The agents really are google.adk objects, not look-alikes."""
    from google.adk.agents.llm_agent import LlmAgent
    from google.adk.models.base_llm import BaseLlm
    from google.adk.sessions.in_memory_session_service import (
        InMemorySessionService,
    )

    runtime = service.RUNTIME

    assert runtime.available is True
    assert isinstance(runtime.master, LlmAgent)
    assert runtime.master.name == "abangcolek_ops"
    assert isinstance(runtime.session_service, InMemorySessionService)

    for specialist in ("commerce_reader", "qc_jev_reviewer", "marketing_drafter"):
        agent = runtime.agents[specialist]
        assert isinstance(agent, LlmAgent)
        assert agent.name == specialist
        assert agent.tools, "each specialist must expose a real ADK tool"

    assert sorted(agent.name for agent in runtime.master.sub_agents) == sorted(
        runtime.agents.keys()
    )

    # The ADK class we instantiate resolves to the installed google.adk package.
    assert LlmAgent.__module__.startswith("google.adk.agents")
    assert BaseLlm.__module__.startswith("google.adk.models")

    from policy_model import LocalPolicyLlm

    assert issubclass(LocalPolicyLlm, BaseLlm)


def test_health_reports_the_runtime_it_actually_imported(client):
    import google.adk

    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()

    assert body["runtimeAvailable"] is True
    assert body["runtime"] == "google-adk"
    assert body["runtimeDetails"]["version"] == google.adk.__version__
    module_path = body["runtimeDetails"]["modulePath"]
    assert module_path.replace("\\", "/").endswith("google/adk/__init__.py")
    assert body["runtimeDetails"]["importError"] is None
    assert body["port"] == 8030
    assert set(body["specialists"]) == {
        "commerce_reader",
        "qc_jev_reviewer",
        "marketing_drafter",
    }
    assert "RUN_STARTED" in body["aguiEvents"]
    assert "TOOL_CALL_START" in body["aguiEvents"]
    assert "RUN_FINISHED" in body["aguiEvents"]


def test_health_does_not_advertise_a_runtime_that_is_not_imported(
    client, monkeypatch: pytest.MonkeyPatch
):
    """If google.adk cannot be imported, /health must say so."""
    unavailable = adk_runtime.AdkRuntimeInfo(
        available=False,
        version=None,
        module_path=None,
        import_error="ModuleNotFoundError: No module named 'google.adk'",
        python_version="3.12.13",
        fastapi_version="0.141.1",
    )
    monkeypatch.setattr(
        adk_runtime, "probe_adk_runtime", lambda: unavailable, raising=True
    )

    body = client.get("/health").json()

    assert body["runtimeAvailable"] is False
    assert body["runtime"] != "google-adk"
    assert body["status"] == "degraded"
    assert body["runtimeDetails"]["available"] is False
    assert "google.adk" in body["runtimeDetails"]["importError"]


def test_health_does_not_claim_a_live_model(client):
    body = client.get("/health").json()
    model = body["model"]

    assert model["kind"] in {"local_policy", "gemini", "unavailable"}
    if model["kind"] == "local_policy":
        assert model["live"] is False
        assert "BUKAN model bahasa hos" in model["reason"]


# ---------------------------------------------------------------------------
# commerce_reader - reads the real catalogue
# ---------------------------------------------------------------------------
def test_commerce_reader_reads_the_real_published_catalogue(client, platform_store):
    response = client.post(
        "/agent/specialists/commerce_reader",
        json={"message": "semak katalog", "payload": {"query": "semak katalog"}},
    )
    assert response.status_code == 200
    data = response.json()["data"]

    props = data["a2ui"]["props"]
    assert data["specialist"] == "commerce_reader"
    assert props["publishedProducts"] == 2
    assert props["catalogueVersion"] == 7
    names = sorted(product["name"] for product in props["products"])
    assert names == ["Colek Belacan Ori", "Sambal Colek Klasik"]
    # The draft product must not be reported as published.
    assert "Pek Kombo Draf" not in names
    # Availability is derived from real lots and reservations (50 - 5).
    sambal = next(p for p in props["products"] if p["id"] == "prod-sambal-klasik")
    assert sambal["availableQuantity"] == 45
    assert sambal["priceSen"] == 1200
    # Provenance describes what actually happened.
    provenance = data["a2ui"]["provenance"]
    assert provenance["source"] == "platform_sqlite"
    assert provenance["persistence"] == "read_only"
    assert provenance["tool"] == "read_published_catalogue"


def test_commerce_reader_reports_an_empty_catalogue_without_fabricating(
    client, empty_platform_store
):
    body = client.post(
        "/agent/specialists/commerce_reader", json={"message": "katalog"}
    ).json()
    data = body["data"]

    assert data["status"] == "success"
    assert data["reasonCode"] == reason_codes.CATALOGUE_EMPTY
    props = data["a2ui"]["props"]
    assert props["publishedProducts"] == 0
    assert props["products"] == []
    # The old stub claimed a three-SKU catalogue. That claim must be gone.
    assert "Sambal Colek Klasik" not in json.dumps(data, ensure_ascii=False)


def test_commerce_reader_reports_an_unavailable_store(
    client, missing_platform_store
):
    body = client.post(
        "/agent/specialists/commerce_reader", json={"message": "katalog"}
    ).json()
    data = body["data"]

    assert data["status"] == "unavailable"
    assert data["reasonCode"] == reason_codes.CATALOGUE_STORE_UNAVAILABLE
    assert data["a2ui"]["props"]["publishedProducts"] is None
    assert data["a2ui"]["provenance"]["source"] == "unavailable"
    assert data["a2ui"]["provenance"]["persistence"] == "unavailable"


# ---------------------------------------------------------------------------
# qc_jev_reviewer - no fabricated complaints or quarantines
# ---------------------------------------------------------------------------
def test_qc_jev_reviewer_reads_a_real_case(client, platform_store):
    body = client.post(
        "/agent/specialists/qc_jev_reviewer",
        json={
            "message": "semak kes",
            "payload": {"incidentType": "leakage", "caseId": "case-1"},
        },
    ).json()
    data = body["data"]
    props = data["a2ui"]["props"]

    assert props["case"]["id"] == "case-1"
    assert props["case"]["orderId"] == "ord-1"
    assert props["jevAssessment"]["method"] == "local_rules"
    assert props["jevAssessment"]["unknownReasons"] == [
        "supplier lot review pending"
    ]
    # Invariants survive.
    assert props["rootCauseStatus"] == "UNDETERMINED"
    assert props["confidenceScore"] is None
    assert props["executedActions"] == []


def test_qc_jev_reviewer_reports_a_missing_case_instead_of_fabricating_one(
    client, empty_platform_store
):
    body = client.post(
        "/agent/specialists/qc_jev_reviewer",
        json={"message": "botol bocor", "payload": {"incidentType": "leakage"}},
    ).json()
    data = body["data"]
    props = data["a2ui"]["props"]

    assert data["reasonCode"] == reason_codes.CASE_RECORD_NOT_FOUND
    assert props["case"] is None
    assert props["jevAssessment"] is None
    assert props["rootCauseStatus"] == "UNDETERMINED"
    assert props["confidenceScore"] is None
    # No action may be presented as an executed receipt.
    for action in data["a2ui"].get("actions", []):
        assert action["executed"] is False
        assert action["requiresOperatorAction"] is True
    assert props["executedActions"] == []


def test_qc_jev_reviewer_reports_an_unavailable_store(client, missing_platform_store):
    body = client.post(
        "/agent/specialists/qc_jev_reviewer", json={"message": "botol bocor"}
    ).json()
    data = body["data"]

    assert data["status"] == "unavailable"
    assert data["reasonCode"] == reason_codes.STORE_UNAVAILABLE
    assert data["a2ui"]["props"]["case"] is None
    assert data["a2ui"]["provenance"]["source"] == "unavailable"


# ---------------------------------------------------------------------------
# marketing_drafter - real Margin Guardian arithmetic
# ---------------------------------------------------------------------------
def _margin_response(client, payload: Dict[str, Any]) -> Dict[str, Any]:
    body = client.post(
        "/agent/specialists/marketing_drafter",
        json={
            "message": "kempen",
            "payload": {"campaignName": "Kempen Ujian", "channel": "whatsapp", **payload},
        },
    )
    assert body.status_code == 200
    return body.json()["data"]


def test_margin_blocks_24_996_percent_even_though_it_rounds_to_25(client):
    """FIN-01: 24.996% must fail even though the display rounds to 25.00%."""
    data = _margin_response(
        client, {"netSalesExTaxSen": 100000, "cogsSen": 75004}
    )
    props = data["a2ui"]["props"]

    assert props["contributionSen"] == 24996
    assert props["contributionMarginPct"] == 25.0  # display rounds to 25.00%
    assert props["contributionMarginPctExact"] == "24.996"
    assert props["isContributionPass"] is True
    assert props["isMarginPctPass"] is False
    assert props["marginSafe"] is False
    assert props["marginStatus"] == "BLOCKED"
    assert data["reasonCode"] == reason_codes.INSUFFICIENT_PERCENT_MARGIN
    # A blocked campaign must not carry an approval action.
    assert data["a2ui"].get("actions", []) == []


def test_margin_passes_exactly_25_000_percent(client):
    data = _margin_response(
        client, {"netSalesExTaxSen": 100000, "cogsSen": 75000}
    )
    props = data["a2ui"]["props"]

    assert props["contributionSen"] == 25000
    assert props["contributionMarginPctExact"] == "25"
    assert props["isContributionPass"] is True
    assert props["isMarginPctPass"] is True
    assert props["marginSafe"] is True
    assert props["marginStatus"] == "PASS"
    assert data["reasonCode"] == reason_codes.PASS
    assert data["a2ui"]["actions"]
    assert data["a2ui"]["actions"][0]["executed"] is False


def test_margin_blocks_low_contribution_even_when_the_ratio_is_fine(client):
    """Both gates must pass: 25% ratio but only 1000 sen contribution."""
    data = _margin_response(client, {"netSalesExTaxSen": 4000, "cogsSen": 3000})
    props = data["a2ui"]["props"]

    assert props["contributionSen"] == 1000
    assert props["isContributionPass"] is False
    assert props["isMarginPctPass"] is True
    assert props["marginSafe"] is False
    assert data["reasonCode"] == reason_codes.INSUFFICIENT_CASH_MARGIN


def test_margin_without_financial_inputs_reports_a_reason_code(client):
    data = _margin_response(client, {"campaignName": "Kempen Tanpa Input"})
    props = data["a2ui"]["props"]

    assert data["reasonCode"] == reason_codes.MISSING_MARGIN_INPUTS
    assert props["marginSafe"] is None
    assert props["marginStatus"] == "UNAVAILABLE"
    assert props["contributionSen"] is None
    assert data["a2ui"].get("actions", []) == []


def test_margin_evaluator_uses_exact_basis_point_arithmetic():
    """The verdict must never depend on the rounded display value."""
    simulation, _ = margin_input_from_mapping(
        {"netSalesExTaxSen": 100000, "cogsSen": 75004}
    )
    blocked = evaluate_margin_contribution(simulation)
    assert blocked.contributionMarginPct == 25.0
    assert blocked.contributionMarginPctExact == "24.996"
    assert blocked.allowed is False
    assert blocked.minimumMarginBps == 2500

    simulation, _ = margin_input_from_mapping(
        {"netSalesExTaxSen": 100000, "cogsSen": 75000}
    )
    passed = evaluate_margin_contribution(simulation)
    assert passed.allowed is True
    assert passed.contributionSen == 25000
    assert passed.minimumMarginBps == 2500


def test_margin_evaluator_rejects_non_integer_sen():
    with pytest.raises(MarginInputError) as error:
        margin_input_from_mapping(
            {"netSalesExTaxSen": 1000.5, "cogsSen": 100}
        )
    assert error.value.reason_code == reason_codes.INVALID_MARGIN_INPUT

    with pytest.raises(MarginInputError) as error:
        margin_input_from_mapping({"netSalesExTaxSen": 1000})
    assert error.value.reason_code == reason_codes.MISSING_MARGIN_INPUTS


def test_default_minimum_contribution_gate_is_2000_sen():
    assert DEFAULT_MINIMUM_CONTRIBUTION_SEN == 2000


# ---------------------------------------------------------------------------
# Provenance / timestamps
# ---------------------------------------------------------------------------
def test_provenance_timestamp_is_never_frozen(client, platform_store):
    before = datetime.now(timezone.utc)
    body = client.post(
        "/agent/specialists/commerce_reader", json={"message": "katalog"}
    ).json()
    after = datetime.now(timezone.utc)

    raw = body["data"]["a2ui"]["provenance"]["timestamp"]
    stamp = datetime.fromisoformat(raw.replace("Z", "+00:00"))

    assert stamp.tzinfo is not None
    assert before - timedelta(seconds=5) <= stamp <= after + timedelta(seconds=5)
    assert stamp != datetime(2026, 10, 19, 6, 0, 0, tzinfo=timezone.utc)


def test_service_source_contains_no_frozen_timestamps_or_fabricated_values():
    """Guard against the old stub constants coming back."""
    forbidden = [
        "2026-10-19T06:00:00Z",
        "Sambal Colek Klasik, Colek Belacan Ori",
        "totalSkus",
        "calculated_margin = 28.5",
    ]
    for path in SERVICE_ROOT.rglob("*.py"):
        if ".venv" in path.parts:
            continue
        if path.name == "conftest.py" or path.name.startswith("test_"):
            continue
        text = path.read_text(encoding="utf-8")
        for needle in forbidden:
            assert needle not in text, f"{path} still contains {needle!r}"


# ---------------------------------------------------------------------------
# Master agent delegation (CPK-10, Python half)
# ---------------------------------------------------------------------------
def test_master_agent_delegates_to_a_specialist_through_adk(client, platform_store):
    body = client.post(
        "/agent/abangcolek_ops", json={"message": "semak katalog produk"}
    ).json()
    data = body["data"]

    assert data["delegatedBy"] == "abangcolek_ops"
    assert data["delegatedAgent"] == "commerce_reader"
    assert data["a2ui"]["provenance"]["delegatedBy"] == "abangcolek_ops"
    assert data["a2ui"]["props"]["publishedProducts"] == 2
    # The run really went through ADK.
    assert data["adk"]["tool"] == "read_published_catalogue"
    assert data["adk"]["sessionId"]


def test_master_agent_reports_unresolved_intent_instead_of_inventing(client):
    body = client.post(
        "/agent/abangcolek_ops", json={"message": "zxqv plorbn"}
    ).json()
    data = body["data"]

    assert data["status"] == "unavailable"
    assert data["reasonCode"] == reason_codes.NO_TOOL_RESULT
    assert data["a2ui"]["props"]["status"] == "UNRESOLVED"


# ---------------------------------------------------------------------------
# AG-UI stream
# ---------------------------------------------------------------------------
def _parse_sse(payload: str) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    for frame in payload.split("\n\n"):
        frame = frame.strip()
        if not frame:
            continue
        data_lines = [
            line[len("data: ") :]
            for line in frame.splitlines()
            if line.startswith("data: ")
        ]
        if not data_lines:
            continue
        events.append(json.loads("\n".join(data_lines)))
    return events


def test_agui_stream_emits_the_expected_event_sequence(client, platform_store):
    with client.stream(
        "POST",
        "/agent/abangcolek_ops/stream",
        json={"message": "semak katalog produk"},
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        raw = "".join(response.iter_text())

    events = _parse_sse(raw)
    names = [event["type"] for event in events]

    assert names[0] == "RUN_STARTED"
    assert names[-1] == "RUN_FINISHED"
    for expected in (
        "TOOL_CALL_START",
        "TOOL_CALL_ARGS",
        "TOOL_CALL_END",
        "TOOL_CALL_RESULT",
        "TEXT_MESSAGE_START",
        "TEXT_MESSAGE_CONTENT",
        "TEXT_MESSAGE_END",
        "STATE_SNAPSHOT",
    ):
        assert expected in names, f"missing AG-UI event {expected}"

    # The delegation is real: ADK's transfer_to_agent is streamed.
    transfer_starts = [
        event
        for event in events
        if event["type"] == "TOOL_CALL_START"
        and event["tool_call_name"] == "transfer_to_agent"
    ]
    assert transfer_starts, "the master agent must delegate via ADK transfer_to_agent"
    transfer_args = [
        event
        for event in events
        if event["type"] == "TOOL_CALL_ARGS"
        and event["tool_call_id"] == transfer_starts[0]["tool_call_id"]
    ]
    assert transfer_args
    assert "commerce_reader" in transfer_args[0]["delta"]

    # The specialist's real tool call is streamed too.
    tool_calls = [
        event["tool_call_name"]
        for event in events
        if event["type"] == "TOOL_CALL_START"
    ]
    assert "read_published_catalogue" in tool_calls

    # The state snapshot carries the real specialist result.
    snapshot = next(e for e in events if e["type"] == "STATE_SNAPSHOT")
    assert snapshot["snapshot"]["delegatedAgent"] == "commerce_reader"
    assert snapshot["snapshot"]["result"]["publishedProducts"] == 2


def test_agui_stream_of_a_specialist_emits_text_content(client, platform_store):
    with client.stream(
        "POST",
        "/agent/specialists/commerce_reader/stream",
        json={"message": "katalog"},
    ) as response:
        raw = "".join(response.iter_text())

    events = _parse_sse(raw)
    names = [event["type"] for event in events]
    assert names[0] == "RUN_STARTED"
    assert names[-1] == "RUN_FINISHED"
    content = next(e for e in events if e["type"] == "TEXT_MESSAGE_CONTENT")
    assert "2 produk diterbitkan" in content["delta"]
    assert "Sambal Colek Klasik" in content["delta"]
