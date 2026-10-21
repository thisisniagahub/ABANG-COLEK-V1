/**
 * Bukti separuh Python untuk CPK-10 (delegasi master → specialist).
 *
 * Bahagian Python sudah terbukti dengan larian pytest sebenar; bahagian
 * TypeScript (runtime CopilotV2Runtime) belum ada delegasi parent→child,
 * trace propagation atau warisan bajet — itu kekad baki yang jujur.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER = 'reports/implementation/acceptance-status.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8')) as {
  rows: { id: string; gap: string; evidenceRefs: string[]; evidenceProves: string }[];
};
const row = ledger.rows.find((candidate) => candidate.id === 'CPK-10');
if (!row) throw new Error('CPK-10 not found');

row.gap =
  'Separuh PYTHON sudah terbukti: delegasi master → specialist melalui ADK sebenar (delegatedBy "abangcolek_ops", delegatedAgent "commerce_reader", a2ui.provenance.delegatedBy, adk.tool + adk.sessionId) dan intent takresolved dilapor dengan reason code, bukan direka. 23 ujian pytest lulus melalui `bun run test:adk` (venv workspace agents/google-adk/.venv). Yang BELUM dipenuhi: runtime TypeScript (server/agents/copilot) tiada parent→child delegation, tiada trace propagation dan tiada warisan bajet — jadi baris ini kekal implemented_unverified.';

row.evidenceProves =
  'Python: delegasi ADK sebenar diuji — test_master_agent_delegates_to_a_specialist_through_adk menghantar POST /agent/abangcolek_ops dan asserts delegatedBy/delegatedAgent/provenance/adk.tool/adk.sessionId; 23 pytest lulus (bun run test:adk). Skop TERHAD: ini bukti separuh PYTHON sahaja; runtime TypeScript belum mempunyai delegasi parent→child, trace propagation atau warisan bajet.';

if (!row.evidenceRefs.includes('reports/implementation/evidence/CPK-10-python.json')) {
  row.evidenceRefs = [...row.evidenceRefs, 'reports/implementation/evidence/CPK-10-python.json'];
}

writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);

writeFileSync(
  'reports/implementation/evidence/CPK-10-python.json',
  `${JSON.stringify(
    {
      requirementId: 'CPK-10',
      status: 'implemented_unverified',
      environment: 'local_test',
      timestamp: new Date().toISOString(),
      sourceCommit: '1fc218e5784efb890641bba1e46ac97f617639a3',
      worktree: 'D:\\ABANGCOLEK-PLATFORM',
      testName: 'test_master_agent_delegates_to_a_specialist_through_adk',
      testPath: 'agents/google-adk/tests/test_agents.py',
      command: 'bun run test:adk',
      exitCode: 0,
      result: '23 passed, 2 warnings in 4.72s',
      artifactRefs: [
        'agents/google-adk/runtime.py',
        'agents/google-adk/tests/test_agents.py',
        'server/agents/copilot/runtime.ts',
      ],
      actualProviderModel: 'deterministic_local',
      reviewer: 'integrator-2026-10-21',
      limitations:
        'Bukti ini meliputi separuh PYTHON sahaja: delegasi master → specialist melalui ADK sebenar dengan jejak (delegatedBy, delegatedAgent, a2ui.provenance, adk.tool, adk.sessionId). Runtime TypeScript (server/agents/copilot/runtime.ts) MASIH tiada parent→child delegation, trace propagation atau warisan bajet — itu baki sebenar yang menyebabkan baris kekal implemented_unverified. Suite Python kini boleh dijalankan melalui skrip npm `bun run test:adk` (sebelum ini tiada skrip atau CI job yang memanggilnya).',
    },
    null,
    2,
  )}\n`,
);

console.log('CPK-10 evidence + gap updated');
