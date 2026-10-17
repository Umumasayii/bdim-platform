import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "success" | "error";

const styles: Record<Tone, string> = {
  info: "border-navy-100 bg-navy-50 text-navy-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-leaf-200 bg-leaf-50 text-leaf-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

const icons = { info: Info, warning: AlertTriangle, success: CheckCircle2, error: XCircle };

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", styles[tone], className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "leading-relaxed")}>{children}</div> : null}
      </div>
    </div>
  );
}
