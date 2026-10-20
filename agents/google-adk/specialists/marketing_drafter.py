"""Google ADK specialist: marketing_drafter.

Drafts campaign copy and enforces the Margin Guardian before any campaign is
allowed to proceed.

There are NO hardcoded financial constants in this module. The margin verdict
is computed by `domain.margin.evaluate_margin_contribution` from the actual
inputs, using integer sen and exact basis-point comparison. When the request
does not carry the financial inputs, the specialist reports
`MISSING_MARGIN_INPUTS` and makes no margin claim at all.

The service is read-only, so it never records, schedules or launches a
campaign. The approve action is a *proposal* requiring operator action.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from google.adk.agents import LlmAgent

from domain import reason_codes
from domain.a2ui import build_card, proposed_action
from domain.margin import (
    DEFAULT_MINIMUM_CONTRIBUTION_SEN,
    DEFAULT_MINIMUM_CONTRIBUTION_MARGIN_PCT,
    MarginInputError,
    evaluate_margin_contribution,
    margin_input_from_mapping,
)
from domain.platform_store import published_catalogue
from domain.provenance import (
    PERSISTENCE_COMPUTED,
    PERSISTENCE_NONE,
    PERSISTENCE_UNAVAILABLE,
    build_provenance,
)

AGENT_NAME = "marketing_drafter"
TOOL_NAME = "evaluate_campaign_margin"

INSTRUCTION = (
    "Anda adalah specialists marketing_drafter platform AbangColek.\n"
    "Tugas: draf salinan kempen dan sahkan melalui Margin Guardian.\n"
    "Peraturan: semua wang dalam sen integer. Margin mesti lulus DUA pintu: "
    "sumbangan sekurang-kurangnya 2000 sen DAN nisbah sekurang-kurangnya "
    "25.000% yang dibandingkan dengan aritmetik integer tepat. Jika input "
    "kewangan tiada, laporkan MISSING_MARGIN_INPUTS dan jangan membuat "
    "penegasan margin."
)

#: Payload keys accepted for the financial inputs.
FINANCIAL_KEYS = (
    "netSalesExTaxSen",
    "cogsSen",
    "packagingSen",
    "paymentFeesSen",
    "fulfilmentVariableCostSen",
    "deliverySubsidySen",
    "agentCommissionSen",
    "rewardCostSen",
    "expectedReturnLossSen",
    "minimumContributionSen",
    "minimumContributionMarginPct",
)


def evaluate_campaign_margin(
    net_sales_ex_tax_sen: Optional[int] = None,
    cogs_sen: Optional[int] = None,
    packaging_sen: Optional[int] = None,
    payment_fees_sen: Optional[int] = None,
    fulfilment_variable_cost_sen: Optional[int] = None,
    delivery_subsidy_sen: Optional[int] = None,
    agent_commission_sen: Optional[int] = None,
    reward_cost_sen: Optional[int] = None,
    expected_return_loss_sen: Optional[int] = None,
    minimum_contribution_sen: Optional[int] = None,
    minimum_contribution_margin_pct: Optional[str] = None,
) -> Dict[str, Any]:
    """Evaluate a campaign's margin contribution with the Margin Guardian.

    All amounts are integer sen. The verdict uses exact basis-point
    arithmetic, so a 24.996% margin is rejected even though the displayed
    percentage rounds to 25.00%.

    Args:
        net_sales_ex_tax_sen: net sales excluding tax, in integer sen.
        cogs_sen: cost of goods sold, in integer sen.
        packaging_sen: packaging cost, in integer sen.
        payment_fees_sen: payment fees, in integer sen.
        fulfilment_variable_cost_sen: fulfilment variable cost, in integer sen.
        delivery_subsidy_sen: delivery subsidy, in integer sen.
        agent_commission_sen: agent commission, in integer sen.
        reward_cost_sen: reward cost, in integer sen.
        expected_return_loss_sen: expected return loss, in integer sen.
        minimum_contribution_sen: minimum contribution gate, in integer sen.
        minimum_contribution_margin_pct: minimum margin gate, as a percent string.

    Returns:
        A dict with the computed verdict, or an explicit reason code when the
        inputs are missing or invalid.
    """
    supplied = {
        "netSalesExTaxSen": net_sales_ex_tax_sen,
        "cogsSen": cogs_sen,
        "packagingSen": packaging_sen,
        "paymentFeesSen": payment_fees_sen,
        "fulfilmentVariableCostSen": fulfilment_variable_cost_sen,
        "deliverySubsidySen": delivery_subsidy_sen,
        "agentCommissionSen": agent_commission_sen,
        "rewardCostSen": reward_cost_sen,
        "expectedReturnLossSen": expected_return_loss_sen,
    }
    if minimum_contribution_sen is not None:
        supplied["minimumContributionSen"] = minimum_contribution_sen
    if minimum_contribution_margin_pct is not None:
        supplied["minimumContributionMarginPct"] = minimum_contribution_margin_pct

    present = {key: value for key, value in supplied.items() if value is not None}

    if not present:
        return {
            "available": False,
            "reasonCode": reason_codes.MISSING_MARGIN_INPUTS,
            "detail": (
                "Tiada input kewangan diberikan (netSalesExTaxSen, cogsSen); "
                "margin tidak boleh dikira."
            ),
            "summary": (
                "Margin tidak dapat disahkan kerana tiada input kewangan "
                "diberikan; tiada kempen boleh diluluskan."
            ),
            "allowed": False,
            "computed": False,
        }

    try:
        simulation, defaulted = margin_input_from_mapping(present)
    except MarginInputError as error:
        return {
            "available": False,
            "reasonCode": error.reason_code,
            "detail": str(error),
            "summary": (
                "Input kewangan tidak lengkap atau tidak sah; margin tidak "
                "boleh dikira."
            ),
            "allowed": False,
            "computed": False,
        }

    result = evaluate_margin_contribution(simulation)
    payload = result.as_dict()
    payload.update(
        {
            "available": True,
            "computed": True,
            "defaultedCostFields": list(defaulted),
            "summary": (
                f"Sumbangan {result.contributionSen} sen "
                f"({result.contributionMarginPctExact}%) - "
                f"{'LULUS' if result.allowed else 'DITAHAN'}."
            ),
        }
    )
    return payload


def build_agent(model: Any) -> LlmAgent:
    """Create the real ADK specialist agent."""
    return LlmAgent(
        name=AGENT_NAME,
        model=model,
        description=(
            "Campaign drafting agent for the AbangColek platform. Enforces the "
            "Margin Guardian using exact integer sen arithmetic before any "
            "campaign may proceed."
        ),
        instruction=INSTRUCTION,
        tools=[evaluate_campaign_margin],
    )


def _product_anchor(campaign_name: str) -> Dict[str, Any]:
    """Find a real published product to anchor the copy, if one exists."""
    catalogue = published_catalogue()
    products = catalogue.get("products") or []
    if not catalogue.get("available") or not products:
        return {
            "available": False,
            "reasonCode": (
                reason_codes.CATALOGUE_EMPTY
                if catalogue.get("available")
                else reason_codes.CATALOGUE_STORE_UNAVAILABLE
            ),
            "product": None,
            "catalogueVersion": catalogue.get("catalogueVersion"),
        }
    product = products[0]
    return {
        "available": True,
        "reasonCode": reason_codes.PASS,
        "product": {
            "id": product.get("id"),
            "name": product.get("name"),
            "priceSen": product.get("priceSen"),
            "packSize": product.get("packSize"),
        },
        "catalogueVersion": catalogue.get("catalogueVersion"),
    }


def _build_copy(
    campaign_name: str,
    channel: str,
    discount_percent: Optional[float],
    product: Optional[Dict[str, Any]],
) -> str:
    """Build copy that only references products that actually exist."""
    lines = [f"*{campaign_name.upper()}*", ""]
    if product and product.get("name"):
        lines.append(
            f"Produk: {product['name']}"
            + (
                f" (RM {product['priceSen'] / 100:.2f})"
                if isinstance(product.get("priceSen"), int)
                else ""
            )
            + "."
        )
    else:
        lines.append("Produk tidak dinamakan kerana tiada produk diterbitkan disahkan.")
    if discount_percent is not None:
        lines.append(f"Tawaran: diskaun {discount_percent:.0f}% untuk masa terhad.")
    lines.append(f"Saluran: {channel}.")
    lines.append("Tempahan hanya melalui ejen sah AbangColek.")
    return "\n".join(lines)


def build_result(
    tool_payload: Optional[Dict[str, Any]],
    request_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Convert the ADK tool result into the specialist response payload."""
    payload = tool_payload or {}
    request = request_payload or {}
    computed = bool(payload.get("computed"))
    allowed = bool(payload.get("allowed")) if computed else False
    reason_code = payload.get("reasonCode")

    campaign_name = str(
        request.get("campaignName") or request.get("campaign_name") or "Kempen AbangColek"
    )
    channel = str(request.get("channel") or "whatsapp")
    raw_discount = request.get("discountPercent", request.get("discount_percent"))
    discount_percent: Optional[float]
    try:
        discount_percent = float(raw_discount) if raw_discount is not None else None
    except (TypeError, ValueError):
        discount_percent = None

    anchor = _product_anchor(campaign_name)
    copy_draft = _build_copy(campaign_name, channel, discount_percent, anchor["product"])

    if computed:
        source = "local_rules"
        persistence = PERSISTENCE_COMPUTED
    else:
        source = "unavailable"
        persistence = (
            PERSISTENCE_UNAVAILABLE
            if reason_code == reason_codes.MISSING_MARGIN_INPUTS
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
            "computed": computed,
            "catalogueVersion": anchor.get("catalogueVersion"),
        },
    )

    props: Dict[str, Any] = {
        "campaignName": campaign_name,
        "channel": channel,
        "discountPercent": discount_percent,
        "marginSafe": allowed if computed else None,
        "marginStatus": (
            "PASS"
            if computed and allowed
            else ("BLOCKED" if computed else "UNAVAILABLE")
        ),
        "contributionSen": payload.get("contributionSen"),
        "contributionMarginPct": payload.get("contributionMarginPct"),
        "contributionMarginPctExact": payload.get("contributionMarginPctExact"),
        "isContributionPass": payload.get("isContributionPass"),
        "isMarginPctPass": payload.get("isMarginPctPass"),
        "minimumContributionSen": payload.get(
            "minimumContributionSen", DEFAULT_MINIMUM_CONTRIBUTION_SEN
        ),
        "minimumContributionMarginPct": payload.get(
            "minimumContributionMarginPct", str(DEFAULT_MINIMUM_CONTRIBUTION_MARGIN_PCT)
        ),
        "reasonCode": reason_code,
        "defaultedCostFields": payload.get("defaultedCostFields", []),
    }

    actions: List[Dict[str, Any]] = []
    if allowed:
        actions.append(
            proposed_action(
                action_id="action-launch-campaign",
                label="Luluskan Draf Kempen",
                action_type="approve",
                payload={"campaignName": campaign_name, "channel": channel},
            )
        )

    if not computed:
        detail = str(payload.get("detail") or reason_code).rstrip(". ")
        reply = (
            f"Margin tidak dapat disahkan: {detail}. Tiada kempen diluluskan."
        )
    elif allowed:
        reply = (
            f"Draf kempen '{campaign_name}' dijana. Margin Guardian meluluskan: "
            f"sumbangan {payload.get('contributionSen')} sen "
            f"({payload.get('contributionMarginPctExact')}%). Kempen belum "
            "dilancarkan - kelulusan memerlukan tindakan operator."
        )
    else:
        reply = (
            f"Draf kempen '{campaign_name}' dijana tetapi Margin Guardian "
            f"menahannya ({reason_code}): sumbangan "
            f"{payload.get('contributionSen')} sen "
            f"({payload.get('contributionMarginPctExact')}%). Tiada kempen "
            "diluluskan."
        )

    return {
        "status": "success" if computed else "unavailable",
        "specialist": AGENT_NAME,
        "channel": channel,
        "campaignName": campaign_name,
        "marginSafe": allowed if computed else None,
        "marginStatus": props["marginStatus"],
        "schemaVersion": "a2ui.v1",
        "reasonCode": reason_code,
        "a2ui": build_card(
            component="MarginSimulator",
            props=props,
            provenance=provenance,
            actions=actions,
        ),
        "copyDraft": copy_draft,
        "reply": reply,
    }


__all__ = [
    "AGENT_NAME",
    "TOOL_NAME",
    "INSTRUCTION",
    "FINANCIAL_KEYS",
    "evaluate_campaign_margin",
    "build_agent",
    "build_result",
]
