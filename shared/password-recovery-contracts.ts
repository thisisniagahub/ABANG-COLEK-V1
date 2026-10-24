/**
 * PC-01 — Kontrak pemulihan kata laluan.
 *
 * Semua entiti di sini adalah public (bisa dibaca pelayar) dan tidak mengandungi
 * sebarang kredensial hased. Status recovery tidak boleh mengungkap sama ada
 * akaun wujud — response adalah sama untuk email yang dikenal dan tidak dikenal
 * (prinsip anti-enumeration).
 *
 * Prinsip kontrak:
 * 1. Response awam mengandungi hanya `accepted` dan mesej fixed — tiada info
 *    tentang wujud akaun.
 * 2. Kredensial sentiasa disalvaged (salted hash); tiada plaintext disimpan.
 * 3. Kredensial expiring 15 minit, sehingga 5 usaha perCredential.
 * 4. Permainan berjaya membatalkan semua sesi pengguna.
 */

// -- Status permintaan recovery --

export type PasswordRecoveryRequestStatus =
  | 'pending'
  | 'code_issued'
  | 'completed'
  | 'expired';

// -- Status penghantaran email --

export type PasswordRecoveryEmailDeliveryStatus = 'sent' | 'failed' | 'unavailable';

// -- View untuk senarai founder (tidak mengandungi hash kredensial) --

export interface PasswordRecoveryRequestView {
  id: string;
  requestId: string;
  maskedEmail: string;
  userDisplayName: string;
  status: PasswordRecoveryRequestStatus;
  createdAt: string;
  expiresAt: string | null;
  emailDeliveryStatus: PasswordRecoveryEmailDeliveryStatus;
  revision: number;
}

// -- Code yang dikeluarkan oleh founder (ditampilkan sekali sahaja) --

export interface PasswordRecoveryIssueCodeView {
  credential: string; // credential terhashed (salted hash) yang boleh digunakan sekali
  expiresAt: string;  // WAKTU EXPIRY dalam ISO string
}

// -- Response awam: request kata laluan --

export interface PasswordRecoveryRequestResponse {
  accepted: true;
  message: string; // mesej anti-enumeration yang fixed
}

// -- Response awam: reset kata laluan --

export interface PasswordRecoveryResetResponse {
  reset: true;
}

// -- Payload permintaan awam (hanya email) --

export interface PasswordRecoveryRequestBody {
  email: string;
}

// -- Payload reset (credential + newPassword) --

export interface PasswordRecoveryResetBody {
  credential: string;
  newPassword: string;
}