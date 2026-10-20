/**
 * AbangColek Sovereign GrowthOS — Telemetry opt-out
 *
 * Platform ini tidak menghantar sebarang telemetri keluar. Modul ini
 * ditetapkan sebagai import PERTAMA dalam laluan CopilotKit supaya
 * `@copilotkit/runtime` membaca flag ini semasa ia dimuatkan.
 *
 * Penandaan: import ini mesti kekal sebagai baris import pertama dalam
 * `api/copilotkit.ts`.
 */

if (!process.env.COPILOTKIT_TELEMETRY_DISABLED) {
  process.env.COPILOTKIT_TELEMETRY_DISABLED = 'true';
}

export const COPILOTKIT_TELEMETRY_DISABLED = true;
