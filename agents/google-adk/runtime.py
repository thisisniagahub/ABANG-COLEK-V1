"""Google ADK runtime for the AbangColek agent service.

This module owns everything that is genuinely Google ADK:

    * `google.adk.agents.LlmAgent` for the master agent and all three
      specialists (real sub-agent delegation).
    * `google.adk.runners.Runner` to execute runs.
    * `google.adk.sessions.InMemorySessionService` as the real session service.
    * `google.adk.models.base_llm.BaseLlm` - either the deterministic local
      policy model or a real Gemini model when credentials are configured.

Everything reported by `/health` is derived from a live probe of these
imports; nothing is asserted from a hardcoded string.
"""

from __future__ import annotations

import json
import os
import platform
import sys
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

_SERVICE_ROOT = os.path.dirname(os.path.abspath(__file__))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from domain import reason_codes
from policy_model import LOCAL_POLICY_MODEL_ID, ROLE_MASTER, ROLE_SPECIALIST, LocalPolicyLlm
from specialists import commerce_reader, marketing_drafter, qc_jev_reviewer

APP_NAME = "abangcolek-ops"

SPECIALIST_MODULES = {
    commerce_reader.AGENT_NAME: commerce_reader,
    qc_jev_reviewer.AGENT_NAME: qc_jev_reviewer,
    marketing_drafter.AGENT_NAME: marketing_drafter,
}

#: Maps an ADK tool name to the specialist that owns it.
TOOL_TO_SPECIALIST: Dict[str, str] = {
    module.TOOL_NAME: agent_name for agent_name, module in SPECIALIST_MODULES.items()
}


# --------------------------------------------------------------------------
# Runtime probing
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class AdkRuntimeInfo:
    """Truthful description of the imported Google ADK runtime."""

    available: bool
    version: Optional[str]
    module_path: Optional[str]
    import_error: Optional[str]
    python_version: str
    fastapi_version: Optional[str]

    def as_dict(self) -> Dict[str, Any]:
        return {
            "available": self.available,
            "version": self.version,
            "modulePath": self.module_path,
            "importError": self.import_error,
            "pythonVersion": self.python_version,
            "fastapiVersion": self.fastapi_version,
        }


def probe_adk_runtime() -> AdkRuntimeInfo:
    """Import `google.adk` for real and report what was found.

    This function never guesses. If the import fails the error is reported.
    """
    fastapi_version: Optional[str]
    try:
        import fastapi

        fastapi_version = getattr(fastapi, "__version__", None)
    except Exception:  # pragma: no cover - fastapi is a hard dependency
        fastapi_version = None

    try:
        import google.adk as google_adk
    except Exception as error:  # pragma: no cover - exercised via monkeypatch
        return AdkRuntimeInfo(
            available=False,
            version=None,
            module_path=None,
            import_error=f"{error.__class__.__name__}: {error}",
            python_version=platform.python_version(),
            fastapi_version=fastapi_version,
        )

    return AdkRuntimeInfo(
        available=True,
        version=getattr(google_adk, "__version__", None),
        module_path=getattr(google_adk, "__file__", None),
        import_error=None,
        python_version=platform.python_version(),
        fastapi_version=fastapi_version,
    )


#: Credential env vars in priority order.
#:
#: `ABANGCOLEK_ADK_API_KEY` wins outright. Otherwise `GEMINI_API_KEY` is
#: preferred over `GOOGLE_API_KEY` because `google.adk` resolves
#: `GOOGLE_API_KEY` first (see `google/adk/utils/_gcp_metadata.py`), and on
#: this machine `GOOGLE_API_KEY` is present but rejected by the API
#: (HTTP 403 "Your project has been denied access") while `GEMINI_API_KEY`
#: works. Preferring `GEMINI_API_KEY` avoids handing the runtime a key that
#: cannot authenticate.
CREDENTIAL_ENV_VARS = (
    "ABANGCOLEK_ADK_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
)


def _resolve_credential() -> "tuple[Optional[str], Optional[str]]":
    """Return (api_key, source_env_var) without ever echoing the secret."""
    for name in CREDENTIAL_ENV_VARS:
        value = (os.environ.get(name) or "").strip()
        if value:
            return value, name
    return None, None


def probe_model_readiness() -> Dict[str, Any]:
    """Report model/provider readiness truthfully.

    The service only claims a live remote model when credentials are present
    AND a model instance could be constructed. Even then, liveness is not
    claimed until a real call has succeeded, which the local policy model
    never will do.
    """
    api_key, credential_source = _resolve_credential()
    credentials_present = api_key is not None
    configured_model = (os.environ.get("ABANGCOLEK_ADK_MODEL") or "").strip()

    if credentials_present and configured_model:
        try:
            from google.adk.models.google_llm import Gemini

            Gemini(model=configured_model, client_kwargs={"api_key": api_key})
            return {
                "kind": "gemini",
                "provider": "google",
                "model": configured_model,
                "credentialsConfigured": True,
                "credentialSource": credential_source,
                "live": False,
                "reason": (
                    "Model dikonfigurasi dan instance berjaya dibina, tetapi "
                    "liveness BELUM disahkan - probe kesihatan tidak membuat "
                    "panggilan model sebenar."
                ),
            }
        except Exception as error:
            return {
                "kind": "unavailable",
                "provider": "google",
                "model": configured_model,
                "credentialsConfigured": True,
                "credentialSource": credential_source,
                "live": False,
                "reason": f"{error.__class__.__name__}: {error}",
            }

    return {
        "kind": "local_policy",
        "provider": "local",
        "model": LOCAL_POLICY_MODEL_ID,
        "credentialsConfigured": credentials_present,
        "credentialSource": credential_source,
        "live": False,
        "reason": (
            "Tiada model hos dikonfigurasi (ABANGCOLEK_ADK_MODEL tidak ditetapkan); "
            "model dasar deterministik tempatan digunakan. Ini BUKAN model bahasa hos "
            "dan tidak diklaim sebagai model live."
        ),
    }


# --------------------------------------------------------------------------
# Runtime construction
# --------------------------------------------------------------------------
@dataclass
class AgentRun:
    """The result of one ADK run."""

    ok: bool
    reason_code: Optional[str]
    delegated_agent: Optional[str]
    tool_name: Optional[str]
    tool_payload: Optional[Dict[str, Any]]
    text: Optional[str]
    events: List[Any] = field(default_factory=list)
    error: Optional[str] = None
    session_id: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "ok": self.ok,
            "reasonCode": self.reason_code,
            "delegatedAgent": self.delegated_agent,
            "toolName": self.tool_name,
            "toolPayload": self.tool_payload,
            "text": self.text,
            "error": self.error,
            "sessionId": self.session_id,
        }


@dataclass
class AdkRuntime:
    """Holds the constructed ADK objects."""

    info: AdkRuntimeInfo
    session_service: Any
    agents: Dict[str, Any]
    master: Any
    model_info: Dict[str, Any]
    last_session_id: Optional[str] = None

    @property
    def available(self) -> bool:
        return self.info.available


def _gemini_model() -> Optional[Any]:
    """Return a real Gemini model when credentials are configured."""
    api_key, _ = _resolve_credential()
    configured_model = (os.environ.get("ABANGCOLEK_ADK_MODEL") or "").strip()
    if not api_key or not configured_model:
        return None
    try:
        from google.adk.models.google_llm import Gemini

        return Gemini(model=configured_model, client_kwargs={"api_key": api_key})
    except Exception:
        return None


def _local_policy_model(
    *,
    agent_name: str,
    role: str,
    tool_name: str = "",
    sub_agent_names: Optional[List[str]] = None,
    tool_argument_map: Optional[Dict[str, str]] = None,
) -> LocalPolicyLlm:
    return LocalPolicyLlm(
        model=LOCAL_POLICY_MODEL_ID,
        agent_name=agent_name,
        role=role,
        tool_name=tool_name,
        sub_agent_names=sub_agent_names or [],
        tool_argument_map=tool_argument_map or {},
    )


#: Payload keys each specialist tool accepts, mapped from the request payload.
_TOOL_ARGUMENT_MAPS: Dict[str, Dict[str, str]] = {
    commerce_reader.AGENT_NAME: {"query": "query"},
    qc_jev_reviewer.AGENT_NAME: {
        "incident_type": "incidentType",
        "order_id": "orderId",
        "case_id": "caseId",
    },
    marketing_drafter.AGENT_NAME: {
        "net_sales_ex_tax_sen": "netSalesExTaxSen",
        "cogs_sen": "cogsSen",
        "packaging_sen": "packagingSen",
        "payment_fees_sen": "paymentFeesSen",
        "fulfilment_variable_cost_sen": "fulfilmentVariableCostSen",
        "delivery_subsidy_sen": "deliverySubsidySen",
        "agent_commission_sen": "agentCommissionSen",
        "reward_cost_sen": "rewardCostSen",
        "expected_return_loss_sen": "expectedReturnLossSen",
        "minimum_contribution_sen": "minimumContributionSen",
        "minimum_contribution_margin_pct": "minimumContributionMarginPct",
    },
}


def build_runtime() -> AdkRuntime:
    """Construct the ADK runtime (agents, session service, master agent)."""
    info = probe_adk_runtime()
    model_info = probe_model_readiness()

    if not info.available:
        return AdkRuntime(
            info=info,
            session_service=None,
            agents={},
            master=None,
            model_info=model_info,
        )

    from google.adk.agents import LlmAgent
    from google.adk.sessions import InMemorySessionService

    gemini = _gemini_model()
    agents: Dict[str, Any] = {}

    for agent_name, module in SPECIALIST_MODULES.items():
        if gemini is not None:
            model = gemini
        else:
            model = _local_policy_model(
                agent_name=agent_name,
                role=ROLE_SPECIALIST,
                tool_name=module.TOOL_NAME,
                tool_argument_map=_TOOL_ARGUMENT_MAPS.get(agent_name, {}),
            )
        agents[agent_name] = module.build_agent(model)

    if gemini is not None:
        master_model = gemini
    else:
        master_model = _local_policy_model(
            agent_name="abangcolek_ops",
            role=ROLE_MASTER,
            sub_agent_names=list(SPECIALIST_MODULES.keys()),
        )

    master = LlmAgent(
        name="abangcolek_ops",
        model=master_model,
        description=(
            "Master operations agent for the AbangColek platform. Delegates to "
            "the commerce_reader, qc_jev_reviewer and marketing_drafter "
            "specialists."
        ),
        instruction=(
            "Anda adalah agent induk operasi AbangColek.\n"
            "Tugas: tentukan specialists yang betul dan serahkan melalui "
            "mekanisme pemindahan ADK. Jangan meramal atau mengarang "
            "kandungan; specialists akan melaporkan kod sebab sebenar."
        ),
        sub_agents=[agents[name] for name in SPECIALIST_MODULES],
    )

    return AdkRuntime(
        info=info,
        session_service=InMemorySessionService(),
        agents=agents,
        master=master,
        model_info=model_info,
    )


# --------------------------------------------------------------------------
# Execution
# --------------------------------------------------------------------------
def _user_content(user_text: str, payload: Optional[Dict[str, Any]]):
    from google.genai import types

    parts = [types.Part(text=user_text or "")]
    if payload:
        parts.append(types.Part(text=json.dumps(payload, ensure_ascii=False, sort_keys=True)))
    return types.Content(role="user", parts=parts)


def _collect_run(events: List[Any]) -> Tuple[Optional[str], Optional[str], Optional[Dict[str, Any]], Optional[str]]:
    """Extract (specialist, tool_name, tool_payload, text) from ADK events."""
    delegated_agent: Optional[str] = None
    tool_name: Optional[str] = None
    tool_payload: Optional[Dict[str, Any]] = None
    text: Optional[str] = None

    for event in events:
        content = getattr(event, "content", None)
        if content is None:
            continue
        for part in getattr(content, "parts", None) or []:
            function_response = getattr(part, "function_response", None)
            if function_response is not None:
                name = function_response.name
                if name in TOOL_TO_SPECIALIST:
                    delegated_agent = TOOL_TO_SPECIALIST[name]
                    tool_name = name
                    payload = function_response.response
                    if isinstance(payload, dict):
                        tool_payload = payload
                continue
            part_text = getattr(part, "text", None)
            if part_text:
                text = part_text

    return delegated_agent, tool_name, tool_payload, text


async def iter_agent_events(
    runtime: AdkRuntime,
    agent_name: str,
    user_text: str,
    payload: Optional[Dict[str, Any]] = None,
) -> "AsyncIterator[Any]":
    """Yield ADK events live for the requested agent.

    This is the streaming entry point: AG-UI translation happens per event,
    exactly as it would with a hosted model.
    """
    if not runtime.available or runtime.session_service is None:
        raise RuntimeError(runtime.info.import_error or "Google ADK runtime unavailable.")

    from google.adk.runners import Runner

    if agent_name == "abangcolek_ops":
        agent = runtime.master
    else:
        agent = runtime.agents.get(agent_name)
    if agent is None:
        raise KeyError(f"Unknown agent '{agent_name}'.")

    session_id = f"abangcolek-{uuid.uuid4().hex}"
    runner = Runner(
        agent=agent,
        app_name=APP_NAME,
        session_service=runtime.session_service,
    )

    await runtime.session_service.create_session(
        app_name=APP_NAME,
        user_id="abangcolek-ops",
        session_id=session_id,
    )
    runtime.last_session_id = session_id

    async for event in runner.run_async(
        user_id="abangcolek-ops",
        session_id=session_id,
        new_message=_user_content(user_text, payload),
    ):
        yield event


async def run_agent(
    runtime: AdkRuntime,
    agent_name: str,
    user_text: str,
    payload: Optional[Dict[str, Any]] = None,
) -> AgentRun:
    """Execute one ADK run against the requested agent and collect the result."""
    if not runtime.available or runtime.session_service is None:
        return AgentRun(
            ok=False,
            reason_code=reason_codes.ADK_RUNTIME_UNAVAILABLE,
            delegated_agent=None,
            tool_name=None,
            tool_payload=None,
            text=None,
            error=runtime.info.import_error,
        )

    events: List[Any] = []
    try:
        async for event in iter_agent_events(runtime, agent_name, user_text, payload):
            events.append(event)
    except KeyError as error:
        return AgentRun(
            ok=False,
            reason_code=reason_codes.INTENT_UNRESOLVED,
            delegated_agent=None,
            tool_name=None,
            tool_payload=None,
            text=None,
            error=str(error),
            events=events,
        )
    except Exception as error:
        return AgentRun(
            ok=False,
            reason_code=reason_codes.ADK_RUNTIME_UNAVAILABLE,
            delegated_agent=None,
            tool_name=None,
            tool_payload=None,
            text=None,
            error=f"{error.__class__.__name__}: {error}",
            events=events,
            session_id=runtime.last_session_id,
        )

    delegated_agent, tool_name, tool_payload, text = _collect_run(events)

    if tool_payload is None:
        return AgentRun(
            ok=False,
            reason_code=reason_codes.NO_TOOL_RESULT,
            delegated_agent=delegated_agent,
            tool_name=tool_name,
            tool_payload=None,
            text=text,
            events=events,
            session_id=runtime.last_session_id,
        )

    return AgentRun(
        ok=True,
        reason_code=tool_payload.get("reasonCode"),
        delegated_agent=delegated_agent,
        tool_name=tool_name,
        tool_payload=tool_payload,
        text=text,
        events=events,
        session_id=runtime.last_session_id,
    )


__all__ = [
    "APP_NAME",
    "SPECIALIST_MODULES",
    "TOOL_TO_SPECIALIST",
    "CREDENTIAL_ENV_VARS",
    "AdkRuntime",
    "AdkRuntimeInfo",
    "AgentRun",
    "probe_adk_runtime",
    "probe_model_readiness",
    "build_runtime",
    "iter_agent_events",
    "run_agent",
]
