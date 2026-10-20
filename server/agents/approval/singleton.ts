/**
 * AbangColek Sovereign GrowthOS — Process-wide approval store singleton
 *
 * `ABANGCOLEK_APPROVAL_STORE_PATH` selects a durable file-backed store. Without
 * it the process falls back to an in-memory store — and every tool output says
 * so through `persistence: 'in_memory' | 'file'` so evidence never overclaims.
 */

import { FileApprovalStore, MemoryApprovalStore, type ApprovalStore } from './store';

let instance: ApprovalStore | null = null;

export function getDefaultApprovalStore(): ApprovalStore {
  if (instance) return instance;
  const path = process.env.ABANGCOLEK_APPROVAL_STORE_PATH;
  instance = path && path.trim() ? new FileApprovalStore(path.trim()) : new MemoryApprovalStore();
  return instance;
}

/** Test seam: replaces the process singleton with an explicit store. */
export function setDefaultApprovalStore(store: ApprovalStore | null): void {
  instance = store;
}
