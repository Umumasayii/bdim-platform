import type { InstructorProfile, Testimonial } from "@/lib/types";

// Profile supplied and verified by the instructor (October 2026).
// Edit from /admin/instructors; keep every claim accurate.
export const seedInstructors: InstructorProfile[] = [
  {
    id: "niyobyose-brancal",
    name: "Niyobyose Brancal",
    title: "Instructor, Big Data IQ Minds",
    bio: "Niyobyose Brancal is a data analytics enthusiast and aspiring professional specializing in statistical analysis, data visualization, and research. He works with tools such as R, Python, Excel, Power BI, and Streamlit to transform data into actionable insights. Passionate about problem-solving, innovation, and sustainable development, he applies data-driven approaches to address real-world challenges in Rwanda while building impactful projects and continuously expanding his technical skills.",
    photoUrl: "/brand/instructor-niyobyose-brancal.jpg",
    expertise: ["Statistical analysis", "Data visualization", "Research", "R", "Python", "Excel", "Power BI", "Streamlit"],
    teachingInterests: [
      "Turning data into actionable insights",
      "Problem-solving and innovation with data",
      "Data for sustainable development in Rwanda",
    ],
    links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/niyobyose-brancal-901841409/" }],
    verified: true,
    published: true,
  },
];

// No testimonials exist yet. The section is hidden until BDIM publishes
// verified, consented testimonials from the admin area.
export const seedTestimonials: Testimonial[] = [];
