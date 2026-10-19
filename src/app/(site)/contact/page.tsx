import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { Container, PageHeader } from "@/components/ui/layout";
import { buttonClass } from "@/components/ui/button";
import { InquiryForm } from "@/components/forms/inquiry-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Big Data IQ Minds about courses, training, consulting or partnerships.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { email, phone, whatsapp } = site.contact;
  return (
    <>
      <PageHeader eyebrow="Contact" title="Let's talk about your goals" description="Questions about courses, organizational training or a data project? Send us a message." />
      <Container className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_1.5fr]">
        <aside className="grid content-start gap-4">
          <div className="flex gap-3 rounded-2xl border border-line bg-white p-5">
            <MapPin className="mt-0.5 size-5 text-teal-600" aria-hidden />
            <div>
              <p className="font-semibold text-navy-950">Location</p>
              <p className="text-sm text-muted">{site.location}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="font-semibold text-navy-950">Reach us directly</p>
            <div className="mt-3 grid gap-2">
              {whatsapp ? (
                <a href={site.links.whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass("teal", "md", "w-full justify-center")}>
                  <MessageCircle className="size-4" aria-hidden /> Chat on WhatsApp
                </a>
              ) : null}
              {phone ? (
                <a href={site.links.call} className={buttonClass("primary", "md", "w-full justify-center")}>
                  <Phone className="size-4" aria-hidden /> Call {phone}
                </a>
              ) : null}
              {email ? (
                <a href={`mailto:${email}`} className={buttonClass("outline", "md", "w-full justify-center")}>
                  <Mail className="size-4" aria-hidden /> Send an email
                </a>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
            Looking for something specific? Try{" "}
            <Link href="/corporate-training" className="font-medium text-teal-700 underline">
              organizational training
            </Link>
            ,{" "}
            <Link href="/consulting" className="font-medium text-teal-700 underline">
              consulting
            </Link>{" "}
            or{" "}
            <Link href="/live-training" className="font-medium text-teal-700 underline">
              booking a session
            </Link>
            .
          </div>
        </aside>
        <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
          <InquiryForm kind="contact" descriptionLabel="Your message" submitLabel="Send message" />
        </div>
      </Container>
    </>
  );
}
