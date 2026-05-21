export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_MEDIA_URL ?? "";
  return `${base}/${path}`;
}
