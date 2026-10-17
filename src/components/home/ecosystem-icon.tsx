import { BarChart3, BrainCircuit, ClipboardList, Code2, LayoutDashboard, Map, Sigma, Target, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = { BarChart3, BrainCircuit, ClipboardList, Code2, LayoutDashboard, Map, Sigma, Target };

export function EcosystemIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? BarChart3;
  return <Icon className={className} aria-hidden />;
}
