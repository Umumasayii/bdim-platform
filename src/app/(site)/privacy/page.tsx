import type { Metadata } from "next";
import { site } from "@/lib/site";
import { Container } from "@/components/ui/layout";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

// TEMPLATE — review with a qualified legal adviser before publishing. In
// Rwanda, consider Law No. 058/2021 relating to the protection of personal
// data and privacy, and any registration duties with the national authority.
export default function PrivacyPage() {
  return (
    <Container className="max-w-3xl py-14">
      <Notice tone="warning" title="Template for review">
        This privacy policy is an editable template. It must be reviewed and completed by BDIM (and ideally a legal adviser) before launch.
      </Notice>
      <article className="prose-bdim mt-8">
        <h1 className="text-4xl font-bold text-navy-950">Privacy Policy</h1>
        <p>
          This policy explains how {site.legalName} (&quot;BDIM&quot;, &quot;we&quot;) collects and uses personal information when you use this
          website. Last updated: <strong>[date]</strong>.
        </p>
        <h2>Information we collect</h2>
        <ul>
          <li>Contact details you submit in inquiry, booking or contact forms (name, email, phone, organization, message).</li>
          <li>Account information if you create an account (email address, name, profile details you choose to add).</li>
          <li>Learning activity: enrollments, lesson progress, notes, quiz results, practice attempts and submissions.</li>
          <li>Technical information needed to run the site securely (for example, IP address in server logs).</li>
        </ul>
        <h2>How we use it</h2>
        <ul>
          <li>To respond to your requests and manage bookings.</li>
          <li>To provide courses, track progress and issue certificates when requirements are met.</li>
          <li>To keep the service secure and prevent abuse.</li>
        </ul>
        <h2>Code you run in the Coding Lab</h2>
        <p>Code and sample data in the Coding Lab run in your own browser. They are not sent to or executed on our servers.</p>
        <h2>Data you share about projects</h2>
        <p>
          Please do not submit confidential datasets or personal data about other people through website forms. Where a consulting project
          requires data access, we agree a secure method and appropriate data-protection terms first.
        </p>
        <h2>Sharing</h2>
        <p>
          We do not sell personal data. We use service providers to operate the site, such as hosting, database/authentication and email
          delivery providers: <strong>[list providers, e.g. hosting provider, Supabase, email service]</strong>.
        </p>
        <h2>Retention</h2>
        <p>
          <strong>[State retention periods for inquiries, bookings, accounts and learning records.]</strong>
        </p>
        <h2>Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal data, and object to certain uses. Contact us at{" "}
          <strong>[privacy contact email]</strong>.
        </p>
        <h2>Contact</h2>
        <p>
          {site.legalName}, {site.location}. <strong>[Postal address and contact email]</strong>
        </p>
      </article>
    </Container>
  );
}
