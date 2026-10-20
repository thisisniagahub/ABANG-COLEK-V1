"""Deterministic intent routing for the master `abangcolek_ops` agent.

The master agent's *delegation* is performed by Google ADK itself (the real
`transfer_to_agent` mechanism). This module only decides WHICH specialist the
master should delegate to, because the service runs with a deterministic local
policy model rather than a remote LLM unless model credentials are configured.

The routing result carries a rule id, never a fabricated probability.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

COMMERCE_READER = "commerce_reader"
QC_JEV_REVIEWER = "qc_jev_reviewer"
MARKETING_DRAFTER = "marketing_drafter"

#: Ordered rules. First match wins; order is deliberate (most specific first).
ROUTING_RULES: Tuple[Tuple[str, Tuple[str, ...]], ...] = (
    (
        QC_JEV_REVIEWER,
        (
            "bocor",
            "jev",
            "kualiti",
            "aduan",
            "kuarantine",
            "quarantine",
            "leak",
            "leakage",
            "complaint",
            "retak",
            "pecah",
            "kerosakan",
        ),
    ),
    (
        MARKETING_DRAFTER,
        (
            "marketing",
            "kempen",
            "campaign",
            "iklan",
            "diskaun",
            "discount",
            "promosi",
            "promotion",
            "gaji",
            "pengiklanan",
        ),
    ),
    (
        COMMERCE_READER,
        (
            "jualan",
            "sales",
            "stok",
            "stock",
            "katalog",
            "catalogue",
            "produk",
            "product",
            "pesanan",
            "order",
            "inventori",
            "inventory",
        ),
    ),
)


@dataclass(frozen=True)
class Intent:
    """A routing decision."""

    specialist: Optional[str]
    rule_id: Optional[str]
    matched_term: Optional[str]

    @property
    def resolved(self) -> bool:
        return self.specialist is not None

    def as_dict(self) -> Dict[str, Optional[str]]:
        return {
            "specialist": self.specialist,
            "ruleId": self.rule_id,
            "matchedTerm": self.matched_term,
        }


def classify(text: Optional[str]) -> Intent:
    """Classify free text into a specialist using the local routing rules."""
    if not text:
        return Intent(specialist=None, rule_id=None, matched_term=None)
    lowered = text.lower()
    for specialist, terms in ROUTING_RULES:
        for term in terms:
            if term in lowered:
                return Intent(
                    specialist=specialist,
                    rule_id=f"rule:{specialist}",
                    matched_term=term,
                )
    return Intent(specialist=None, rule_id=None, matched_term=None)


def specialist_names() -> List[str]:
    return [specialist for specialist, _ in ROUTING_RULES]


__all__ = [
    "COMMERCE_READER",
    "QC_JEV_REVIEWER",
    "MARKETING_DRAFTER",
    "ROUTING_RULES",
    "Intent",
    "classify",
    "specialist_names",
]
