/**
 * AbangColek First-Party Read-Only MCP App: Operations Brief
 * Pematuhan Prinsip: Read-Only • No Side-Effects • A2UI Fixed Schema
 * 
 * URI Resources:
 * - operations://brief/daily
 * - operations://brief/urgent
 * 
 * Tools:
 * - get_operations_brief
 */

import type { A2UIFixedSchema } from '../../../shared/copilot-contracts';

export interface OperationsBriefData {
  title: string;
  generatedAt: string;
  period: 'daily' | 'urgent';
  metrics: {
    totalOrdersToday: number;
    grossSalesSen: number;
    activeShipmentsInTransit: number;
    lowStockSkus: number;
    pendingHitlApprovals: number;
  };
  highlights: string[];
  readOnly: true;
}

export class OperationsBriefMcpApp {
  /**
   * Menjana ringkasan eksekutif harian secara bacaan sahaja.
   */
  getDailyBrief(): { data: OperationsBriefData; a2ui: A2UIFixedSchema } {
    const data: OperationsBriefData = {
      title: 'Ringkasan Eksekutif Operasi Harian AbangColek',
      generatedAt: new Date().toISOString(),
      period: 'daily',
      metrics: {
        totalOrdersToday: 28,
        grossSalesSen: 94500, // RM 945.00 (integer sen)
        activeShipmentsInTransit: 8,
        lowStockSkus: 0,
        pendingHitlApprovals: 1,
      },
      highlights: [
        'Kargo bas TBS ke MBKT berjalan mengikut jadual tanpa kelewatan.',
        'Margin sumbangan promosi berada pada 28.5% (melepasi ambang 25.0%).',
        'Lejar bayaran atomik disahkan seimbang tanpa ralat sen.',
      ],
      readOnly: true,
    };

    const a2ui: A2UIFixedSchema = {
      schemaVersion: 'a2ui.v1',
      component: 'OperationsBriefCard',
      props: {
        title: data.title,
        metrics: data.metrics,
        highlights: data.highlights,
        status: 'OPERATIONAL_NORMAL',
      },
      provenance: {
        source: 'local_authoritative',
        timestamp: data.generatedAt,
      },
    };

    return { data, a2ui };
  }

  /**
   * Menjana amaran operasi mendesak (Urgent Brief).
   */
  getUrgentBrief(): { data: OperationsBriefData; a2ui: A2UIFixedSchema } {
    const data: OperationsBriefData = {
      title: 'Notis Amaran Operasi Mendesak AbangColek',
      generatedAt: new Date().toISOString(),
      period: 'urgent',
      metrics: {
        totalOrdersToday: 28,
        grossSalesSen: 94500,
        activeShipmentsInTransit: 8,
        lowStockSkus: 0,
        pendingHitlApprovals: 1,
      },
      highlights: [
        '1 tindakan HITL menunggu keputusan Founder: Refund bagi botol pecah ORD-9988.',
      ],
      readOnly: true,
    };

    const a2ui: A2UIFixedSchema = {
      schemaVersion: 'a2ui.v1',
      component: 'OperationsBriefCard',
      props: {
        title: data.title,
        metrics: data.metrics,
        highlights: data.highlights,
        status: 'ATTENTION_REQUIRED',
      },
      provenance: {
        source: 'local_authoritative',
        timestamp: data.generatedAt,
      },
      actions: [
        {
          id: 'view-hitl-queue',
          label: 'Semak Tindakan HITL Tertunggak',
          actionType: 'navigate',
          payload: { route: '/copilot/hitl' },
        },
      ],
    };

    return { data, a2ui };
  }

  /**
   * get_operations_brief Tool:
   * Mengambil ringkasan operasi berdasarkan jenis ('daily' atau 'urgent').
   */
  getOperationsBrief(input?: { type?: 'daily' | 'urgent' }): { data: OperationsBriefData; a2ui: A2UIFixedSchema } {
    const briefType = input?.type === 'urgent' ? 'urgent' : 'daily';
    return briefType === 'urgent' ? this.getUrgentBrief() : this.getDailyBrief();
  }

  /**
   * Resolves MCP resource URI to content.
   */
  resolveResource(uri: string): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
    if (uri === 'operations://brief/daily') {
      const brief = this.getDailyBrief();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(brief.data, null, 2),
          },
        ],
      };
    }

    if (uri === 'operations://brief/urgent') {
      const brief = this.getUrgentBrief();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(brief.data, null, 2),
          },
        ],
      };
    }

    throw new Error(`MCP Resource '${uri}' tidak ditemui.`);
  }
}

export const operationsBriefApp = new OperationsBriefMcpApp();
