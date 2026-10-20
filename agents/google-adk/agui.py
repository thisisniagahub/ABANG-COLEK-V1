"""AG-UI event emission for the AbangColek ADK agent service.

The AG-UI protocol events are produced by the real `ag-ui-adk` integration
(`ag_ui_adk.EventTranslator`), which translates Google ADK events into AG-UI
protocol events. This module adds the run-level envelope events (RUN_STARTED,
STATE_SNAPSHOT, RUN_FINISHED / RUN_ERROR) and renders them as SSE.

Event names emitted by the streaming endpoint:

    RUN_STARTED
    TOOL_CALL_START
    TOOL_CALL_ARGS
    TOOL_CALL_END
    TOOL_CALL_RESULT
    TEXT_MESSAGE_START
    TEXT_MESSAGE_CONTENT
    TEXT_MESSAGE_END
    STATE_SNAPSHOT
    STATE_DELTA          (only when the ADK event carries a state delta)
    RUN_FINISHED
    RUN_ERROR            (only when the run fails)
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, AsyncIterator, Dict, List, Optional

_SERVICE_ROOT = os.path.dirname(os.path.abspath(__file__))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from ag_ui.core import (  # type: ignore[import-not-found]
    BaseEvent,
    RunErrorEvent,
    RunFinishedEvent,
    RunStartedEvent,
    StateDeltaEvent,
    StateSnapshotEvent,
)
from ag_ui_adk import EventTranslator  # type: ignore[import-not-found]

import runtime as adk_runtime
from domain.provenance import utc_now_iso

#: The AG-UI event names this service can emit.
EMITTED_EVENT_NAMES = (
    "RUN_STARTED",
    "TOOL_CALL_START",
    "TOOL_CALL_ARGS",
    "TOOL_CALL_END",
    "TOOL_CALL_RESULT",
    "TEXT_MESSAGE_START",
    "TEXT_MESSAGE_CONTENT",
    "TEXT_MESSAGE_END",
    "STATE_SNAPSHOT",
    "STATE_DELTA",
    "RUN_FINISHED",
    "RUN_ERROR",
)


def event_type(event: BaseEvent) -> str:
    """Return the AG-UI event type string."""
    value = getattr(event, "type", None)
    if value is None:
        return "UNKNOWN"
    return getattr(value, "value", value)


def serialise(event: BaseEvent) -> Dict[str, Any]:
    """Serialise an AG-UI event to a JSON-compatible dict."""
    if hasattr(event, "model_dump"):
        return event.model_dump(mode="json", exclude_none=True)
    return dict(event)


def sse_frame(event: BaseEvent) -> str:
    """Render one AG-UI event as an SSE frame."""
    payload = json.dumps(serialise(event), ensure_ascii=False)
    return f"event: {event_type(event)}\ndata: {payload}\n\n"


async def agui_run_events(
    runtime: "adk_runtime.AdkRuntime",
    agent_name: str,
    user_text: str,
    payload: Optional[Dict[str, Any]],
    thread_id: str,
    run_id: str,
) -> AsyncIterator[BaseEvent]:
    """Execute an ADK run and translate it into AG-UI protocol events."""
    yield RunStartedEvent(thread_id=thread_id, run_id=run_id)

    translator = EventTranslator()
    snapshot: Dict[str, Any] = {}
    delegated_agent: Optional[str] = None
    tool_payload: Optional[Dict[str, Any]] = None

    try:
        async for adk_event in adk_runtime.iter_agent_events(
            runtime, agent_name, user_text, payload
        ):
            captured_agent, captured_payload = _capture_tool_result(adk_event)
            if captured_agent:
                delegated_agent = captured_agent
                tool_payload = captured_payload

            translated: List[BaseEvent] = []
            async for agui_event in translator.translate(adk_event, thread_id, run_id):
                translated.append(agui_event)
                if event_type(agui_event) == "STATE_DELTA":
                    delta = getattr(agui_event, "delta", None)
                    if isinstance(delta, dict):
                        snapshot.update(delta)
                yield agui_event

            state_delta = getattr(
                getattr(adk_event, "actions", None), "state_delta", None
            )
            if state_delta and not any(
                event_type(item) == "STATE_DELTA" for item in translated
            ):
                snapshot.update(state_delta)
                yield StateDeltaEvent(delta=state_delta)
    except Exception as error:  # pragma: no cover - defensive
        yield RunErrorEvent(message=f"{error.__class__.__name__}: {error}")
        return

    yield StateSnapshotEvent(
        snapshot={
            "agent": agent_name,
            "delegatedAgent": delegated_agent,
            "result": tool_payload,
            **snapshot,
        }
    )

    yield RunFinishedEvent(
        thread_id=thread_id,
        run_id=run_id,
        result={
            "agent": agent_name,
            "delegatedAgent": delegated_agent,
            "emittedAt": utc_now_iso(),
        },
    )


def _capture_tool_result(
    adk_event: Any,
) -> "tuple[Optional[str], Optional[Dict[str, Any]]]":
    """Return the specialist name and payload of a real tool result, if any."""
    content = getattr(adk_event, "content", None)
    if content is None:
        return None, None
    for part in getattr(content, "parts", None) or []:
        function_response = getattr(part, "function_response", None)
        if function_response is None:
            continue
        if function_response.name in adk_runtime.TOOL_TO_SPECIALIST:
            payload = function_response.response
            return (
                adk_runtime.TOOL_TO_SPECIALIST[function_response.name],
                payload if isinstance(payload, dict) else None,
            )
    return None, None


__all__ = [
    "EMITTED_EVENT_NAMES",
    "event_type",
    "serialise",
    "sse_frame",
    "agui_run_events",
]
