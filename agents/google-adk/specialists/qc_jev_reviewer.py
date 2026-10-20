"""Google ADK specialist: qc_jev_reviewer.

Deterministic, review-only QC / JEV assessment.

Invariants carried over from the platform contract:
    * Root cause stays `UNDETERMINED` until a supplier-lot review completes.
    * No fabricated confidence score - the field is always `None`.
    * No fabricated receipts: the service never writes, so it never claims a
      complaint was recorded, a quarantine was started or a ledger was verified.

When no matching case or assessment exists in the platform store, the
specialist reports an explicit reason code instead of inventing one.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from google.adk.agents import LlmAgent

from domain import reason_codes
from domain.a2ui import build_card, proposed_action
from domain.platform_store import (
    KIND_CASES,
    KIND_LOTS,
    KIND_QC,
    RECORD_KIND_KEY,
    read_store,
)
from domain.provenance import (
    PERSISTENCE_NONE,
    PERSISTENCE_READ_ONLY,
    PERSISTENCE_UNAVAILABLE,
    build_provenance,
)

AGENT_NAME = "qc_jev_reviewer"
TOOL_NAME = "review_jev_incident"

INSTRUCTION = (
    "Anda adalah specialists qc_jev_reviewer platform AbangColek.\n"
    "Tugas: semak insiden kualiti/JEV secara deterministik dan baca sahaja "
    "berdasarkan rekod sebenar dalam storan platform.\n"
    "Peraturan: punca utama kekal UNDETERMINED sehingga semakan kelompok "
    "pembekal selesai. Jangan menghasilkan skor keyakinan rekaan. Jangan "
    "menganggap aduan direkodkan atau kuarantin dimulakan jika tiada rekod "
    "sebenar - laporkan kod sebab sebenar."
)


def review_jev_incident(
    incident_type: Optional[str] = None,
    order_id: Optional[str] = None,
    case_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Review a quality incident against real platform records (read-only).

    Args:
        incident_type: incident category reported by the operator.
        order_id: optional order identifier used to locate a real case record.
        case_id: optional case identifier used to locate a real case record.

    Returns:
        A dict describing what was actually found, including explicit reason
        codes for anything that could not be established.
    """
    store = read_store(kinds=[KIND_CASES, KIND_QC, KIND_LOTS])
    reported_incident_type = str(incident_type) if incident_type else None

    if not store.available:
        return {
            "available": False,
            "storeAvailable": False,
            "reasonCode": reason_codes.STORE_UNAVAILABLE,
            "detail": store.detail,
            "summary": (
                "Storan platform tidak dapat dicapai; tiada rekod kes boleh "
                "disemak."
            ),
            "evaluationState": "reviewed_local_rules",
            "rootCauseStatus": "UNDETERMINED",
            "case": None,
            "jevAssessment": None,
            "quarantineLots": [],
            "databasePath": store.database_path,
            "readAt": store.read_at,
        }

    cases = [r for r in store.records if r.get(RECORD_KIND_KEY) == KIND_CASES]
    assessments = [r for r in store.records if r.get(RECORD_KIND_KEY) == KIND_QC]
    lots = [r for r in store.records if r.get(RECORD_KIND_KEY) == KIND_LOTS]

    matched_case: Optional[Dict[str, Any]] = None
    match_strategy = "none"

    if case_id:
        matched_case = next(
            (case for case in cases if str(case.get("id", "")) == str(case_id)), None
        )
        match_strategy = "case_id"
    elif order_id:
        matched_case = next(
            (case for case in cases if str(case.get("orderId", "")) == str(order_id)),
            None,
        )
        match_strategy = "order_id"
    else:
        match_strategy = "listing"

    if match_strategy in ("case_id", "order_id") and matched_case is None:
        return {
            "available": False,
            "storeAvailable": True,
            "reasonCode": reason_codes.CASE_RECORD_NOT_FOUND,
            "detail": (
                f"Tiada rekod kes dalam storan platform sepadan dengan "
                f"{'caseId' if match_strategy == 'case_id' else 'orderId'} "
                f"'{case_id if match_strategy == 'case_id' else order_id}'."
            ),
            "summary": (
                "Tiada rekod kes sebenar dijumpai; tiada bukti bahawa sebarang "
                "aduan telah direkodkan."
            ),
            "incidentType": reported_incident_type,
            "evaluationState": "reviewed_local_rules",
            "rootCauseStatus": "UNDETERMINED",
            "case": None,
            "jevAssessment": None,
            "quarantineLots": [],
            "matchStrategy": match_strategy,
            "databasePath": store.database_path,
            "readAt": store.read_at,
        }

    if matched_case is None:
        listed_cases = [
            {
                "id": case.get("id"),
                "orderId": case.get("orderId"),
                "subject": case.get("subject"),
                "status": case.get("status"),
                "createdAt": case.get("createdAt"),
            }
            for case in cases[:20]
        ]
        if not listed_cases:
            return {
                "available": False,
                "storeAvailable": True,
                "reasonCode": reason_codes.CASE_RECORD_NOT_FOUND,
                "detail": "Tiada rekod kes dalam storan platform.",
                "summary": (
                    "Tiada rekod kes sebenar dalam storan platform; tiada "
                    "aduan direkodkan untuk semakan ini."
                ),
                "incidentType": reported_incident_type,
                "evaluationState": "reviewed_local_rules",
                "rootCauseStatus": "UNDETERMINED",
                "case": None,
                "jevAssessment": None,
                "quarantineLots": [],
                "matchStrategy": match_strategy,
                "databasePath": store.database_path,
                "readAt": store.read_at,
            }
        return {
            "available": True,
            "storeAvailable": True,
            "reasonCode": reason_codes.JEV_ASSESSMENT_NOT_FOUND,
            "detail": (
                "Tiada pengenalan kes diberi; senarai kes yang wujud dipaparkan "
                "sebagai maklumat konteks sahaja."
            ),
            "summary": (
                f"{len(listed_cases)} rekod kes wujud dalam storan platform; "
                "semakan bersasar memerlukan pengenalan kes atau pesanan."
            ),
            "incidentType": reported_incident_type,
            "evaluationState": "reviewed_local_rules",
            "rootCauseStatus": "UNDETERMINED",
            "case": None,
            "listedCases": listed_cases,
            "jevAssessment": None,
            "quarantineLots": [],
            "matchStrategy": match_strategy,
            "databasePath": store.database_path,
            "readAt": store.read_at,
        }

    matched_assessment = next(
        (
            assessment
            for assessment in assessments
            if str(assessment.get("caseId", "")) == str(matched_case.get("id", ""))
        ),
        None,
    )
    quarantine_lots = [
        {
            "id": lot.get("id"),
            "productId": lot.get("productId"),
            "batchId": lot.get("batchId"),
            "quantity": lot.get("quantity"),
            "status": lot.get("status"),
        }
        for lot in lots
        if lot.get("status") == "quarantine"
    ]

    reason_code = (
        reason_codes.PASS if matched_assessment else reason_codes.JEV_ASSESSMENT_NOT_FOUND
    )

    return {
        "available": True,
        "storeAvailable": True,
        "reasonCode": reason_code,
        "incidentType": reported_incident_type,
        "detail": (
            None
            if matched_assessment
            else "Tiada rekod penilaian JEV untuk kes ini dalam storan platform."
        ),
        "summary": (
            f"Semakan JEV untuk kes {matched_case.get('id')} selesai berdasarkan "
            "rekod sebenar. Punca utama kekal UNDETERMINED."
        ),
        "evaluationState": "reviewed_local_rules",
        "rootCauseStatus": "UNDETERMINED",
        "case": {
            "id": matched_case.get("id"),
            "orderId": matched_case.get("orderId"),
            "subject": matched_case.get("subject"),
            "status": matched_case.get("status"),
            "createdAt": matched_case.get("createdAt"),
            "description": matched_case.get("description"),
        },
        "jevAssessment": (
            {
                "caseId": matched_assessment.get("caseId"),
                "method": matched_assessment.get("method"),
                "dimensions": matched_assessment.get("dimensions"),
                "evidenceIds": matched_assessment.get("evidenceIds"),
                "unknownReasons": matched_assessment.get("unknownReasons"),
                "assessedAt": matched_assessment.get("assessedAt"),
            }
            if matched_assessment
            else None
        ),
        "quarantineLots": quarantine_lots,
        "matchStrategy": match_strategy,
        "databasePath": store.database_path,
        "readAt": store.read_at,
    }


def build_agent(model: Any) -> LlmAgent:
    """Create the real ADK specialist agent."""
    return LlmAgent(
        name=AGENT_NAME,
        model=model,
        description=(
            "Deterministic review-only QC and JEV assessment agent for the "
            "AbangColek platform. Reads real case, JEV assessment and stock lot "
            "records from the platform store."
        ),
        instruction=INSTRUCTION,
        tools=[review_jev_incident],
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
        persistence = (
            PERSISTENCE_UNAVAILABLE
            if reason_code == reason_codes.STORE_UNAVAILABLE
            else PERSISTENCE_NONE
        )

    provenance = build_provenance(
        source=source,
        agent=AGENT_NAME,
        tool=TOOL_NAME,
        tool_status="completed" if tool_payload else "not_run",
        persistence=persistence,
        detail=payload.get("detail"),
        extra={
            "databasePath": payload.get("databasePath"),
            "readAt": payload.get("readAt"),
            "matchStrategy": payload.get("matchStrategy"),
        },
    )

    props: Dict[str, Any] = {
        "incidentType": payload.get("incidentType") or "unspecified",
        "rootCause": "UNDETERMINED",
        "rootCauseStatus": "UNDETERMINED",
        "recommendedAction": (
            "Semak bukti kualiti kelompok dan rekod pembekal sebelum apa-apa "
            "tindakan kuarantin."
        ),
        "localRulesEnforced": True,
        "confidenceScore": None,
        "reasonCode": reason_code,
        "case": payload.get("case"),
        "jevAssessment": payload.get("jevAssessment"),
        "quarantineLots": payload.get("quarantineLots"),
        "listedCases": payload.get("listedCases"),
        "executedActions": [],
    }

    actions = [
        proposed_action(
            action_id="action-request-evidence",
            label="Minta Bukti Tambahan",
            action_type="recheck",
            payload={"action": "request_evidence"},
        )
    ]

    return {
        "status": "success" if store_available else "unavailable",
        "specialist": AGENT_NAME,
        "evaluationState": "reviewed_local_rules",
        "rootCauseStatus": "UNDETERMINED",
        "schemaVersion": "a2ui.v1",
        "reasonCode": reason_code,
        "a2ui": build_card(
            component="JevAssessmentCard",
            props=props,
            provenance=provenance,
            actions=actions,
        ),
        "reply": payload.get("summary")
        or "Semakan JEV selesai; tiada rekod sebenar diperoleh.",
    }


__all__ = [
    "AGENT_NAME",
    "TOOL_NAME",
    "INSTRUCTION",
    "review_jev_incident",
    "build_agent",
    "build_result",
]
