/** Production function limit, including multipart headers and entity metadata. */
export const MAX_PLATFORM_REQUEST_BYTES = 4_000_000;
/** Reserve request headroom so a file accepted by the UI can reach production. */
export const MAX_EVIDENCE_FILE_BYTES = 3_800_000;

export function evidenceFileSizeAllowed(size: number): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= MAX_EVIDENCE_FILE_BYTES;
}
