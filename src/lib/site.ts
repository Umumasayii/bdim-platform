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
  // Public contact details (environment variables override these if set).
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "bigdataiqminds@gmail.com",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+250 787 884 835",
    whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "+250 782 220 599",
  },
  /** wa.me / tel: forms of the numbers above. */
  get links() {
    return {
      whatsapp: this.contact.whatsapp ? `https://wa.me/${this.contact.whatsapp.replace(/\D/g, "")}` : "",
      call: this.contact.phone ? `tel:${this.contact.phone.replace(/[^\d+]/g, "")}` : "",
    };
  },
  social: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/niyobyose-brancal-901841409/" }],
  logo: { full: "/brand/bdim-logo.png", mark: "/brand/bdim-mark.png" },
};

/** How many "featured" courses the homepage shows (first ones in course order). */
export const HOMEPAGE_FEATURED_COURSES = 6;

export interface NavItem {
  href: string;
  label: string;
  description: string;
}

/** Top bar: four grouped menus (the logo links home). */
export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Learn",
    items: [
      { href: "/courses", label: "Courses", description: "Every course, with outlines and free sample lessons" },
      { href: "/learning-paths", label: "Learning Paths", description: "Courses in a recommended order for your career" },
      { href: "/library", label: "Library", description: "Books, notes, slides and datasets" },
      { href: "/projects", label: "Project Portfolio", description: "Real analyses built step by step" },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/practice", label: "Free Practice Zone", description: "Quick exercises, Excel formulas and KPIs" },
      { href: "/questions", label: "Question Bank", description: "Interview-style questions with solutions" },
      { href: "/coding-lab", label: "Coding Lab", description: "Run Python, SQL and R in your browser" },
    ],
  },
  {
    label: "Services",
    items: [
      { href: "/live-training", label: "Live Training & Booking", description: "Book one-to-one or group sessions" },
      { href: "/corporate-training", label: "Corporate Training", description: "Programmes for teams and institutions" },
      { href: "/consulting", label: "Consulting", description: "Data analysis, dashboards and research support" },
      { href: "/pricing", label: "Pricing", description: "How fees and quotes work" },
    ],
  },
  {
    label: "About",
    items: [
      { href: "/about", label: "About Us", description: "Our mission and your instructor" },
      { href: "/contact", label: "Contact", description: "Email, WhatsApp or send a message" },
      { href: "/certificates/verify", label: "Verify a Certificate", description: "Check a BDIM certificate number" },
    ],
  },
];
