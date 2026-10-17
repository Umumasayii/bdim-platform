import type { InstructorProfile, Testimonial } from "@/lib/types";

// Only the instructor's name is confirmed. All other fields are intentionally
// empty and must be filled in with verified information from /admin/instructors.
export const seedInstructors: InstructorProfile[] = [
  {
    id: "niyobyose-brancal",
    name: "Niyobyose Brancal",
    title: "Instructor, Big Data IQ Minds",
    bio: "",
    photoUrl: "",
    expertise: [],
    teachingInterests: [],
    links: [],
    verified: false,
    published: true,
  },
];

// No testimonials exist yet. The section is hidden until BDIM publishes
// verified, consented testimonials from the admin area.
export const seedTestimonials: Testimonial[] = [];
