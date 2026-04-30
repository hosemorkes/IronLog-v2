type FastApiDetail =
  | string
  | Array<{ msg?: string; loc?: unknown }>
  | Record<string, unknown>;

/**
 * Прочитать `detail` из JSON-ответа FastAPI или вернуть запасной текст.
 */
export async function getFastApiErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: FastApiDetail };
    const detail = data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      const parts = detail
        .map((item) => (typeof item?.msg === "string" ? item.msg : null))
        .filter(Boolean);
      if (parts.length > 0) {
        return parts.join(". ");
      }
    }
  } catch {
    /* не JSON */
  }
  return fallback;
}
