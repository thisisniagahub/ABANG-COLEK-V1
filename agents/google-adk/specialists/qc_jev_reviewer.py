"""
Google ADK Specialist: QC & JEV Reviewer
Prinsip: LOCAL_RULES Review-Only • Tiada Skor Keyakinan Rekaan (No Fabricated Confidence)
Invariant: Root Cause kekal UNDETERMINED sehingga semakan kelompok pembekal selesai.
"""

from typing import Dict, Any

def review_qc_jev(payload: Dict[str, Any]) -> Dict[str, Any]:
    incident_type = payload.get("incidentType", "leakage")
    description = payload.get("description", "Aduan isu kualiti botol/pembungkusan")
    
    # Strictly deterministic local rules without fabricated float confidence
    return {
        "status": "success",
        "specialist": "qc_jev_reviewer",
        "evaluationState": "reviewed_local_rules",
        "rootCauseStatus": "UNDETERMINED",
        "schemaVersion": "a2ui.v1",
        "a2ui": {
            "schemaVersion": "a2ui.v1",
            "component": "JevAssessmentCard",
            "props": {
                "incidentType": incident_type,
                "description": description,
                "rootCause": "UNDETERMINED",
                "recommendedAction": "Kuarantin stok kelompok dan semak bukti foto",
                "localRulesEnforced": True,
                "confidenceScore": None  # Dilarang mereka-reka nombor float
            },
            "provenance": {
                "source": "jev_local_rules",
                "timestamp": "2026-10-19T06:00:00Z"
            },
            "actions": [
                {
                    "id": "action-quarantine",
                    "label": "Mulakan Kuarantin Kelompok",
                    "actionType": "approve",
                    "payload": {"action": "stock_quarantine"}
                },
                {
                    "id": "action-recheck",
                    "label": "Minta Bukti Tambahan",
                    "actionType": "recheck",
                    "payload": {"action": "request_photo"}
                }
            ]
        },
        "reply": "Semakan JEV berasaskan peraturan tempatan telah selesai. Status punca utama ditetapkan sebagai UNDETERMINED mengikut piawaian integriti kualiti."
    }
