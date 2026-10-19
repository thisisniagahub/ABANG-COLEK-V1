"""
Unit tests for Google ADK Python Specialists & FastAPI app.
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from specialists.commerce_reader import analyze_commerce
from specialists.qc_jev_reviewer import review_qc_jev
from specialists.marketing_drafter import draft_marketing_campaign

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["runtime"] == "google-adk-python3.12"
    assert data["port"] == 8030
    assert "commerce_reader" in data["specialists"]
    assert "qc_jev_reviewer" in data["specialists"]
    assert "marketing_drafter" in data["specialists"]

def test_commerce_specialist():
    res = client.post("/agent/specialists/commerce_reader", json={"query": "semak stok sambal"})
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["data"]["specialist"] == "commerce_reader"
    assert data["data"]["a2ui"]["component"] == "OperationsBriefCard"

def test_qc_jev_specialist_strict_rules():
    res = client.post("/agent/specialists/qc_jev_reviewer", json={"message": "botol bocor"})
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["data"]["rootCauseStatus"] == "UNDETERMINED"
    assert data["data"]["a2ui"]["component"] == "JevAssessmentCard"
    # STRICT: Tiada skor keyakinan rekaan (Must be None)
    assert data["data"]["a2ui"]["props"]["confidenceScore"] is None

def test_marketing_specialist():
    res = client.post("/agent/specialists/marketing_drafter", json={"message": "kempen gaji", "discountPercent": 15})
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["data"]["specialist"] == "marketing_drafter"
    assert data["data"]["marginSafe"] is True
    assert data["data"]["a2ui"]["component"] == "MarginSimulator"

def test_master_ops_router():
    # Test routing to JEV when reporting leakage
    res = client.post("/agent/abangcolek_ops", json={"message": "laporan botol sos bocor"})
    assert res.status_code == 200
    data = res.json()
    assert data["data"]["specialist"] == "qc_jev_reviewer"
