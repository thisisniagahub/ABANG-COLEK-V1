/**
 * AbangColek Sovereign GrowthOS — 32 Advanced Tool Definitions (Fasa 03B)
 *
 * Every logical capability id ADV-01..ADV-32 has exactly one registered tool
 * with strict input validation and a real `execute` implementation. The
 * registry below is the single source of truth: `discover_capabilities` reads
 * from it live rather than from a hardcoded list.
 */

import type { ToolDefinition } from './types';
import { discoveryTools } from './capabilities/discovery';
import { commerceTools } from './capabilities/commerce';
import { inventoryTools } from './capabilities/inventory';
import { growthTools } from './capabilities/growth';
import { operationsTools } from './capabilities/operations';
import { governanceTools } from './capabilities/governance';

export const ALL_ADVANCED_TOOL_DEFINITIONS: ToolDefinition[] = [
  ...discoveryTools,
  ...commerceTools,
  ...inventoryTools,
  ...growthTools,
  ...operationsTools,
  ...governanceTools,
];

const EXPECTED_CAPABILITY_IDS = [
  'ADV-01', 'ADV-02', 'ADV-03', 'ADV-04', 'ADV-05', 'ADV-06', 'ADV-07', 'ADV-08',
  'ADV-09', 'ADV-10', 'ADV-11', 'ADV-12', 'ADV-13', 'ADV-14', 'ADV-15', 'ADV-16',
  'ADV-17', 'ADV-18', 'ADV-19', 'ADV-20', 'ADV-21', 'ADV-22', 'ADV-23', 'ADV-24',
  'ADV-25', 'ADV-26', 'ADV-27', 'ADV-28', 'ADV-29', 'ADV-30', 'ADV-31', 'ADV-32',
] as const;

const buildRegistry = (definitions: ToolDefinition[]): Map<string, ToolDefinition> => {
  const registry = new Map<string, ToolDefinition>();
  for (const definition of definitions) {
    if (registry.has(definition.registrationName)) {
      throw new Error(`Advanced tool '${definition.registrationName}' didaftar dua kali.`);
    }
    if (registry.size && !EXPECTED_CAPABILITY_IDS.includes(definition.logicalCapabilityId as never)) {
      throw new Error(`Advanced tool '${definition.registrationName}' membawa id logikal yang tidak dikenali.`);
    }
    registry.set(definition.registrationName, definition);
  }
  const registered = [...registry.values()].map((definition) => definition.logicalCapabilityId).sort();
  const expected = [...EXPECTED_CAPABILITY_IDS].sort();
  if (registered.length !== expected.length || registered.some((id, index) => id !== expected[index])) {
    throw new Error(
      `Registri alatan tidak lengkap: ${registered.length}/${expected.length} keupayaan logikal didaftar.`,
    );
  }
  return registry;
};

const REGISTRY = buildRegistry(ALL_ADVANCED_TOOL_DEFINITIONS);

export const ADVANCED_TOOLS_DEFINITIONS: Record<string, ToolDefinition> = Object.fromEntries(
  REGISTRY.entries(),
);

export const ADVANCED_CAPABILITY_IDS: readonly string[] = EXPECTED_CAPABILITY_IDS;

export const ADVANCED_TOOL_COUNT = REGISTRY.size;

export { EXPECTED_CAPABILITY_IDS };
export type { ToolDefinition };
