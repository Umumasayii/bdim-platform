import { seedCourses } from "@/content/courses";
import { seedPaths } from "@/content/paths";
import { seedQuestions } from "@/content/questions";
import { seedInstructors, seedTestimonials } from "@/content/people";
import { seedBookableServices, seedBookingSettings } from "@/content/services";
import type {
  BookableService,
  Booking,
  BookingSettings,
  Course,
  Inquiry,
  InstructorProfile,
  LearningPath,
  Question,
  Testimonial,
} from "@/lib/types";

export interface DbShape {
  version: 1;
  courses: Course[];
  paths: LearningPath[];
  questions: Question[];
  instructors: InstructorProfile[];
  testimonials: Testimonial[];
  bookableServices: BookableService[];
  bookingSettings: BookingSettings;
  bookings: Booking[];
  inquiries: Inquiry[];
}

export function buildSeedDb(): DbShape {
  // structuredClone so callers can never mutate the module-level seed data.
  return structuredClone({
    version: 1 as const,
    courses: seedCourses,
    paths: seedPaths,
    questions: seedQuestions,
    instructors: seedInstructors,
    testimonials: seedTestimonials,
    bookableServices: seedBookableServices,
    bookingSettings: seedBookingSettings,
    bookings: [],
    inquiries: [],
  });
}
