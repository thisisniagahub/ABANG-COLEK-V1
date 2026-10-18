import { useState } from 'react';
import { CheckCircle2, Cpu, Database, Globe, KeyRound, Radio, RefreshCw, Settings as SettingsIcon, Shield, Sliders, ToggleLeft, ToggleRight } from 'lucide-react';
import type { RedactedHealth } from '../../../shared/platform-contracts';
import { api, useResource } from '../platform/client';
import { RuntimeControls } from './RuntimeControls';
import { PersonalOperationalSettings } from './OperationalAmendments';
import { Empty, Panel, Refresh, ResourceState, Status } from './ui';

export function DeveloperSettings({ onChanged }: { onChanged?: () => void }) {
  const health = useResource<RedactedHealth[]>('/health');
  const database = !health.loading && !health.error ? health.data?.find(item => item.component === 'platform_database') : undefined;

  return (
    <div className="xp-developer-settings">
      <section className="xp-developer-banner">
        <SettingsIcon size={32} />
        <div>
          <p className="xp-eyebrow">Runtime Controls & Safe Diagnostics</p>
          <h2>Developer Configuration & Settings</h2>
          <p>Kawalan runtime, mod pelepasan sistem (release mode), dan status integrasi penyedia tanpa pendedahan rahsia.</p>
        </div>
      </section>

      <Panel title="Kawalan Runtime Sistem" eyebrow="Safe Administrative Operations">
        <RuntimeControls />
      </Panel>

      <Panel title="Status Integrasi & Konfigurasi Penyedia" eyebrow="Observed Adapters Readiness" action={<Refresh onClick={health.reload} />}>
        <ResourceState {...health} />
        <div className="xp-detail-grid">
          <div className="xp-setting-card">
            <div className="xp-setting-card-header">
              <Database size={20} />
              <Status value={database?.status ?? 'unavailable'} />
            </div>
            <h3>Pangkalan Data Utama</h3>
            <p>{!database ? 'Status pangkalan data belum dapat disahkan. Muat semula diagnostik.' : database.reasonCode === 'SUPABASE_SNAPSHOT' ? 'Snapshot Supabase berautoriti dengan commit revision atomik. SQLite sementara digunakan untuk setiap permintaan.' : 'SQLite tempatan berautoriti dengan transaksi atomik.'}</p>
            <small>{database ? `Pemerhatian server: ${database.observedAt}` : 'Tiada pemerhatian server yang tersedia.'}</small>
          </div>

          <div className="xp-setting-card">
            <div className="xp-setting-card-header">
              <Cpu size={20} />
              <Status value="unavailable" />
            </div>
            <h3>Hermes AI Runtime</h3>
            <p>Penyambung tugas berasaskan kontrak baca sahaja. Tiada mutasi pangkalan data tanpa kelulusan founder.</p>
            <small>Status: ADAPTER_NOT_VERIFIED · Sifar kos</small>
          </div>

          <div className="xp-setting-card">
            <div className="xp-setting-card-header">
              <Globe size={20} />
              <Status value="unavailable" />
            </div>
            <h3>Pemasaran Sosial (Postiz)</h3>
            <p>Eksport manual aktif. Penerbitan terus disekat sehingga kelulusan saluran sebenar diperoleh.</p>
            <small>Status: REMOTE_PUBLISH_DISABLED</small>
          </div>

          <div className="xp-setting-card">
            <div className="xp-setting-card-header">
              <Radio size={20} />
              <Status value="unavailable" />
            </div>
            <h3>WhatsApp Cloud API</h3>
            <p>Aliran web terpimpin (first-party) aktif untuk pelanggan. Integrasi native API Cloud ditutup.</p>
            <small>Status: FEATURE_DISABLED</small>
          </div>
        </div>
      </Panel>

      <Panel title="Polisi Keselamatan & Had Sumber" eyebrow="Enforced Boundaries">
        <div className="xp-detail-grid">
          <div>
            <Status value="active" />
            <h3>Same-Origin API JSON</h3>
            <p>Semua permintaan mutasi POST wajib menyertakan pengepala Origin yang sah dan token CSRF.</p>
          </div>
          <div>
            <Status value="active" />
            <h3>Pengasingan Hak Akses</h3>
            <p>Akses pemaju disekat daripada melihat data kewangan, pesanan pelanggan, atau kelulusan pembayaran.</p>
          </div>
          <div>
            <Status value="active" />
            <h3>Penyimpanan Rahsia Selamat</h3>
            <p>Tiada kunci API atau token yang didedahkan dalam respons API atau log klien.</p>
          </div>
        </div>
      </Panel>

      <PersonalOperationalSettings role="developer" onChanged={onChanged} />
    </div>
  );
}
