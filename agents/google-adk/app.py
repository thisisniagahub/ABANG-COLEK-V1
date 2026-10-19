"""
Google ADK Python 3.12 AG-UI Microservice
Platform: AbangColek Sovereign GrowthOS
Authority: Blueprint v2.3 & ADR-0003
Default Port: 8030
Prinsip: Sifar Kos • A2UI Fixed Schema • Strict Role Isolation
"""

import sys
import os
import json
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

# Add current dir to sys.path to allow relative imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from specialists.commerce_reader import analyze_commerce
from specialists.qc_jev_reviewer import review_qc_jev
from specialists.marketing_drafter import draft_marketing_campaign

app = FastAPI(
    title="AbangColek Google ADK Agent Service",
    description="Python 3.12 AG-UI Microservice for AbangColek Platform",
    version="2.3.0"
)

class AgentRequest(BaseModel):
    message: Optional[str] = None
    query: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    stream: Optional[bool] = False

@app.get("/health")
def health():
    return {
        "status": "ok",
        "runtime": "google-adk-python3.12",
        "port": 8030,
        "specialists": [
            "commerce_reader",
            "qc_jev_reviewer",
            "marketing_drafter"
        ],
        "schemaVersion": "a2ui.v1",
        "zeroPaidSpend": True
    }

@app.post("/agent/specialists/commerce_reader")
def handle_commerce(request: AgentRequest):
    data = request.payload or {"query": request.message or request.query or ""}
    result = analyze_commerce(data)
    return JSONResponse(content={"ok": True, "data": result})

@app.post("/agent/specialists/qc_jev_reviewer")
def handle_qc_jev(request: AgentRequest):
    data = request.payload or {
        "incidentType": "leakage",
        "description": request.message or "Pemeriksaan kualiti"
    }
    result = review_qc_jev(data)
    return JSONResponse(content={"ok": True, "data": result})

@app.post("/agent/specialists/marketing_drafter")
def handle_marketing(request: AgentRequest):
    data = request.payload or {
        "campaignName": request.message or "Promosi Colek",
        "channel": "whatsapp"
    }
    result = draft_marketing_campaign(data)
    return JSONResponse(content={"ok": True, "data": result})

@app.post("/agent/abangcolek_ops")
def handle_ops_master(request: AgentRequest):
    msg = (request.message or request.query or "").lower()
    
    # Route to relevant specialist or default operations response
    if "bocor" in msg or "jev" in msg or "kualiti" in msg or "aduan" in msg:
        res = review_qc_jev({"incidentType": "leakage", "description": msg})
    elif "marketing" in msg or "kempen" in msg or "iklan" in msg or "diskaun" in msg:
        res = draft_marketing_campaign({"campaignName": "Kempen Pertumbuhan Niaga", "channel": "whatsapp"})
    elif "jualan" in msg or "stok" in msg or "katalog" in msg or "produk" in msg:
        res = analyze_commerce({"query": msg})
    else:
        res = {
            "status": "success",
            "specialist": "abangcolek_ops",
            "schemaVersion": "a2ui.v1",
            "a2ui": {
                "schemaVersion": "a2ui.v1",
                "component": "OperationsBriefCard",
                "props": {
                    "title": "AbangColek Master Operations Briefing",
                    "summary": "Sistem operasi berjalan lancar. 3 pakar aktif: commerce_reader, qc_jev_reviewer, marketing_drafter.",
                    "status": "OPERATIONAL"
                },
                "provenance": {
                    "source": "local_authoritative",
                    "timestamp": "2026-10-19T06:00:00Z"
                }
            },
            "reply": "Arahan master operasi AbangColek diterima. Semua aliran mematuhi prinsip sifar kos dan pengesahan deterministik."
        }
        
    return JSONResponse(content={"ok": True, "data": res})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8030)
