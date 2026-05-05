"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { apiUrl } from "@/lib/api";
import { getFastApiErrorMessage } from "@/lib/get-fastapi-error-message";
import { useAuthStore } from "@/lib/stores/authStore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] text-gray-900 outline-none ring-1 ring-transparent transition placeholder:text-gray-400 focus:border-accent/40 focus:ring-accent/35 dark:border-[#232323] dark:bg-[#232323]/60 dark:text-white dark:placeholder:text-[#888]";

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-gray-100 p-7 dark:border-[#232323] dark:bg-[#1a1a1a]">
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
        Регистрация
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-[#888]">
        Создайте аккаунт IronLog
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="signup-username"
            className="mb-1.5 block text-[13px] font-semibold text-gray-700 dark:text-white"
          >
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
            className={inputClass}
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="signup-email"
            className="mb-1.5 block text-[13px] font-semibold text-gray-700 dark:text-white"
          >
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
            className={inputClass}
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="signup-password"
            className="mb-1.5 block text-[13px] font-semibold text-gray-700 dark:text-white"
          >
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
            className={inputClass}
          />
        </div>
        <div className="mb-5">
          <label
            htmlFor="signup-password2"
            className="mb-1.5 block text-[13px] font-semibold text-gray-700 dark:text-white"
          >
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
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-accent px-4 py-3.5 text-[15px] font-bold text-white transition hover:bg-accent-dark disabled:cursor-wait disabled:opacity-85"
        >
          {submitting ? "Регистрация…" : "Зарегистрироваться"}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-[#3d2020] dark:bg-[#2d1a1a] dark:text-[#e06060]"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-[22px] text-center text-sm">
        <span className="text-gray-500 dark:text-[#888]">Уже есть аккаунт? </span>
        <Link href="/login" className="font-semibold text-accent">
          Войти
        </Link>
      </p>
    </div>
  );
}
