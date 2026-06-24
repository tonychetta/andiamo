"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { redeemInviteCode } from "@/app/coach/actions";

type Mode = "signin" | "signup";
type Role = "artist" | "coach";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("artist");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  // Surface an error passed back from the email-confirmation route.
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e) setError(e);
  }, []);

  async function applyCodeAndGo() {
    if (inviteCode.trim()) {
      const r = await redeemInviteCode(inviteCode);
      if (!r.ok) {
        setError(r.error ?? "Couldn't apply invite code.");
        setLoading(false);
        return;
      }
    }
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      await applyCodeAndGo();
      return;
    }

    // signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, account_type: role },
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/confirm`
            : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      await applyCodeAndGo();
      return;
    }
    // Email confirmation is on — show a clear "check your inbox" screen.
    setPendingConfirm(email);
    setLoading(false);
  }

  const isSignup = mode === "signup";

  if (pendingConfirm) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <Logo variant="icon" width={56} height={56} />
          <h1 className="mt-5 font-serif text-3xl text-ink">Check your email</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            We sent a confirmation link to{" "}
            <span className="text-ink">{pendingConfirm}</span>. Open it to finish
            setting up your account — it&apos;ll bring you right back in.
          </p>
          <button
            onClick={() => {
              setPendingConfirm(null);
              setMode("signin");
            }}
            className="mt-6 text-sm text-ink underline underline-offset-4"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo variant="icon" width={56} height={56} />
          <h1 className="mt-5 font-serif text-3xl text-ink">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {isSignup
              ? "Start building the structure your career runs on."
              : "Sign in to keep the work moving."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {isSignup && (
            <Field
              label="Name"
              value={name}
              onChange={setName}
              type="text"
              autoComplete="name"
              required
            />
          )}

          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            required
          />

          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />

          {isSignup && (
            <div>
              <span className="mb-1.5 block text-sm text-ink">Account type</span>
              <div className="grid grid-cols-2 gap-2">
                {(["artist", "coach"] as Role[]).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-xl border px-4 py-2.5 text-sm capitalize transition-colors ${
                      role === r
                        ? "border-ink bg-surface-accent text-ink"
                        : "border-line bg-surface-secondary text-ink-soft hover:text-ink"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(!isSignup || role === "artist") && (
            <Field
              label="Invite code (optional)"
              value={inviteCode}
              onChange={setInviteCode}
              type="text"
              autoComplete="off"
            />
          )}

          {error && <p className="text-sm text-red-700">{error}</p>}
          {info && <p className="text-sm text-ink">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ink py-3 font-medium text-surface-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? "One moment…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          {isSignup ? "Already have an account?" : "New to Andiamo?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "signin" : "signup");
              setError(null);
              setInfo(null);
            }}
            className="text-ink underline underline-offset-4"
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-xl border border-line bg-surface-secondary px-4 py-3 text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-ink"
      />
    </label>
  );
}

function PasswordField({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink">Password</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className="w-full rounded-xl border border-line bg-surface-secondary px-4 py-3 pr-12 text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-ink"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-soft transition-colors hover:text-ink"
        >
          {show ? <EyeSlash size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </label>
  );
}
