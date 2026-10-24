// Gunakan pengukuran bersama supaya kegagalan ujian tidak pernah diterbitkan sebagai lulus.
import { runEvidenceCli } from './write-measured-evidence-20261021';

if (import.meta.main) runEvidenceCli([...process.argv.slice(2), '--only', 'sec01']);
