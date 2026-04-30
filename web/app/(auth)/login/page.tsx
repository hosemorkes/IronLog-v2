"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type FormEvent, useState } from "react";

import { apiUrl } from "@/lib/api";
import { AUTH_UI_COLORS, AUTH_UI_RADIUS } from "@/lib/constants/auth-ui";
import { getFastApiErrorMessage } from "@/lib/get-fastapi-error-message";
import { useAuthStore } from "@/lib/stores/authStore";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: AUTH_UI_RADIUS.input,
  border: `1px solid ${AUTH_UI_COLORS.border}`,
  backgroundColor: AUTH_UI_COLORS.bg2,
  color: AUTH_UI_COLORS.text,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: AUTH_UI_COLORS.text2,
  marginBottom: 6,
};

/**
 * Вход: email и пароль, сохранение access_token и переход на дашборд.
 */
export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      if (!res.ok) {
        const msg = await getFastApiErrorMessage(
          res,
          "Не удалось войти. Попробуйте ещё раз.",
        );
        setError(msg);
        return;
      }
      const data = (await res.json()) as { access_token: string };
      await login(data.access_token);
      router.replace("/dashboard");
    } catch {
      setError("Сеть недоступна или сервер не отвечает.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: AUTH_UI_RADIUS.card,
        border: `1px solid ${AUTH_UI_COLORS.border}`,
        backgroundColor: AUTH_UI_COLORS.bg2,
        padding: 28,
      }}
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-0.5px",
          color: AUTH_UI_COLORS.text,
          marginBottom: 8,
        }}
      >
        Вход
      </h1>
      <p style={{ fontSize: 14, color: AUTH_UI_COLORS.text2, marginBottom: 24 }}>
        IronLog — тренировочный трекер
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="login-email" style={labelStyle}>
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="login-password" style={labelStyle}>
            Пароль
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: AUTH_UI_RADIUS.input,
            border: "none",
            backgroundColor: AUTH_UI_COLORS.accent,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.85 : 1,
          }}
        >
          {submitting ? "Вход…" : "Войти"}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          style={{
            marginTop: 16,
            padding: "10px 12px",
            borderRadius: AUTH_UI_RADIUS.input,
            backgroundColor: AUTH_UI_COLORS.errorBg,
            border: `1px solid ${AUTH_UI_COLORS.errorBorder}`,
            color: AUTH_UI_COLORS.errorText,
            fontSize: 14,
          }}
        >
          {error}
        </p>
      ) : null}

      <p style={{ marginTop: 22, textAlign: "center", fontSize: 14 }}>
        <span style={{ color: AUTH_UI_COLORS.text2 }}>Нет аккаунта? </span>
        <Link
          href="/signup"
          style={{ color: AUTH_UI_COLORS.accent, fontWeight: 600 }}
        >
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
