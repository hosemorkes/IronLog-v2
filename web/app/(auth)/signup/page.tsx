"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type FormEvent, useState } from "react";

import { apiUrl } from "@/lib/api";
import { AUTH_UI_COLORS, AUTH_UI_RADIUS } from "@/lib/constants/auth-ui";
import { getFastApiErrorMessage } from "@/lib/get-fastapi-error-message";
import { useAuthStore } from "@/lib/stores/authStore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Регистрация: проверка email и совпадения паролей, автологин при успехе.
 */
export default function SignupPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const emailTrim = email.trim().toLowerCase();
    if (!EMAIL_RE.test(emailTrim)) {
      setError("Укажите корректный email.");
      return;
    }
    if (password !== password2) {
      setError("Пароли не совпадают.");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/auth/signup"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: emailTrim,
          password,
        }),
      });
      if (res.status === 409) {
        setError("Email или имя уже заняты");
        return;
      }
      if (!res.ok) {
        const msg = await getFastApiErrorMessage(
          res,
          "Регистрация не удалась. Попробуйте ещё раз.",
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
        Регистрация
      </h1>
      <p style={{ fontSize: 14, color: AUTH_UI_COLORS.text2, marginBottom: 24 }}>
        Создайте аккаунт IronLog
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="signup-username" style={labelStyle}>
            Имя пользователя
          </label>
          <input
            id="signup-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={1}
            maxLength={64}
            value={username}
            onChange={(ev) => setUsername(ev.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="signup-email" style={labelStyle}>
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="signup-password" style={labelStyle}>
            Пароль
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="signup-password2" style={labelStyle}>
            Подтверждение пароля
          </label>
          <input
            id="signup-password2"
            name="password2"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={password2}
            onChange={(ev) => setPassword2(ev.target.value)}
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
          {submitting ? "Регистрация…" : "Зарегистрироваться"}
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
        <span style={{ color: AUTH_UI_COLORS.text2 }}>Уже есть аккаунт? </span>
        <Link
          href="/login"
          style={{ color: AUTH_UI_COLORS.accent, fontWeight: 600 }}
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
