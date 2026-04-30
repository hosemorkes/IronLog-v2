import { getAccessToken } from "./auth";

/**
 * Базовый URL API. Задаётся в .env.local (см. .env.local.example).
 */
const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "";

/**
 * Собрать полный путь к эндпоинту FastAPI.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE) {
    return p;
  }
  return `${API_BASE}/api${p}`;
}

/**
 * fetch к API IronLog с Bearer из localStorage (если есть).
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = apiUrl(path);
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}
