/**
 * Без верификации подписи: извлекает JWT payload (дисплея `sub`).
 */
export function decodeJwtPayload<T extends Record<string, unknown>>(
  token: string,
): T | null {
  try {
    const segments = token.split(".");
    if (segments.length < 2 || !segments[1]) {
      return null;
    }
    const normalized = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4;
    const padded =
      pad === 0 ? normalized : `${normalized}${"=".repeat(4 - pad)}`;
    const json = typeof atob === "function" ? atob(padded) : "";
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
