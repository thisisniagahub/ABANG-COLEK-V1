/**
 * Sync `reports/implementation/activation-decisions.json` with the ledger and
 * link every externally-gated row to its activation decision.
 *
 * Contract authority: docs/prompts/AGENT-EXECUTION-CONTRACT.md:158
 *   "Satu record bagi provider/processor/data class: capabilityId, purpose,
 *    accountOwnerRef, offeringEvidenceUrl, verifiedAt, expiresAt,
 *    allowedDataClasses, retentionPolicyRef, deletionProcedureRef,
 *    feeComponents, overflowDisabled, authorizationRef, status, reasonCode.
 *    Unknown bukan approved; fixture approval tidak menjadi production
 *    authorization."
 *
 * The activation decision governs the ACTIVATION of a provider / processor /
 * data class. It is a different axis from the acceptance row's status: a row
 * can have its LOCAL capability verified while its hosted activation is still
 * blocked. Both facts are recorded, and the row links to the decision.
 */

import * as fs from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const DECISIONS = 'reports/implementation/activation-decisions.json';

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf-8'));
const decisions = JSON.parse(fs.readFileSync(DECISIONS, 'utf-8'));

const reasonCodeFor = (id: string): string => {
  if (id.startsWith('MODEL_')) return 'PROVIDER_ELIGIBILITY_UNVERIFIED';
  if (id === 'PAY-01' || id === 'PAY-02') return 'PROVIDER_CREDENTIAL_MISSING';
  if (id === 'CPK-01') return 'PROVIDER_QUOTA_EXHAUSTED';
  return 'ACTIVATION_EVIDENCE_MISSING';
};

const purposeFor = (id: string): string => {
  if (id.startsWith('MODEL_')) {
    return 'Free-tier model provider candidate for the ABANGCOLEK Operations Copilot. No business data is authorized to be sent to this provider until an account, a valid free-tier entitlement and a data policy are verified.';
  }
  const row = ledger.rows.find((r: any) => r.id === id);
  return row
    ? `Acceptance capability ${id} (${row.title}). The hosted/offering activation is separate from the local implementation: a local or synthetic proof does not authorize the offering.`
    : `Acceptance capability ${id}.`;
};

const existing = new Set(decisions.map((d: any) => d.capabilityId));
let added = 0;

// Every blocked_external ledger row must have an activation decision.
for (const row of ledger.rows) {
  if (row.status !== 'blocked_external') continue;
  if (existing.has(row.id)) {
    const d = decisions.find((x: any) => x.capabilityId === row.id);
    d.reasonCode = reasonCodeFor(row.id);
    d.purpose = purposeFor(row.id);
    d.status = 'blocked_external';
    d.overflowDisabled = true;
    row.activationDecisionRef = `reports/implementation/activation-decisions.json#${row.id}`;
    continue;
  }
  decisions.push({
    capabilityId: row.id,
    purpose: purposeFor(row.id),
    accountOwnerRef: null,
    offeringEvidenceUrl: null,
    verifiedAt: null,
    expiresAt: null,
    allowedDataClasses: [],
    retentionPolicyRef: null,
    deletionProcedureRef: null,
    feeComponents: [],
    overflowDisabled: true,
    authorizationRef: null,
    status: 'blocked_external',
    reasonCode: reasonCodeFor(row.id),
  });
  row.activationDecisionRef = `reports/implementation/activation-decisions.json#${row.id}`;
  existing.add(row.id);
  added++;
}

// Rows whose LOCAL capability is verified but whose ACTIVATION is blocked must
// carry the gate explicitly and point at the decision, so no reader can confuse
// "local capability proven" with "offering activated".
const LOCAL_VERIFIED_ACTIVATION_GATED = new Set(['EXT-03', 'EXT-06', 'EXT-07']);
for (const row of ledger.rows) {
  if (!LOCAL_VERIFIED_ACTIVATION_GATED.has(row.id)) continue;
  const d = decisions.find((x: any) => x.capabilityId === row.id);
  if (d) {
    row.externalGate = `Hosted activation blocked: ${d.reasonCode}. The LOCAL capability is verified; the offering is not activated.`;
    row.activationDecisionRef = `reports/implementation/activation-decisions.json#${row.id}`;
  }
}

fs.writeFileSync(DECISIONS, JSON.stringify(decisions, null, 2) + '\n');
fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');

console.log(`activation decisions: ${decisions.length} (added ${added})`);
for (const d of decisions) console.log(`   ${d.capabilityId}  ${d.status}  ${d.reasonCode}`);
console.log(
  `ledger blocked_external rows: ${ledger.rows.filter((r: any) => r.status === 'blocked_external').length}`,
);
const missingRef = ledger.rows.filter(
  (r: any) => r.status === 'blocked_external' && !r.activationDecisionRef,
);
console.log(`blocked rows without an activation decision link: ${missingRef.length}`);
