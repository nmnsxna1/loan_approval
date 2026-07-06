export function getUploadUrl(fileName: string): string {
  const base = import.meta.env.VITE_UPLOADS_URL || '';
  return `${base}/uploads/${fileName}`;
}
