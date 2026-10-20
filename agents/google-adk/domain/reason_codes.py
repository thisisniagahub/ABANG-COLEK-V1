"""Machine-readable reason codes.

Every specialist must state *why* it could not reach a real evaluator or a real
record. Codes are stable identifiers so a TypeScript bridge can branch on them
without parsing prose.

Invariant: no code in this module may be used to imply that a write happened.
The service is read-only by construction.
"""

from __future__ import annotations

# --- Generic ---------------------------------------------------------------
PASS = "PASS"
ADK_RUNTIME_UNAVAILABLE = "ADK_RUNTIME_UNAVAILABLE"
INTENT_UNRESOLVED = "INTENT_UNRESOLVED"
NO_TOOL_RESULT = "NO_TOOL_RESULT"

# --- Commerce reader -------------------------------------------------------
CATALOGUE_STORE_UNAVAILABLE = "CATALOGUE_STORE_UNAVAILABLE"
CATALOGUE_EMPTY = "CATALOGUE_EMPTY"
CATALOGUE_READ_FAILED = "CATALOGUE_READ_FAILED"

# --- QC / JEV reviewer -----------------------------------------------------
CASE_RECORD_NOT_FOUND = "CASE_RECORD_NOT_FOUND"
JEV_ASSESSMENT_NOT_FOUND = "JEV_ASSESSMENT_NOT_FOUND"
NO_QUARANTINE_LOT_FOUND = "NO_QUARANTINE_LOT_FOUND"
STORE_UNAVAILABLE = "STORE_UNAVAILABLE"

# --- Marketing drafter -----------------------------------------------------
MISSING_MARGIN_INPUTS = "MISSING_MARGIN_INPUTS"
INVALID_MARGIN_INPUT = "INVALID_MARGIN_INPUT"
INSUFFICIENT_CASH_MARGIN = "INSUFFICIENT_CASH_MARGIN"
INSUFFICIENT_PERCENT_MARGIN = "INSUFFICIENT_PERCENT_MARGIN"
NO_PUBLISHED_PRICE = "NO_PUBLISHED_PRICE"

__all__ = [
    "PASS",
    "ADK_RUNTIME_UNAVAILABLE",
    "INTENT_UNRESOLVED",
    "NO_TOOL_RESULT",
    "CATALOGUE_STORE_UNAVAILABLE",
    "CATALOGUE_EMPTY",
    "CATALOGUE_READ_FAILED",
    "CASE_RECORD_NOT_FOUND",
    "JEV_ASSESSMENT_NOT_FOUND",
    "NO_QUARANTINE_LOT_FOUND",
    "STORE_UNAVAILABLE",
    "MISSING_MARGIN_INPUTS",
    "INVALID_MARGIN_INPUT",
    "INSUFFICIENT_CASH_MARGIN",
    "INSUFFICIENT_PERCENT_MARGIN",
    "NO_PUBLISHED_PRICE",
]
