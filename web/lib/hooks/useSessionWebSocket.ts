"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { decodeJwtPayload } from "@/lib/jwt";
import { getAccessToken } from "@/lib/auth";

/**
 * Собирает базовый WebSocket-origin из NEXT_PUBLIC_WS_URL или NEXT_PUBLIC_API_URL.
 */
function resolveWsOrigin(): string | null {
  const ws = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_WS_URL : undefined;
  if (ws) {
    return ws.replace(/\/$/, "");
  }
  const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  if (!api) return null;
  if (api.startsWith("https://")) {
    return `wss://${api.slice("https://".length)}`;
  }
  if (api.startsWith("http://")) {
    return `ws://${api.slice("http://".length)}`;
  }
  return null;
}

/**
 * По JWT (без верификации) берёт UUID пользователя для /ws/{user_id}.
 */
function userIdFromToken(): string | null {
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  if (!token) return null;
  const payload = decodeJwtPayload<{ sub?: string }>(token);
  return payload?.sub ?? null;
}

/**
 * После сообщений событий сессии инвалидирует React Query текущего экрана.
 */
export function useSessionWebSocket(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const origin = resolveWsOrigin();
    const uid = userIdFromToken();
    if (!origin || !uid) {
      return;
    }

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${origin}/ws/${uid}`);
    } catch {
      return;
    }

    ws.onmessage = (evt) => {
      try {
        const raw = evt.data as string;
        const msg = JSON.parse(raw) as { data?: { session_id?: string } };
        const sid = msg?.data?.session_id;
        if (typeof sid === "string" && sid.length > 0) {
          void qc.invalidateQueries({ queryKey: ["workout-session", sid] });
        }
      } catch {
        //
      }
    };

    ws.onerror = () => {
      ws?.close();
    };

    return () => {
      ws?.close();
    };
  }, [qc]);
}
