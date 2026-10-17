// Editable company information. Replace placeholders with verified details.
export const site = {
  legalName: "BDIM Ltd (Big Data IQ Mind Ltd)",
  shortLegalName: "BDIM Ltd",
  name: "Big Data IQ Minds",
  shortName: "BDIM",
  tagline: "We Turn Data Into Decisions.",
  slogan: "Data • Insights • Impact.",
  description:
    "Big Data IQ Minds is a data-driven initiative dedicated to transforming complex data into meaningful insights through data science, statistics, artificial intelligence, and business intelligence. It empowers individuals and organizations with analytical skills, innovative solutions, and evidence-based decision-making to solve real-world challenges and drive sustainable development.",
  mission: "Make data skills accessible, practical, and relevant to real-world problems.",
  vision:
    "Empower a generation of data-literate professionals and organizations capable of making better decisions through data and technology.",
  values: [
    { title: "Innovation", text: "We look for better tools and methods, and teach them early." },
    { title: "Analytical excellence", text: "Rigor in methods, honesty in interpretation." },
    { title: "Integrity", text: "We report what the data shows, not what is convenient." },
    { title: "Practical learning", text: "Every concept is practised on realistic data." },
    { title: "Accessibility", text: "Clear teaching, flexible formats, open free practice." },
    { title: "Collaboration", text: "We learn with learners, partners, and communities." },
    { title: "Measurable impact", text: "Skills and solutions judged by the decisions they improve." },
  ],
  location: "Kigali, Rwanda",
  // TODO(BDIM): replace with verified contact details before launch.
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
    whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "",
  },
  social: [] as { label: string; url: string }[],
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL ?? "",
};

export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/learning-paths", label: "Learning Paths" },
  { href: "/practice", label: "Practice" },
  { href: "/questions", label: "Question Bank" },
  { href: "/coding-lab", label: "Coding Lab" },
  { href: "/live-training", label: "Live Training" },
  { href: "/consulting", label: "Consulting" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];
