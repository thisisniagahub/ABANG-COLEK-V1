/**
 * AbangColek Sovereign GrowthOS — MCP Apps metadata helpers
 *
 * `@modelcontextprotocol/ext-apps` menyasarkan types kepada stack MCP v2,
 * sedangkan enjin protokol dalam repo ini ialah `@modelcontextprotocol/sdk`
 * v1.32.1. Modul ini menjadi jambatan yang TIDAK meneka-neka: ia membina
 * metadata `_meta.ui` mengikut bentuk yang dinyatakan oleh MCP Apps, dan
 * mengesahkannya dengan schema rasmi `McpUiResourceMetaSchema` daripada
 * `@modelcontextprotocol/ext-apps`.
 *
 * Metadata yang dijana:
 * - `ui.resourceUri` (bentuk moden) DAN `ui/resourceUri` (bentuk legasi) —
 *   hos yang menyokong salah satu bentuk tetap boleh mencari resource UI.
 * - `ui.csp` — senarai domain untuk `connect`/`resource`/`frame`/`base-uri`.
 *   Senarai kosong bermakna "tiada domain dibenarkan" (lalaian selamat).
 */

import {
  McpUiResourceMetaSchema,
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
} from '@modelcontextprotocol/ext-apps';

/** MIME type rasmi resource UI MCP Apps. */
export { RESOURCE_MIME_TYPE };

export interface McpAppCsp {
  connectDomains?: string[];
  resourceDomains?: string[];
  frameDomains?: string[];
  baseUriDomains?: string[];
}

export interface McpAppToolMeta {
  /** URI resource UI yang memaparkan output tool. */
  resourceUri: string;
  /** `model` = kelihatan pada model; `app` = hanya boleh dipanggil oleh UI. */
  visibility?: Array<'model' | 'app'>;
}

export interface McpAppResourceMeta {
  prefersBorder?: boolean;
  csp?: McpAppCsp;
}

/**
 * Membina `_meta` bagi tool MCP App.
 *
 * Bentuk moden (`ui.resourceUri`) dan bentuk legasi (`ui/resourceUri`) diisi
 * serentak supaya kedua-dua generasi hos dapat membaca resource UI.
 */
export function buildAppToolMeta(meta: McpAppToolMeta): Record<string, unknown> {
  const uri = meta.resourceUri;
  if (!uri.startsWith('ui://')) {
    throw new Error(`Resource UI MCP mesti bermula dengan "ui://": ${uri}`);
  }
  const ui: Record<string, unknown> = { resourceUri: uri };
  if (meta.visibility) ui.visibility = meta.visibility;
  return {
    ui,
    [RESOURCE_URI_META_KEY]: uri,
  };
}

/**
 * Membina `_meta` bagi resource UI MCP Apps dan mengesahkannya dengan schema
 * rasmi MCP Apps. Skema yang tidak sah akan melontar — metadata yang salah
 * ditolak lebih awal, bukan semasa hos memaparkannya.
 */
export function buildAppResourceMeta(meta: McpAppResourceMeta): Record<string, unknown> {
  const ui: Record<string, unknown> = {};
  if (meta.prefersBorder !== undefined) ui.prefersBorder = meta.prefersBorder;
  if (meta.csp) {
    ui.csp = {
      ...(meta.csp.connectDomains ? { connectDomains: meta.csp.connectDomains } : {}),
      ...(meta.csp.resourceDomains ? { resourceDomains: meta.csp.resourceDomains } : {}),
      ...(meta.csp.frameDomains ? { frameDomains: meta.csp.frameDomains } : {}),
      ...(meta.csp.baseUriDomains ? { baseUriDomains: meta.csp.baseUriDomains } : {}),
    };
  }
  const parsed = McpUiResourceMetaSchema.safeParse(ui);
  if (!parsed.success) {
    throw new Error(`Metadata resource UI MCP tidak sah: ${parsed.error.message}`);
  }
  return { ui: parsed.data };
}
