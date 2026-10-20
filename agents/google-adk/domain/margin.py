"""Margin Guardian — integer sen + basis-point arithmetic.

This is a faithful port of `evaluateMarginContribution` from
`shared/growth-contracts.ts` (FIN-01, "Rules Own The Money").

Two hard rules carried over from the product:

1. Every monetary amount is an INTEGER number of sen. No floats.
2. The verdict is decided with EXACT integer arithmetic:
   `contributionSen * 10000 >= netSalesSen * minimumMarginBps`.
   The displayed percentage is rounded for presentation only and is NEVER
   consulted for the verdict. A margin of 24.996% therefore FAILS even though
   the display rounds to 25.00%.

Both gates must pass:
   - contributionSen >= minimumContributionSen
   - contributionSen / netSalesSen >= minimumContributionMarginPct
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, getcontext
from typing import Any, Dict, Mapping, Optional, Tuple

from . import reason_codes

getcontext().prec = 34

#: Default minimum contribution, in sen (RM 20.00).
DEFAULT_MINIMUM_CONTRIBUTION_SEN = 2000

#: Default minimum contribution margin, in percent.
DEFAULT_MINIMUM_CONTRIBUTION_MARGIN_PCT = Decimal("25.000")

#: Variable cost fields summed exactly as the TypeScript contract does.
COST_FIELDS: Tuple[str, ...] = (
    "cogsSen",
    "packagingSen",
    "paymentFeesSen",
    "fulfilmentVariableCostSen",
    "deliverySubsidySen",
    "agentCommissionSen",
    "rewardCostSen",
    "expectedReturnLossSen",
)

#: Mapping from HTTP/payload snake_case keys to contract field names.
PAYLOAD_ALIASES: Dict[str, str] = {
    "netSalesExTaxSen": "netSalesExTaxSen",
    "net_sales_ex_tax_sen": "netSalesExTaxSen",
    "cogsSen": "cogsSen",
    "cogs_sen": "cogsSen",
    "packagingSen": "packagingSen",
    "packaging_sen": "packagingSen",
    "paymentFeesSen": "paymentFeesSen",
    "payment_fees_sen": "paymentFeesSen",
    "fulfilmentVariableCostSen": "fulfilmentVariableCostSen",
    "fulfilment_variable_cost_sen": "fulfilmentVariableCostSen",
    "deliverySubsidySen": "deliverySubsidySen",
    "delivery_subsidy_sen": "deliverySubsidySen",
    "agentCommissionSen": "agentCommissionSen",
    "agent_commission_sen": "agentCommissionSen",
    "rewardCostSen": "rewardCostSen",
    "reward_cost_sen": "rewardCostSen",
    "expectedReturnLossSen": "expectedReturnLossSen",
    "expected_return_loss_sen": "expectedReturnLossSen",
    "minimumContributionSen": "minimumContributionSen",
    "minimum_contribution_sen": "minimumContributionSen",
    "minimumContributionMarginPct": "minimumContributionMarginPct",
    "minimum_contribution_margin_pct": "minimumContributionMarginPct",
}


class MarginInputError(ValueError):
    """Raised when margin inputs are absent or malformed.

    `reason_code` distinguishes "you did not give me the numbers" from
    "the numbers you gave me are not valid integer sen".
    """

    def __init__(self, reason_code: str, message: str) -> None:
        super().__init__(message)
        self.reason_code = reason_code


@dataclass(frozen=True)
class MarginSimulationInput:
    """All amounts are integer sen; the margin threshold is a Decimal percent."""

    netSalesExTaxSen: int
    cogsSen: int = 0
    packagingSen: int = 0
    paymentFeesSen: int = 0
    fulfilmentVariableCostSen: int = 0
    deliverySubsidySen: int = 0
    agentCommissionSen: int = 0
    rewardCostSen: int = 0
    expectedReturnLossSen: int = 0
    minimumContributionSen: int = DEFAULT_MINIMUM_CONTRIBUTION_SEN
    minimumContributionMarginPct: Decimal = DEFAULT_MINIMUM_CONTRIBUTION_MARGIN_PCT
    defaulted_cost_fields: Tuple[str, ...] = field(default=(), compare=False)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "netSalesExTaxSen": self.netSalesExTaxSen,
            "cogsSen": self.cogsSen,
            "packagingSen": self.packagingSen,
            "paymentFeesSen": self.paymentFeesSen,
            "fulfilmentVariableCostSen": self.fulfilmentVariableCostSen,
            "deliverySubsidySen": self.deliverySubsidySen,
            "agentCommissionSen": self.agentCommissionSen,
            "rewardCostSen": self.rewardCostSen,
            "expectedReturnLossSen": self.expectedReturnLossSen,
            "minimumContributionSen": self.minimumContributionSen,
            "minimumContributionMarginPct": str(self.minimumContributionMarginPct),
        }


@dataclass(frozen=True)
class MarginSimulationResult:
    contributionSen: int
    contributionMarginPct: float
    contributionMarginPctExact: str
    isContributionPass: bool
    isMarginPctPass: bool
    allowed: bool
    reasonCode: str
    minimumContributionSen: int
    minimumContributionMarginPct: str
    minimumMarginBps: int
    inputs: Dict[str, Any] = field(default_factory=dict, compare=False)
    defaultedCostFields: Tuple[str, ...] = field(default=(), compare=False)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "contributionSen": self.contributionSen,
            "contributionMarginPct": self.contributionMarginPct,
            "contributionMarginPctExact": self.contributionMarginPctExact,
            "isContributionPass": self.isContributionPass,
            "isMarginPctPass": self.isMarginPctPass,
            "allowed": self.allowed,
            "reasonCode": self.reasonCode,
            "minimumContributionSen": self.minimumContributionSen,
            "minimumContributionMarginPct": self.minimumContributionMarginPct,
            "minimumMarginBps": self.minimumMarginBps,
            "inputs": self.inputs,
            "defaultedCostFields": list(self.defaultedCostFields),
        }


def _require_int(value: Any, field_name: str) -> int:
    """Accept only a genuine integer number of sen."""
    if isinstance(value, bool):
        raise MarginInputError(
            reason_codes.INVALID_MARGIN_INPUT,
            f"{field_name} mesti integer sen, bukan boolean.",
        )
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        raise MarginInputError(
            reason_codes.INVALID_MARGIN_INPUT,
            f"{field_name} mesti integer sen tanpa pecahan (diberi {value}).",
        )
    if isinstance(value, str):
        text = value.strip()
        try:
            return int(text)
        except ValueError as exc:
            raise MarginInputError(
                reason_codes.INVALID_MARGIN_INPUT,
                f"{field_name} mesti integer sen (diberi {value!r}).",
            ) from exc
    raise MarginInputError(
        reason_codes.INVALID_MARGIN_INPUT,
        f"{field_name} mesti integer sen (diberi {type(value).__name__}).",
    )


def _require_pct(value: Any, field_name: str) -> Decimal:
    if isinstance(value, bool):
        raise MarginInputError(
            reason_codes.INVALID_MARGIN_INPUT,
            f"{field_name} mesti peratus percent yang sah.",
        )
    try:
        if isinstance(value, Decimal):
            pct = value
        elif isinstance(value, float):
            pct = Decimal(str(value))
        elif isinstance(value, str):
            pct = Decimal(value.strip())
        elif isinstance(value, int):
            pct = Decimal(value)
        else:
            raise InvalidOperation
    except (InvalidOperation, ValueError) as exc:
        raise MarginInputError(
            reason_codes.INVALID_MARGIN_INPUT,
            f"{field_name} mesti peratus percent yang sah (diberi {value!r}).",
        ) from exc
    if pct.is_nan() or pct.is_infinite():
        raise MarginInputError(
            reason_codes.INVALID_MARGIN_INPUT,
            f"{field_name} mesti peratus percent yang sah.",
        )
    if pct < 0 or pct > 100:
        raise MarginInputError(
            reason_codes.INVALID_MARGIN_INPUT,
            f"{field_name} mesti antara 0 dan 100.",
        )
    return pct


def margin_input_from_mapping(
    payload: Optional[Mapping[str, Any]],
    *,
    default_minimum_contribution_sen: int = DEFAULT_MINIMUM_CONTRIBUTION_SEN,
    default_minimum_margin_pct: Decimal = DEFAULT_MINIMUM_CONTRIBUTION_MARGIN_PCT,
) -> Tuple[MarginSimulationInput, Tuple[str, ...]]:
    """Build a `MarginSimulationInput` from an arbitrary payload mapping.

    Returns the input plus the tuple of cost fields that were defaulted to 0
    (so the caller can disclose the assumption instead of hiding it).
    """
    if not payload:
        raise MarginInputError(
            reason_codes.MISSING_MARGIN_INPUTS,
            "Tiada input kewangan diberikan; sumbang margin tidak boleh dikira.",
        )

    normalised: Dict[str, Any] = {}
    for key, value in payload.items():
        target = PAYLOAD_ALIASES.get(key) or PAYLOAD_ALIASES.get(str(key))
        if target and target not in normalised:
            normalised[target] = value

    if "netSalesExTaxSen" not in normalised or normalised["netSalesExTaxSen"] is None:
        raise MarginInputError(
            reason_codes.MISSING_MARGIN_INPUTS,
            "netSalesExTaxSen (jualan bersih tanpa cukai, dalam sen) diperlukan.",
        )
    if "cogsSen" not in normalised or normalised["cogsSen"] is None:
        raise MarginInputError(
            reason_codes.MISSING_MARGIN_INPUTS,
            "cogsSen (kos barang dagangan, dalam sen) diperlukan untuk mengira margin.",
        )

    net_sales = _require_int(normalised["netSalesExTaxSen"], "netSalesExTaxSen")
    if net_sales < 0:
        raise MarginInputError(
            reason_codes.INVALID_MARGIN_INPUT,
            "netSalesExTaxSen tidak boleh bernilai negatif.",
        )

    costs: Dict[str, int] = {}
    defaulted: list[str] = []
    for field_name in COST_FIELDS:
        raw = normalised.get(field_name)
        if raw is None:
            costs[field_name] = 0
            defaulted.append(field_name)
            continue
        amount = _require_int(raw, field_name)
        if amount < 0:
            raise MarginInputError(
                reason_codes.INVALID_MARGIN_INPUT,
                f"{field_name} tidak boleh bernilai negatif.",
            )
        costs[field_name] = amount

    raw_minimum = normalised.get("minimumContributionSen")
    if raw_minimum is None:
        minimum_contribution = default_minimum_contribution_sen
    else:
        minimum_contribution = _require_int(raw_minimum, "minimumContributionSen")
        if minimum_contribution < 0:
            raise MarginInputError(
                reason_codes.INVALID_MARGIN_INPUT,
                "minimumContributionSen tidak boleh bernilai negatif.",
            )

    raw_pct = normalised.get("minimumContributionMarginPct")
    if raw_pct is None:
        minimum_pct = default_minimum_margin_pct
    else:
        minimum_pct = _require_pct(raw_pct, "minimumContributionMarginPct")

    simulation = MarginSimulationInput(
        netSalesExTaxSen=net_sales,
        minimumContributionSen=minimum_contribution,
        minimumContributionMarginPct=minimum_pct,
        defaulted_cost_fields=tuple(defaulted),
        **costs,
    )
    return simulation, tuple(defaulted)


def _exact_margin_pct(contribution_sen: int, net_sales_sen: int) -> Decimal:
    if net_sales_sen <= 0:
        return Decimal(0)
    return (Decimal(contribution_sen) * Decimal(100)) / Decimal(net_sales_sen)


def evaluate_margin_contribution(
    simulation: MarginSimulationInput,
) -> MarginSimulationResult:
    """Evaluate the Margin Guardian gates with exact integer arithmetic."""
    total_variable_costs_sen = sum(
        getattr(simulation, field_name) for field_name in COST_FIELDS
    )
    contribution_sen = simulation.netSalesExTaxSen - total_variable_costs_sen

    # Basis points: 25.000% -> 2500 bps. Rounded half-up on an exact Decimal.
    minimum_margin_bps = int(
        (simulation.minimumContributionMarginPct * Decimal(100)).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    )

    exact_pct = _exact_margin_pct(contribution_sen, simulation.netSalesExTaxSen)
    display_pct = float(exact_pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    is_contribution_pass = contribution_sen >= simulation.minimumContributionSen

    # Exact comparison - never the rounded display value.
    is_margin_pct_pass = (
        simulation.netSalesExTaxSen > 0
        and contribution_sen * 10000 >= simulation.netSalesExTaxSen * minimum_margin_bps
    )

    if not is_contribution_pass:
        reason_code = reason_codes.INSUFFICIENT_CASH_MARGIN
    elif not is_margin_pct_pass:
        reason_code = reason_codes.INSUFFICIENT_PERCENT_MARGIN
    else:
        reason_code = reason_codes.PASS

    return MarginSimulationResult(
        contributionSen=contribution_sen,
        contributionMarginPct=display_pct,
        contributionMarginPctExact=_format_exact_pct(exact_pct),
        isContributionPass=is_contribution_pass,
        isMarginPctPass=is_margin_pct_pass,
        allowed=is_contribution_pass and is_margin_pct_pass,
        reasonCode=reason_code,
        minimumContributionSen=simulation.minimumContributionSen,
        minimumContributionMarginPct=str(simulation.minimumContributionMarginPct),
        minimumMarginBps=minimum_margin_bps,
        inputs=simulation.as_dict(),
        defaultedCostFields=simulation.defaulted_cost_fields,
    )


def _format_exact_pct(exact_pct: Decimal) -> str:
    normalised = exact_pct.normalize()
    text = format(normalised, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


__all__ = [
    "DEFAULT_MINIMUM_CONTRIBUTION_SEN",
    "DEFAULT_MINIMUM_CONTRIBUTION_MARGIN_PCT",
    "COST_FIELDS",
    "MarginInputError",
    "MarginSimulationInput",
    "MarginSimulationResult",
    "margin_input_from_mapping",
    "evaluate_margin_contribution",
]
