import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { Container } from "@/components/ui/layout";
import { Logo } from "./logo";

const columns = [
  {
    title: "Learn",
    links: [
      { href: "/courses", label: "Courses" },
      { href: "/learning-paths", label: "Learning Paths" },
      { href: "/practice", label: "Free Practice Zone" },
      { href: "/questions", label: "Question Bank" },
      { href: "/coding-lab", label: "Coding Lab" },
      { href: "/library", label: "Library" },
      { href: "/projects", label: "Project Portfolio" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/live-training", label: "Live Training & Booking" },
      { href: "/consulting", label: "Consulting" },
      { href: "/corporate-training", label: "Corporate & Institutional Training" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
      { href: "/certificates/verify", label: "Verify a Certificate" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-navy-950 text-navy-100">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-200">{site.tagline}</p>
          <p className="mt-2 text-sm text-navy-300">{site.location}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {site.contact.whatsapp ? (
              <a href={site.links.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            ) : null}
            {site.contact.email ? (
              <a href={`mailto:${site.contact.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-700 px-3 text-sm font-semibold text-white hover:bg-navy-900">
                <Mail className="size-4" aria-hidden /> Email
              </a>
            ) : null}
          </div>
          {site.contact.phone ? (
            <a href={site.links.call} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-200 hover:text-white">
              <Phone className="size-4" aria-hidden /> Call {site.contact.phone}
            </a>
          ) : null}
          {site.social.length ? (
            <ul className="mt-3 flex gap-3">
              {site.social.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white underline-offset-4 hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-sm font-semibold text-white">{col.title}</p>
            <ul className="mt-3 grid gap-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-navy-200 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {site.legalName}. All rights reserved.</p>
          <p>{site.slogan}</p>
        </Container>
      </div>
    </footer>
  );
}
