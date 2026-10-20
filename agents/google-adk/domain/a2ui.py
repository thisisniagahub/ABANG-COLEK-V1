"""A2UI v1 card construction.

The card is a *presentation* of what a specialist actually did. Props that
could not be established from real state are omitted or set to `None` with an
explicit `reasonCode`; they are never filled in with plausible constants.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

SCHEMA_VERSION = "a2ui.v1"


def build_card(
    *,
    component: str,
    props: Dict[str, Any],
    provenance: Dict[str, Any],
    actions: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Build an A2UI v1 card."""
    card: Dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "component": component,
        "props": props,
        "provenance": provenance,
    }
    if actions:
        card["actions"] = actions
    return card


def proposed_action(
    *,
    action_id: str,
    label: str,
    action_type: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Build a *proposed* action.

    The service is read-only, so every action is explicitly marked as not
    executed and as requiring operator confirmation. No action is ever
    presented as a receipt of work that did not happen.
    """
    return {
        "id": action_id,
        "label": label,
        "actionType": action_type,
        "payload": payload,
        "executed": False,
        "requiresOperatorAction": True,
    }


__all__ = ["SCHEMA_VERSION", "build_card", "proposed_action"]
