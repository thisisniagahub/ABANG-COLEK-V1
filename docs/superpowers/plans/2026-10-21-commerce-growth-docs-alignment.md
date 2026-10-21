# Commerce Growth Documentation Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Task ini hanya dokumentasi; pengguna telah mengarahkan pelaksanaan alignment dan handover, bukan implementasi aplikasi.

**Goal:** Selaraskan seluruh Markdown projek yang berkaitan dengan kedai Agent/Stokis, ordering, retention dan referral serta sediakan handover deterministik tanpa mengubah bukti penerimaan.

**Architecture:** Blueprint kekal kontrak produk; satu spesifikasi commerce-growth memperincikan keputusan dan acceptance tambahan di bawah 85 ID sedia ada. Prompt aktif merujuk spesifikasi yang sama. Dokumen sejarah kekal rekod sejarah dengan konteks supersession, generated ledger/checklist dan vendor skills dipelihara.

**Tech Stack:** Markdown dalam repo React/Vite + Bun; tiada pertukaran stack atau dependency.

**Spec:** `docs/ABANGCOLEK-MASTER-GROWTH-BLUEPRINT.md` §8 dan kedua-dua research dealer/Ahmad’s bertarikh 21 Oktober 2026.

## Global Constraints

- Setiap Agent/Stokis aktif mendapat Online Store public sendiri dan Dealer Workspace private; pendaftaran tidak memerlukan pembelian dahulu.
- Referral pelanggan satu peringkat; lima tingkat MadConomy dan kadarnya bukan keputusan ABANGCOLEK.
- Wang integer sen; authority server; store owner/referrer/fulfilment/reward ledger dipisahkan.
- Tiada kadar, polisi, credential, deploy, tick siap atau hasil ujian direka.
- Tiada edit source aplikasi, vendor skills atau generated acceptance tanpa evidence; kekalkan perubahan pihak lain dan jangan commit.

## Review Focus

- Dokumen lama menyekat pengalaman dealer kerana hanya empat role source diperhatikan.
- Prompt lama mengarahkan edit manual generated checklist atau menggunakan worktree lapuk.
- Wallet/rewards/referral bercampur sehingga pembeli dianggap boleh withdraw atau menerima komisen dealer.
- Unit tests atau bukti lama dianggap menutup acceptance tambahan kedai individu.
- Referral mengatasi store identity atau retry/refund menghasilkan atribusi/ganjaran berganda.

## Tasks

- [x] Inventori Markdown milik projek, klasifikasikan aktif/sejarah/generated/vendor dan simpan hash sebelum edit.
- [x] Audit dokumen aktif dan prompt secara read-only dengan ownership terhad; petakan percanggahan.
- [x] Tulis spesifikasi commerce-growth, handover, sub-checklist dan keputusan/gate komersial yang jelas.
- [x] Kemas kini blueprint, design, architecture, source-of-truth, indeks, prompts, QA/release/recovery dan backlog yang berkaitan.
- [x] Tambah konteks pada dokumen sejarah relevan tanpa menulis semula claim bertarikh; jangan ubah generated receipts.
- [x] Semak semua pautan tempatan, anchor bagi fail yang disentuh, fences, whitespace, konsistensi istilah dan hash fail dilindungi.
- [x] Jalankan independent read-only review dan baiki finding; terbitkan inventori disposition serta laporan alignment.

## Handoff

Serahkan satu entry prompt copy-ready dengan read order, fixed decisions, ownership, skills/MCP sebenar atau fallback, urutan implementation, ujian negatif/browser, ledger rules dan continuation. Checklist dokumentasi boleh ditutup selepas verifikasi; checklist aplikasi kekal berasaskan receipt.
