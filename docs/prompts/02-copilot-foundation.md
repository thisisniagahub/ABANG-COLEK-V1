# Prompt 02 — Copilot Runtime, ADK, Identity dan Free Models

Baca [kontrak utama](IMPLEMENT-ABANGCOLEK.md), ADR dan checkpoint. Laksanakan Tasks1–2 dan FM-0..2 dalam pelan10feature. Jadikan CPK-01/09 berfungsi sebenar; jangan enable commands kewangan dahulu.

## Fail dan interface

Owner runtime: `server/agents/copilot/runtime.ts`, `identity.ts`, provider policy/adapter dan scoped tool registry. Owner Python: `agents/google-adk/pyproject.toml`, lockfile, `app.py`, `agent.py`, `tools.py`, `sessions.py`, tests. Owner UI: `src/features/copilot/provider.tsx`, chat dan adapter Workspace/Pet. Sesuaikan caller paths kepada manifest01.

Identity: browser principal -> server-verified limited grant -> ADK run/thread -> fresh canonical request. Session state/history bukan commerce authority. Agent server tidak menerima service-role key atau browser-controlled role.

## Langkah wajib

1. Tulis failing tests bagi forged workspace/user/role, revoked session/grant, history system/tool injection, count/size limits dan tool allowlist.
2. Confirm failure, pin dependencies ADR, resolve optional peers secara minimum dan simpan Bun/Python locks. Jika incompatible, rekod blocker; jangan tukar stack/versi sendiri.
3. Wujudkan Python3.12 environment isolated. Gunakan `uv sync --locked` selepas lock dijana, dan `uv run pytest tests`; fallback yang ditetapkan jika uv tiada ialah interpreter `.venv/Scripts/python.exe -m pip` dengan locked requirements dan `-m pytest tests`.
4. Implement runtime Fetch handler + HttpAgent kepada Python AG-UI bridge. Stable ID `abangcolek_ops`. Bind loopback port3020/8030 dan mount pada origin aplikasi melalui routing/proxy yang diuji; Vite SPA mesti kekal berfungsi.
5. Buktikan protocol lifecycle sebenar menggunakan synthetic provider. Jangan split completed answer menjadi perkataan dan claim native streaming.
6. Implement model free-only allowlist dan order ADR. Verify exact account/terms/all fees/privacy, tool/schema compatibility, no paid overflow, no hidden title/vision/eval calls. Candidate gagal -> skip bersebab; semua gagal -> local rules/unavailable.
7. Buang fixed margin/confidence dan fallback action claims. Provider label hanya menyatakan call yang benar-benar berjaya.
8. Isolate conversations dengan durable local ADK session store di `var/lib/copilot/` pada local pilot sahaja. Jangan share commerce SQLite file. Production Python/session hosting ialah explicit gate; jangan menganggap local path hidup di Vercel.
9. Wire one headless accessible BM/English chat, cancel/retry, source/status panel dan optional Pet. Kedua-duanya observe thread/run sama dan tidak menggandakan send.
10. Tool queries menggunakan fresh canonical requests; stream tidak memegang store commerce temporary. Uji store close, CAS conflict, browser abort dan provider timeout.

## Tests dan acceptance

TS auth/provider/protocol tests, Python bridge/session tests, Playwright chat/logout/thread-switch dan one actual permitted provider response selepas gates. Run CLI verify seperti kontrak utama. Model benchmark minimum60 synthetic cases menggunakan candidates yang layak; jika quota tiada, candidate/live row blocked, synthetic code tests masih boleh pass.

Code/security/Python reviewer mesti memeriksa identity boundary, exception handling dan provider routing. CPK-01/09 hanya verified untuk environment diuji. Tiada Intelligence auth/paid subscription dibuat dalam fasa ini. Update checkpoint untuk03B.
