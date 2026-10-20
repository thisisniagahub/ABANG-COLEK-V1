"""Deterministic local policy model for the AbangColek ADK service.

`LocalPolicyLlm` is a genuine `google.adk.models.base_llm.BaseLlm`
implementation. ADK calls it exactly as it would call a remote LLM, and the
agent loop, tool execution and sub-agent transfer are performed entirely by
ADK.

Why a local policy model instead of a hosted LLM?
    The AbangColek platform runs on a zero-paid-spend policy. Unless explicit
    model credentials are configured, no remote model is reachable, so the
    service must NOT pretend one exists. `LocalPolicyLlm` is deterministic,
    offline and honestly reported as `kind: "local_policy"` with
    `live: false` in the health payload.

When credentials *are* configured the runtime swaps in a real Gemini model
(see `runtime.resolve_model`), and the same ADK agents are reused unchanged.
"""

from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types

from domain import intent as intent_rules

#: Model id reported by the health endpoint for the local policy model.
LOCAL_POLICY_MODEL_ID = "abangcolek-policy-v1"

#: Roles the policy model can play.
ROLE_MASTER = "master"
ROLE_SPECIALIST = "specialist"


def _try_json(text: str) -> Optional[Any]:
    stripped = text.strip()
    if not stripped or stripped[0] not in "{[":
        return None
    try:
        return json.loads(stripped)
    except ValueError:
        return None


class _RequestContext:
    """Everything the policy needs from an ADK `LlmRequest`."""

    def __init__(self) -> None:
        self.user_text: str = ""
        self.payload: Optional[Dict[str, Any]] = None
        self.last_function_name: Optional[str] = None
        self.last_function_response: Optional[Any] = None
        self.function_responses: List[Tuple[str, Any]] = []


def _extract_context(llm_request: LlmRequest) -> _RequestContext:
    context = _RequestContext()
    text_parts: List[str] = []
    for content in llm_request.contents or []:
        role = getattr(content, "role", None)
        for part in content.parts or []:
            function_response = getattr(part, "function_response", None)
            if function_response is not None:
                context.last_function_name = function_response.name
                context.last_function_response = function_response.response
                context.function_responses.append(
                    (function_response.name, function_response.response)
                )
                continue
            if getattr(part, "function_call", None) is not None:
                continue
            text = getattr(part, "text", None)
            if not text:
                continue
            if context.payload is None and role == "user":
                parsed = _try_json(text)
                if isinstance(parsed, dict):
                    context.payload = parsed
                    continue
            if role == "user":
                text_parts.append(text)
    context.user_text = "\n".join(text_parts).strip()
    return context


def _payload_get(payload: Optional[Dict[str, Any]], *keys: str) -> Optional[Any]:
    if not payload:
        return None
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return None


class LocalPolicyLlm(BaseLlm):
    """A deterministic ADK model that plans specialist tool calls.

    The master agent plans a `transfer_to_agent` call; each specialist agent
    plans its own tool call and then summarises the tool result. ADK performs
    the transfer, the tool execution and the event stream.
    """

    model: str = LOCAL_POLICY_MODEL_ID
    agent_name: str = ""
    role: str = ROLE_SPECIALIST
    tool_name: str = ""
    sub_agent_names: List[str] = []
    tool_argument_map: Dict[str, str] = {}

    # -- ADK model interface -------------------------------------------------
    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        context = _extract_context(llm_request)
        if self.role == ROLE_MASTER:
            response = self._plan_master(context)
        else:
            response = self._plan_specialist(context)
        yield response

    # -- planning ------------------------------------------------------------
    def _plan_master(self, context: _RequestContext) -> LlmResponse:
        if context.last_function_name is None:
            target = self._resolve_target(context)
            if target is None:
                return self._text(
                    "Tiada arah operasi boleh dikenal pasti daripada permintaan ini."
                )
            return self._function_call(
                "transfer_to_agent", {"agent_name": target}
            )
        return self._text(self._summarise(context))

    def _plan_specialist(self, context: _RequestContext) -> LlmResponse:
        if context.last_function_name == self.tool_name:
            return self._text(self._summarise(context))
        return self._function_call(self.tool_name, self._tool_arguments(context))

    def _resolve_target(self, context: _RequestContext) -> Optional[str]:
        explicit = _payload_get(context.payload, "intent", "specialist", "targetAgent")
        if isinstance(explicit, str) and explicit in self.sub_agent_names:
            return explicit
        decided = intent_rules.classify(context.user_text)
        if decided.resolved and decided.specialist in self.sub_agent_names:
            return decided.specialist
        return None

    def _tool_arguments(self, context: _RequestContext) -> Dict[str, Any]:
        payload = context.payload or {}
        arguments: Dict[str, Any] = {}
        for tool_argument, payload_key in self.tool_argument_map.items():
            value = _payload_get(payload, payload_key)
            if value is not None:
                arguments[tool_argument] = value
        return arguments

    # -- response helpers ----------------------------------------------------
    def _function_call(self, name: str, arguments: Dict[str, Any]) -> LlmResponse:
        call = types.FunctionCall(id=f"{self.agent_name or 'adk'}-fc", name=name, args=arguments)
        return LlmResponse(content=types.Content(role="model", parts=[types.Part(function_call=call)]))

    def _text(self, text: str) -> LlmResponse:
        return LlmResponse(content=types.Content(role="model", parts=[types.Part(text=text)]))

    def _summarise(self, context: _RequestContext) -> str:
        """Summarise the last tool result - never invent content."""
        payload = context.last_function_response
        if isinstance(payload, dict) and payload.get("reasonCode"):
            return str(payload.get("summary") or payload.get("reasonCode"))
        if isinstance(payload, dict):
            return str(payload.get("summary") or payload.get("reasonCode") or "Siap.")
        return "Siap."


__all__ = ["LOCAL_POLICY_MODEL_ID", "ROLE_MASTER", "ROLE_SPECIALIST", "LocalPolicyLlm"]
