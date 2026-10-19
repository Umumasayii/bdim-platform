import type { Metadata } from "next";
import { CalendarDays, MessagesSquare, Presentation, Users } from "lucide-react";
import { getBookingConfig } from "@/lib/data/content";
import { Container, PageHeader } from "@/components/ui/layout";
import { BookingFlow } from "@/components/booking/booking-flow";

export const metadata: Metadata = {
  title: "Live Training & Booking",
  description: "Book individual tutoring, mock technical interviews, statistical consulting, mentorship and corporate training consultations.",
  alternates: { canonical: "/live-training" },
};

export default async function LiveTrainingPage() {
  const { services, settings } = await getBookingConfig();
  return (
    <>
      <PageHeader
        eyebrow="Live training"
        title="Learn live, one-to-one or with your team"
        description="Book a session for tutoring, interview practice, statistical advice or mentorship. Pricing is agreed with you before any session — it is negotiable until formally set."
      />
      <Container className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <BookingFlow services={services} enabled={settings.enabled} />
        <aside className="grid content-start gap-4">
          {[
            { icon: Users, title: "Individual or group", text: "Sessions for one learner or a small team." },
            { icon: Presentation, title: "Live online or in Kigali", text: "Choose the format that suits you." },
            { icon: MessagesSquare, title: "Feedback that sticks", text: "Specific feedback on technical depth, structure and communication." },
            { icon: CalendarDays, title: "Reschedule or cancel", text: "Every booking has a private link to manage it." },
          ].map((f) => (
            <div key={f.title} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
              <f.icon className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden />
              <div>
                <p className="font-semibold text-navy-950">{f.title}</p>
                <p className="text-sm text-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </aside>
      </Container>
    </>
  );
}
