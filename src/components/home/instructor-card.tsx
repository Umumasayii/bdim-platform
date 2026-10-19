import Image from "next/image";
import { ExternalLink, UserRound } from "lucide-react";
import type { InstructorProfile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function InstructorCard({ profile }: { profile: InstructorProfile }) {
  const initials = profile.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  const hasDetails = profile.bio || profile.expertise.length || profile.teachingInterests.length;
  return (
    <div className="grid grid-cols-1 gap-8 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="relative aspect-square w-full max-w-56 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-teal-700">
        {profile.photoUrl ? (
          <Image src={profile.photoUrl} alt={`Portrait of ${profile.name}`} fill sizes="224px" className="object-cover" unoptimized={profile.photoUrl.startsWith("http")} />
        ) : (
          <div className="grid size-full place-items-center text-white">
            <span className="text-5xl font-bold tracking-tight">{initials}</span>
            <span className="sr-only">Photo not yet added</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">Instructor</p>
        <h3 className="mt-1 text-2xl font-bold text-navy-950">{profile.name}</h3>
        {profile.title ? <p className="mt-1 text-muted">{profile.title}</p> : null}

        {hasDetails ? (
          <>
            {profile.bio ? <p className="mt-4 leading-relaxed text-navy-900">{profile.bio}</p> : null}
            {profile.expertise.length ? (
              <div className="mt-5">
                <p className="text-sm font-semibold text-navy-950">Expertise</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.expertise.map((e) => (
                    <Badge key={e} tone="teal">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {profile.teachingInterests.length ? (
              <div className="mt-4">
                <p className="text-sm font-semibold text-navy-950">Teaching interests</p>
                <p className="mt-1 text-sm text-muted">{profile.teachingInterests.join(" · ")}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface p-4 text-sm text-muted">
            <UserRound className="mt-0.5 size-4 shrink-0" aria-hidden />
            A full instructor profile — biography, expertise and teaching interests — will be published here once verified.
          </p>
        )}

        {profile.links.length ? (
          <ul className="mt-5 flex flex-wrap gap-3">
            {profile.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                  {l.label} <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
