"""Provenance helpers.

Rule (non-negotiable): a provenance timestamp is ALWAYS the moment the value
was produced. There is no frozen timestamp anywhere in this service.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

# Persistence values. The service never writes to the platform store, so the
# only honest values are:
#   "none"        - nothing was read, nothing was written
#   "read_only"   - real records were read from the authoritative store
#   "computed"    - value derived from a deterministic local evaluator
#   "unavailable" - the authoritative source could not be reached
PERSISTENCE_NONE = "none"
PERSISTENCE_READ_ONLY = "read_only"
PERSISTENCE_COMPUTED = "computed"
PERSISTENCE_UNAVAILABLE = "unavailable"


def utc_now_iso() -> str:
    """Current UTC instant, ISO-8601 with millisecond precision and a `Z` suffix."""
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def build_provenance(
    *,
    source: str,
    agent: str,
    tool: Optional[str] = None,
    tool_status: str = "not_run",
    persistence: str = PERSISTENCE_NONE,
    detail: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build a provenance block that describes what actually happened."""
    provenance: Dict[str, Any] = {
        "source": source,
        "timestamp": utc_now_iso(),
        "agent": agent,
        "tool": tool,
        "toolStatus": tool_status,
        "persistence": persistence,
    }
    if detail:
        provenance["detail"] = detail
    if extra:
        provenance.update(extra)
    return provenance
