"""AbangColek Google ADK agent service (FastAPI).

Authority: Blueprint v2.3 & ADR-0003.
Default bind: 127.0.0.1:8030.

This service is a genuine Google ADK runtime:

    * agents   -> `google.adk.agents.LlmAgent` (master + 3 specialists)
    * runner   -> `google.adk.runners.Runner`
    * sessions -> `google.adk.sessions.InMemorySessionService`
    * model    -> `google.adk.models.base_llm.BaseLlm`
    * AG-UI    -> `ag_ui_adk.EventTranslator` (ag-ui-adk)

Design rules enforced here:
    * No fabricated domain values. A specialist that cannot reach a real
      evaluator or a real record reports a machine-readable reason code.
    * No frozen timestamps. Every provenance timestamp is the emission time.
    * Honest self-description. `/health` reports the runtime it actually
      imported, not the runtime it wishes it had.
"""

from __future__ import annotations

import os
import sys
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

_SERVICE_ROOT = os.path.dirname(os.path.abspath(__file__))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

import agui as agui_module  # noqa: E402
import runtime as adk_runtime  # noqa: E402
from domain import reason_codes  # noqa: E402
from domain.provenance import build_provenance, utc_now_iso  # noqa: E402

SERVICE_VERSION = "2.3.0"
SERVICE_HOST = "127.0.0.1"
SERVICE_PORT = 8030
SCHEMA_VERSION = "a2ui.v1"

SPECIALIST_MODULES = adk_runtime.SPECIALIST_MODULES

app = FastAPI(
    title="AbangColek Google ADK Agent Service",
    description=(
        "Python 3.12 Google ADK agent service for AbangColek Platform with "
        "AG-UI event streaming."
    ),
    version=SERVICE_VERSION,
)

#: The single ADK runtime used by every request.
RUNTIME: "adk_runtime.AdkRuntime" = adk_runtime.build_runtime()


class AgentRequest(BaseModel):
    """Request envelope accepted by every agent endpoint."""

    message: Optional[str] = None
    query: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    stream: Optional[bool] = False


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _runtime_or_503() -> "adk_runtime.AdkRuntime":
    if not RUNTIME.available:
        raise HTTPException(
            status_code=503,
            detail={
                "ok": False,
                "reasonCode": reason_codes.ADK_RUNTIME_UNAVAILABLE,
                "message": "Google ADK runtime tidak importable.",
                "importError": RUNTIME.info.import_error,
            },
        )
    return RUNTIME


def _request_text(request: AgentRequest) -> str:
    return str(request.message or request.query or "").strip()


def _request_payload(request: AgentRequest) -> Dict[str, Any]:
    payload = request.payload
    resolved: Dict[str, Any] = dict(payload) if isinstance(payload, dict) else {}
    # The operator's free text is the query the specialists work from.
    if not resolved.get("query"):
        text = _request_text(request)
        if text:
            resolved["query"] = text
    return resolved


def _unresolved_response(run: "adk_runtime.AgentRun") -> Dict[str, Any]:
    """Response for a run that produced no specialist result."""
    reason_code = run.reason_code or reason_codes.INTENT_UNRESOLVED
    provenance = build_provenance(
        source="unavailable",
        agent="abangcolek_ops",
        tool=None,
        tool_status="not_run",
        persistence="none",
        detail=run.error or "Tiada specialists dapat dikenal pasti daripada permintaan.",
    )
    return {
        "status": "unavailable",
        "specialist": "abangcolek_ops",
        "schemaVersion": SCHEMA_VERSION,
        "reasonCode": reason_code,
        "a2ui": {
            "schemaVersion": SCHEMA_VERSION,
            "component": "OperationsBriefCard",
            "props": {
                "title": "AbangColek Master Operations Briefing",
                "summary": (
                    "Permintaan ini tidak boleh diarahkan kepada specialists "
                    "sedia ada. Tiada kandungan uri yang dibuang."
                ),
                "status": "UNRESOLVED",
                "reasonCode": reason_code,
            },
            "provenance": provenance,
        },
        "reply": run.text
        or "Tiada arah operasi boleh dikenal pasti daripada permintaan ini.",
    }


def _specialist_response(
    run: "adk_runtime.AgentRun", payload: Dict[str, Any]
) -> Dict[str, Any]:
    """Build the specialist response, preserving real provenance."""
    if not run.ok or run.delegated_agent is None:
        return _unresolved_response(run)
    module = SPECIALIST_MODULES[run.delegated_agent]
    data = module.build_result(run.tool_payload, payload)
    data["delegatedAgent"] = run.delegated_agent
    data["adk"] = {
        "agent": run.delegated_agent,
        "tool": run.tool_name,
        "sessionId": run.session_id,
        "runStatus": "ok",
    }
    return data


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@app.get("/health")
def health() -> JSONResponse:
    """Truthful health payload.

    The runtime string is derived from a live import probe; it is never a
    hardcoded claim.
    """
    runtime_info = adk_runtime.probe_adk_runtime()
    model_info = adk_runtime.probe_model_readiness()

    runtime_available = runtime_info.available and RUNTIME.available
    payload: Dict[str, Any] = {
        "status": "ok" if runtime_available else "degraded",
        "service": "abangcolek-google-adk-agent-service",
        "version": SERVICE_VERSION,
        "port": SERVICE_PORT,
        "host": SERVICE_HOST,
        "runtime": "google-adk" if runtime_available else "unavailable",
        "runtimeAvailable": runtime_available,
        "runtimeDetails": runtime_info.as_dict(),
        "model": model_info,
        "specialists": list(SPECIALIST_MODULES.keys()),
        "agents": ["abangcolek_ops"] + list(SPECIALIST_MODULES.keys()),
        "aguiEvents": list(agui_module.EMITTED_EVENT_NAMES),
        "schemaVersion": SCHEMA_VERSION,
        "zeroPaidSpend": True,
        "persistence": "read_only",
        "checkedAt": utc_now_iso(),
    }
    return JSONResponse(content=payload)


@app.get("/agents")
def list_agents() -> JSONResponse:
    """Describe the ADK agents, their tools and the AG-UI event vocabulary."""
    agents_payload = []
    for agent_name, module in SPECIALIST_MODULES.items():
        agents_payload.append(
            {
                "name": agent_name,
                "tool": module.TOOL_NAME,
                "instruction": module.INSTRUCTION,
                "endpoint": f"/agent/specialists/{agent_name}",
                "streamEndpoint": f"/agent/specialists/{agent_name}/stream",
            }
        )
    return JSONResponse(
        content={
            "ok": True,
            "master": {
                "name": "abangcolek_ops",
                "endpoint": "/agent/abangcolek_ops",
                "streamEndpoint": "/agent/abangcolek_ops/stream",
                "subAgents": list(SPECIALIST_MODULES.keys()),
            },
            "specialists": agents_payload,
            "aguiEvents": list(agui_module.EMITTED_EVENT_NAMES),
        }
    )


@app.post("/agent/specialists/{specialist_name}")
async def handle_specialist(specialist_name: str, request: AgentRequest):
    """Run a single specialist agent through the real ADK runner."""
    runtime = _runtime_or_503()
    if specialist_name not in SPECIALIST_MODULES:
        raise HTTPException(
            status_code=404,
            detail={
                "ok": False,
                "reasonCode": reason_codes.INTENT_UNRESOLVED,
                "message": f"Specialist '{specialist_name}' tidak dikenali.",
            },
        )

    text = _request_text(request)
    payload = _request_payload(request)
    run = await adk_runtime.run_agent(runtime, specialist_name, text, payload)
    data = _specialist_response(run, payload)
    return JSONResponse(content={"ok": True, "data": data})


@app.post("/agent/abangcolek_ops")
async def handle_master(request: AgentRequest):
    """Run the master agent; ADK performs the real sub-agent delegation."""
    runtime = _runtime_or_503()
    text = _request_text(request)
    payload = _request_payload(request)

    run = await adk_runtime.run_agent(runtime, "abangcolek_ops", text, payload)
    data = _specialist_response(run, payload)
    data["delegatedBy"] = "abangcolek_ops"
    provenance = data.get("a2ui", {}).get("provenance")
    if isinstance(provenance, dict):
        provenance["delegatedBy"] = "abangcolek_ops"
    return JSONResponse(content={"ok": True, "data": data})


@app.post("/agent/specialists/{specialist_name}/stream")
async def stream_specialist(specialist_name: str, request: AgentRequest):
    """Stream AG-UI events for a single specialist agent."""
    runtime = _runtime_or_503()
    if specialist_name not in SPECIALIST_MODULES:
        raise HTTPException(
            status_code=404,
            detail={
                "ok": False,
                "reasonCode": reason_codes.INTENT_UNRESOLVED,
                "message": f"Specialist '{specialist_name}' tidak dikenali.",
            },
        )
    return _streaming_response(runtime, specialist_name, request)


@app.post("/agent/abangcolek_ops/stream")
async def stream_master(request: AgentRequest):
    """Stream AG-UI events for the master agent and its delegated specialist."""
    runtime = _runtime_or_503()
    return _streaming_response(runtime, "abangcolek_ops", request)


def _streaming_response(
    runtime: "adk_runtime.AdkRuntime",
    agent_name: str,
    request: AgentRequest,
) -> StreamingResponse:
    text = _request_text(request)
    payload = _request_payload(request)
    requested_thread = payload.get("threadId")
    thread_id = str(requested_thread) if requested_thread else f"thread-{uuid.uuid4().hex}"
    run_id = f"run-{uuid.uuid4().hex}"

    async def event_stream() -> AsyncIterator[str]:
        async for event in agui_module.agui_run_events(
            runtime, agent_name, text, payload, thread_id, run_id
        ):
            yield agui_module.sse_frame(event)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-AG-UI-Run-Id": run_id,
            "X-AG-UI-Thread-Id": thread_id,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=SERVICE_HOST, port=SERVICE_PORT)
