import { cn } from "@/lib/utils";

/** Round profile picture, falling back to initials when no photo is set. */
export function Avatar({ src, name, className }: { src?: string; name: string; className?: string }) {
  const initials =
    name
      .replace(/@.*/, "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded image from Supabase Storage or a local data URL
    return <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover ring-1 ring-line", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy-700 to-teal-600 text-xs font-bold text-white", className)}
    >
      {initials}
    </span>
  );
}
