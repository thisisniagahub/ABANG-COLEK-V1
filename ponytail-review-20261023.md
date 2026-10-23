L6-7: stdlib: clsx & tailwind-merge imported for simple className join in utils.ts. Node runtime lacks localStorage these packages assume. Replace with native class joining: `inputs.filter(Boolean).join(' ')` or `inputs.map((c,i) => c ? `class-${i}` : '').filter(Boolean).join(' ')`.
L8: delete: import realData from '../data.json' in gemini.ts — data is never referenced in the file. Remove the import.
L4-395: yagni: INITIAL_PLUGINS array in pluginService.ts defines 25+ PluginItem configurations with full interfaces, but 20+ have installed:false/enabled:false — speculative abstractions with one implementation. Remove unused plugin definitions; keep only active ones (gmail, google_drive, github, vercel, supabase, redbus_freight).
L6-22: yagni: gemini.ts imports @google/genai + 8 Google API modules (googleForms, googleGmail, googleTasks, googleDocs, googleCalendar, googleSheets, googleMeet, googleChat) plus realData import. Many may be unused. Audit actual usage and trim to only required APIs.
L937-977: shrink: analyze_sales_performance manual loop builds monthly breakdown dict (41 lines). Replace with Object.fromEntries + map reduce pattern: `Object.fromEntries(Object.entries(monthlyBreakdown).map(([k,v]) => [k, Math.round(v*100)/100]))` — reduces ~15 lines.
L534-556: shrink: generateAgentWhatsAppMessage generates WhatsApp message with 23 lines of template literal. Consolidate into fewer template substitutions or helper function — 1 line per field insertion.
L561-575: shrink: generateDriverWhatsAppMessage 15 lines for driver message. Combine with generateAgentWhatsAppMessage shared prefix — extract common fields into variable.
L580-589: shrink: generateAgentToDriverMessage 10 lines. Merge with driver message logic — shared origin/destination info already present.

net: -25+ lines possible.

If there is nothing to cut, say `Lean already. Ship.` and stop.