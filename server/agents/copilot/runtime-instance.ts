/**
 * AbangColek Sovereign GrowthOS — Runtime Instance Singleton
 *
 * Satu-satunya `CopilotV2Runtime` yang dikongsi antara laluan awam
 * `/api/copilotkit` dan facade legasi `/api/platform/copilot/v2`.
 * Tiada state antara-runs yang sensitif disimpan: bajet, senarai calon dan
 * keputusan status dihitung semula bagi setiap run.
 */

import type { Actor } from '../../../shared/platform-contracts';
import { CopilotV2Runtime } from './runtime';

export const copilotRuntime = new CopilotV2Runtime();

/**
 * Actor tetamu yangmana DALAM SERVER untuk laluan origin awam.
 *
 * Ia bukan identiti yang disahkan oleh session pengguna dan ia TIDAK memberi
 * sebarang authority: runtime ini hanya menghasilkan inferensi teks, tiada
 * tindakan atau akses data yang memerlukan kebenaran. Identiti yang dihantar
 * oleh pelayar (`threadId`, `runId`, `userId` dalam badan) tidak pernah
 * digunakan untuk membina actor.
 */
export const PUBLIC_ORIGIN_ACTOR: Actor = {
  userId: 'public-origin-guest',
  workspaceId: 'public-origin',
  membershipVersion: 0,
};
