/**
 * AbangColek Sovereign GrowthOS — MCP stdio entry
 *
 * Titik masuk stdio untuk klien MCP tempatan (desktop, CLI). Actor datang
 * daripada KONFIGURASI SERVER (environment), bukan daripada permintaan
 * klien: stdio tidak membawa HTTP request, jadi tiada identiti yang boleh
 * disuntik oleh pihak luar.
 *
 * Usage:
 *   MCP_ACTOR_USER_ID=usr_1 MCP_ACTOR_ROLE=founder bun server/agents/mcp/stdio.ts
 *
 * Tanpa environment tersebut, pelayan keluar dengan kod 1 — tiada mod
 * "unrestricted" untuktempahan.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { WorkspaceRole } from '../../../shared/platform-contracts';
import { PlatformStore } from '../../platform/store';
import { McpAccessError, type McpActor } from './actor';
import { createOperationsMcpServer } from './server';

const DATABASE_PATH = process.env.PLATFORM_DATABASE_PATH
  ?? 'var/lib/platform/platform.sqlite';

const ROLES: WorkspaceRole[] = ['customer', 'staff', 'founder', 'developer'];

function actorFromEnvironment(): McpActor {
  const userId = process.env.MCP_ACTOR_USER_ID?.trim();
  const role = process.env.MCP_ACTOR_ROLE?.trim() as WorkspaceRole | undefined;
  const workspaceId = process.env.MCP_ACTOR_WORKSPACE_ID?.trim() || 'business';
  const outletIds = (process.env.MCP_ACTOR_OUTLETS ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(value => value.length > 0);
  const dealerOrgId = process.env.MCP_ACTOR_DEALER_ORG_ID?.trim();
  const membershipVersion = Number(process.env.MCP_ACTOR_MEMBERSHIP_VERSION ?? '1');

  if (!userId || !role || !ROLES.includes(role)) {
    throw new McpAccessError(
      'RUNTIME_NOT_READY',
      503,
      'MCP_ACTOR_USER_ID dan MCP_ACTOR_ROLE mesti ditetapkan untuk entry stdio.',
    );
  }

  return {
    userId,
    workspaceId,
    role,
    outletIds,
    membershipVersion: Number.isSafeInteger(membershipVersion) && membershipVersion > 0
      ? membershipVersion
      : 1,
    ...(dealerOrgId ? { dealerOrgId } : {}),
  };
}

function platformStore(): PlatformStore | undefined {
  const path = resolve(process.cwd(), DATABASE_PATH);
  if (!existsSync(path)) return undefined;
  return new PlatformStore(path);
}

export async function main(): Promise<void> {
  const actor = actorFromEnvironment();
  const server = createOperationsMcpServer({ actor, store: platformStore() });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Ralat tidak diketahui.';
    process.stderr.write(`[abangcolek-mcp] ${message}\n`);
    process.exitCode = 1;
  });
}
