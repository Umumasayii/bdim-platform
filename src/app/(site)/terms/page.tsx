import type { Metadata } from "next";
import { site } from "@/lib/site";
import { Container } from "@/components/ui/layout";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

// TEMPLATE — review with a qualified legal adviser before publishing.
export default function TermsPage() {
  return (
    <Container className="max-w-3xl py-14">
      <Notice tone="warning" title="Template for review">
        These terms are an editable template and must be reviewed and completed by BDIM before launch.
      </Notice>
      <article className="prose-bdim mt-8">
        <h1 className="text-4xl font-bold text-navy-950">Terms of Use</h1>
        <p>
          These terms govern your use of the website and learning platform operated by {site.legalName}. Last updated:{" "}
          <strong>[date]</strong>.
        </p>
        <h2>Accounts</h2>
        <p>You are responsible for keeping your login details secure and for activity under your account.</p>
        <h2>Courses, pricing and payment</h2>
        <p>
          Course fees and payment terms are agreed in writing before enrollment. <strong>[Add refund and cancellation terms.]</strong>
        </p>
        <h2>Certificates</h2>
        <p>
          Certificates of completion are issued only when a course&apos;s stated completion requirements are met. They confirm completion of
          BDIM training and are not an academic qualification or professional accreditation.
        </p>
        <h2>No guarantee of outcomes</h2>
        <p>Training develops skills; BDIM does not guarantee employment, promotion or any particular result.</p>
        <h2>Acceptable use</h2>
        <ul>
          <li>Do not misuse the Coding Lab, forms or discussions (for example, spam, abuse or attempts to disrupt the service).</li>
          <li>Do not post personal data about others or confidential information in discussions.</li>
        </ul>
        <h2>Content</h2>
        <p>
          Course materials are provided for your personal learning. <strong>[State licensing terms for materials.]</strong>
        </p>
        <h2>Bookings</h2>
        <p>
          Booking requests are confirmed by BDIM. <strong>[Add rescheduling and cancellation policy.]</strong>
        </p>
        <h2>Liability</h2>
        <p>
          <strong>[Liability limitations appropriate under applicable law.]</strong>
        </p>
        <h2>Governing law</h2>
        <p>
          <strong>[e.g. The laws of the Republic of Rwanda.]</strong>
        </p>
      </article>
    </Container>
  );
}
