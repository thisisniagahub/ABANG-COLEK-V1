/**
 * AbangColek Sovereign GrowthOS — MCP first-party canonical (Vercel-discovered)
 * Route: /api/copilot-mcp
 *
 * Laluan kanonikal MCP pihak pertama (blueprint §5.1). Ia FACADE, bukan
 * pelayan kedua: fail ini hanya mengeksport semula pengendali default
 * `api/mcp.ts` — implementasi, auth (resolusi actor daripada sesi server),
 * peta sesi MCP dan ralat ditaip yang SAMA. Tiada salinan logik protokol,
 * tiada authority berbeza, tiada pangkalan data kedua.
 *
 * Vercel menemui fail ini sebagai fungsi `api/copilot-mcp.ts` supaya
 * `/api/copilot-mcp` sampai ke pengendali (hari ini 404 di produksi);
 * `vercel.json` menghantar semula subpath `/api/copilot-mcp/:route*` kepada
 * fungsi ini dan mengecualikan `/api/*` daripada rewrite SPA.
 *
 * Kesannya: sesi MCP yang dibuka melalui `/api/mcp` sah di `/api/copilot-mcp`
 * dan sebaliknya, kerana kedua-dua laluan memanggil objek yang sama.
 */

export { default } from './mcp';
