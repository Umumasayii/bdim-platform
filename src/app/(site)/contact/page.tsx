import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { Container, PageHeader } from "@/components/ui/layout";
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
      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_1.5fr]">
        <aside className="grid content-start gap-4">
          <div className="flex gap-3 rounded-2xl border border-line bg-white p-5">
            <MapPin className="mt-0.5 size-5 text-teal-600" aria-hidden />
            <div>
              <p className="font-semibold text-navy-950">Location</p>
              <p className="text-sm text-muted">{site.location}</p>
            </div>
          </div>
          {email ? (
            <a href={`mailto:${email}`} className="flex gap-3 rounded-2xl border border-line bg-white p-5 hover:border-teal-300">
              <Mail className="mt-0.5 size-5 text-teal-600" aria-hidden />
              <div>
                <p className="font-semibold text-navy-950">Email</p>
                <p className="text-sm text-muted">{email}</p>
              </div>
            </a>
          ) : null}
          {phone ? (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex gap-3 rounded-2xl border border-line bg-white p-5 hover:border-teal-300">
              <Phone className="mt-0.5 size-5 text-teal-600" aria-hidden />
              <div>
                <p className="font-semibold text-navy-950">Phone</p>
                <p className="text-sm text-muted">{phone}</p>
              </div>
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 rounded-2xl border border-line bg-white p-5 hover:border-teal-300"
            >
              <MessageCircle className="mt-0.5 size-5 text-teal-600" aria-hidden />
              <div>
                <p className="font-semibold text-navy-950">WhatsApp</p>
                <p className="text-sm text-muted">{whatsapp}</p>
              </div>
            </a>
          ) : null}
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
