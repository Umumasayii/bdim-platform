"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function NotConfigured() {
  return (
    <div className="grid gap-4">
      <Notice tone="info" title="Accounts are not enabled yet">
        This site is running in demo mode without an authentication provider. You can still use courses, practice and the Coding Lab — progress
        is saved in this browser. Accounts become available once Supabase is configured (see the README).
      </Notice>
      <ButtonLink href="/dashboard" variant="teal">
        Open my learning (demo)
      </ButtonLink>
    </div>
  );
}

const signInSchema = z.object({ email: z.email("Enter a valid email"), password: z.string().min(1, "Enter your password") });

export function SignInForm() {
  const db = getBrowserSupabase();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });
  if (!db) return <NotConfigured />;
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        const { error: err } = await db.auth.signInWithPassword(v);
        if (err) return setError(err.message === "Invalid login credentials" ? "Incorrect email or password." : err.message);
        router.replace(safeNext(params.get("next")));
        router.refresh();
      })}
    >
      {params.get("reset") === "1" ? <Notice tone="success">Your password was updated. Please sign in.</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="Email" htmlFor="si-email" error={formState.errors.email?.message}>
        <Input id="si-email" type="email" autoComplete="email" {...register("email")} aria-invalid={Boolean(formState.errors.email)} />
      </Field>
      <Field label="Password" htmlFor="si-password" error={formState.errors.password?.message}>
        <Input id="si-password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={Boolean(formState.errors.password)} />
      </Field>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="font-medium text-teal-700 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" variant="teal" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        New to BDIM?{" "}
        <Link href="/sign-up" className="font-semibold text-teal-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name").max(120),
    email: z.email("Enter a valid email"),
    password: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string(),
    terms: z.literal(true, { error: "Please accept the terms and privacy policy" }),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

export function SignUpForm() {
  const db = getBrowserSupabase();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState } = useForm<z.input<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema) });
  if (!db) return <NotConfigured />;
  if (sent) {
    return (
      <Notice tone="success" title="Check your email">
        We sent a confirmation link. Open it to activate your account, then sign in.
      </Notice>
    );
  }
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        const { data, error: err } = await db.auth.signUp({
          email: v.email,
          password: v.password,
          options: { data: { full_name: v.fullName }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
        });
        if (err) return setError(err.message);
        if (data.session) router.push("/dashboard");
        else setSent(true);
      })}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="Full name" htmlFor="su-name" error={formState.errors.fullName?.message}>
        <Input id="su-name" autoComplete="name" {...register("fullName")} />
      </Field>
      <Field label="Email" htmlFor="su-email" error={formState.errors.email?.message}>
        <Input id="su-email" type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="su-password" error={formState.errors.password?.message} hint="At least 10 characters.">
        <Input id="su-password" type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="su-confirm" error={formState.errors.confirm?.message}>
        <Input id="su-confirm" type="password" autoComplete="new-password" {...register("confirm")} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-teal-600" {...register("terms")} />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-teal-700 underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-teal-700 underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {formState.errors.terms ? <p className="mt-1 text-xs font-medium text-red-600">{formState.errors.terms.message}</p> : null}
      </div>
      <Button type="submit" variant="teal" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-teal-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const db = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  if (!db) return <NotConfigured />;
  if (state === "sent") return <Notice tone="success">If an account exists for {email}, a password reset link is on its way.</Notice>;
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!z.email().safeParse(email).success) return setError("Enter a valid email");
        setState("busy");
        const { error: err } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
        if (err) {
          setError(err.message);
          setState("idle");
        } else setState("sent");
      }}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="Email" htmlFor="fp-email">
        <Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" variant="teal" disabled={state === "busy"}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const db = getBrowserSupabase();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!db) return <NotConfigured />;
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 10) return setError("Use at least 10 characters.");
        if (password !== confirm) return setError("Passwords don't match.");
        setBusy(true);
        const { error: err } = await db.auth.updateUser({ password });
        setBusy(false);
        if (err) return setError(err.message.includes("session") ? "This reset link has expired. Request a new one." : err.message);
        await db.auth.signOut();
        router.push("/sign-in?reset=1");
      }}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="New password" htmlFor="rp-password" hint="At least 10 characters.">
        <Input id="rp-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Confirm new password" htmlFor="rp-confirm">
        <Input id="rp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" variant="teal" disabled={busy}>
        Update password
      </Button>
    </form>
  );
}
