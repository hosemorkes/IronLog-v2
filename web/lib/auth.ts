/**
 * Клиентские токены доступа для вызова защищённых эндпоинтов FastAPI.
 * Устанавливается кодом авторизации после логина (`ironlog_access_token`).
 */
const ACCESS_STORAGE_KEY = "ironlog_access_token";

/**
 * Bearer-токен из localStorage или null.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_STORAGE_KEY);
}

/**
 * Сохранить access-токен (вызывает экран авторизации после внедрения).
 */
export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (token === null || token === "") {
    window.localStorage.removeItem(ACCESS_STORAGE_KEY);
  } else {
    window.localStorage.setItem(ACCESS_STORAGE_KEY, token);
  }
}
