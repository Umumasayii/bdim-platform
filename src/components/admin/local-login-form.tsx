"use client";

import { useActionState } from "react";
import { localAdminLogin } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

export function LocalAdminLoginForm() {
  const [state, action, pending] = useActionState(localAdminLogin, null);
  return (
    <form action={action} className="grid gap-4">
      {state && !state.ok ? <Notice tone="error">{state.message}</Notice> : null}
      <Field label="Admin password" htmlFor="admin-password">
        <Input id="admin-password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" variant="teal" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
