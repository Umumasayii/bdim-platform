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

export type CourseSettingsPatch = Partial<Pick<Course, "published" | "featured" | "sortOrder">>;

export interface ListOptions {
  /** Include unpublished / inactive records. Requires a staff session in Supabase mode. */
  includeUnpublished?: boolean;
}

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "conflict" | "unavailable" | "error"; message: string };

export interface Interval {
  startsAt: string;
  endsAt: string;
  instructorId: string;
}

/**
 * Persistence boundary. Two implementations:
 *  - LocalStore: a JSON file in .data/ (development and single-server hosting)
 *  - SupabaseStore: Postgres with row-level security (production)
 */
export interface Store {
  kind: "local" | "supabase";

  listCourses(opts?: ListOptions): Promise<Course[]>;
  saveCourse(course: Course): Promise<void>;
  /** Change only these settings of a course (quick actions in the admin list). */
  updateCourseSettings(id: string, patch: CourseSettingsPatch): Promise<void>;
  deleteCourse(id: string): Promise<void>;

  listPaths(opts?: ListOptions): Promise<LearningPath[]>;
  savePath(path: LearningPath): Promise<void>;
  deletePath(id: string): Promise<void>;

  listQuestions(opts?: ListOptions): Promise<Question[]>;
  saveQuestion(question: Question): Promise<void>;
  deleteQuestion(id: string): Promise<void>;

  listInstructors(opts?: ListOptions): Promise<InstructorProfile[]>;
  saveInstructor(profile: InstructorProfile): Promise<void>;

  listTestimonials(opts?: ListOptions): Promise<Testimonial[]>;
  saveTestimonial(t: Testimonial): Promise<void>;
  deleteTestimonial(id: string): Promise<void>;

  listBookableServices(opts?: ListOptions): Promise<BookableService[]>;
  saveBookableService(s: BookableService): Promise<void>;
  getBookingSettings(): Promise<BookingSettings>;
  saveBookingSettings(s: BookingSettings): Promise<void>;

  /** Start/end of active (pending or confirmed) bookings, without personal data. */
  listBusyIntervals(fromIso: string, toIso: string): Promise<Interval[]>;
  createBooking(booking: Booking): Promise<CreateBookingResult>;
  listBookings(): Promise<Booking[]>;
  getBookingByToken(token: string): Promise<Booking | null>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<CreateBookingResult>;

  createInquiry(inquiry: Inquiry): Promise<void>;
  listInquiries(): Promise<Inquiry[]>;
  updateInquiry(id: string, patch: Partial<Inquiry>): Promise<void>;
}

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}
