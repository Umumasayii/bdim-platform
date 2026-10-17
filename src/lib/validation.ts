import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const required = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max);

export const contactFields = {
  name: required("Name", 120),
  email: z.email("Enter a valid email address").max(200),
  phone: trimmed(40).optional().default(""),
  organization: trimmed(160).optional().default(""),
};

export const inquirySchema = z.object({
  kind: z.enum(["consulting", "training", "course", "contact"]),
  serviceCategory: trimmed(120).optional().default(""),
  courseSlug: trimmed(120).optional().default(""),
  ...contactFields,
  description: z.string().trim().min(20, "Please describe your needs in at least 20 characters").max(5000),
  deadline: trimmed(60).optional().default(""),
  participants: trimmed(60).optional().default(""),
  consent: z.literal(true, { error: "Please confirm you agree to the privacy notice" }),
  /** Honeypot: must stay empty. */
  website: z.string().max(0).optional().default(""),
});
export type InquiryInput = z.input<typeof inquirySchema>;

export const bookingSchema = z.object({
  serviceId: required("Service", 80),
  startsAt: z.iso.datetime({ message: "Choose a time slot" }),
  ...contactFields,
  notes: trimmed(2000).optional().default(""),
  consent: z.literal(true, { error: "Please confirm you agree to the privacy notice" }),
  website: z.string().max(0).optional().default(""),
});
export type BookingInput = z.input<typeof bookingSchema>;

const lines = z.array(z.string().trim().min(1)).default([]);

export const lessonSchema = z.object({
  id: required("Lesson id", 160),
  title: required("Lesson title"),
  summary: trimmed(500).default(""),
  durationMinutes: z.coerce.number().int().min(0).max(600),
  isSample: z.boolean().optional(),
  content: z.string().max(50000).optional(),
  exerciseId: trimmed(80).optional(),
  resources: z.array(z.object({ label: required("Label"), url: required("URL", 500) })).optional(),
});

export const courseSchema = z.object({
  id: required("Id", 120),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
  title: required("Title"),
  category: z.enum(["analytics-bi", "programming", "statistics-research", "survey-systems", "data-science-ai", "gis"]),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  summary: required("Summary", 400),
  description: trimmed(5000).default(""),
  prerequisites: lines,
  skills: lines,
  objectives: lines,
  tools: lines,
  formats: z.array(z.enum(["Live online", "In person (Kigali)", "Self-paced", "Corporate / group"])).default([]),
  duration: trimmed(120).default(""),
  pricing: z.object({
    mode: z.enum(["quote", "contact", "fixed", "free"]),
    amount: z.coerce.number().positive().optional(),
    currency: trimmed(8).optional(),
    note: trimmed(300).optional(),
  }),
  enrollmentMode: z.enum(["open", "approval"]),
  certificate: z.object({
    enabled: z.boolean(),
    requireAllLessons: z.boolean(),
    minQuizScore: z.coerce.number().int().min(0).max(100),
  }),
  featured: z.boolean(),
  published: z.boolean(),
  sortOrder: z.coerce.number().int(),
  modules: z.array(
    z.object({
      id: required("Module id", 140),
      title: required("Module title"),
      summary: trimmed(500).default(""),
      lessons: z.array(lessonSchema),
      quiz: z
        .object({
          id: required("Quiz id", 160),
          title: required("Quiz title"),
          passMark: z.coerce.number().int().min(0).max(100),
          questions: z.array(
            z.object({
              id: required("Question id", 40),
              prompt: required("Prompt", 1000),
              options: z.array(z.string().trim().min(1)).min(2),
              answerIndex: z.coerce.number().int().min(0),
              explanation: trimmed(1000).optional(),
            }),
          ),
        })
        .optional(),
      assignment: z.object({ id: required("Assignment id", 160), title: required("Title"), brief: trimmed(2000) }).optional(),
    }),
  ),
});

export const questionSchema = z.object({
  id: required("Id", 120),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
  title: required("Title"),
  prompt: required("Prompt", 5000),
  topic: z.enum([
    "Excel", "SQL", "Python", "R", "Statistics", "Probability", "Machine Learning",
    "Power BI", "GIS", "Survey Methods", "Data Interpretation",
  ]),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  type: z.enum(["multiple-choice", "numeric", "short-answer", "formula", "code", "written"]),
  language: z.enum(["Python", "SQL", "R", "Excel", "DAX"]).optional(),
  options: z.array(z.string().trim().min(1)).optional(),
  answer: z.union([z.number(), z.array(z.string())]).optional(),
  tolerance: z.coerce.number().min(0).optional(),
  formulaGrid: z.any().optional(),
  hints: lines,
  solution: trimmed(10000).default(""),
  explanation: trimmed(5000).default(""),
  relatedCourseSlugs: lines,
  labExerciseId: trimmed(80).optional(),
  tags: lines,
  isSample: z.boolean(),
  published: z.boolean(),
  free: z.boolean(),
});

export const pathSchema = z.object({
  id: required("Id", 120),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/),
  title: required("Title"),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  summary: required("Summary", 500),
  audience: trimmed(500).default(""),
  prerequisites: lines,
  objectives: lines,
  courseSlugs: lines,
  assignments: lines,
  estimatedDuration: trimmed(120).default(""),
  published: z.boolean(),
  sortOrder: z.coerce.number().int(),
});

export const instructorSchema = z.object({
  id: required("Id", 120),
  name: required("Name", 120),
  title: trimmed(160).default(""),
  bio: trimmed(5000).default(""),
  photoUrl: z.union([z.literal(""), z.string().trim().regex(/^(https:\/\/|\/)/, "Use an https:// URL or a /path in public/")]).default(""),
  expertise: lines,
  teachingInterests: lines,
  links: z.array(z.object({ label: required("Label", 60), url: z.url() })).default([]),
  verified: z.boolean(),
  published: z.boolean(),
});

export const testimonialSchema = z
  .object({
    id: required("Id", 120),
    name: required("Name", 120),
    role: trimmed(120).default(""),
    organization: trimmed(160).default(""),
    quote: required("Quote", 1500),
    verified: z.boolean(),
    published: z.boolean(),
    createdAt: z.string(),
  })
  .refine((t) => !t.published || t.verified, { message: "Only verified testimonials can be published", path: ["published"] });

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
export const bookingSettingsSchema = z.object({
  enabled: z.boolean(),
  utcOffset: z.string().regex(/^[+-]\d{2}:\d{2}$/),
  timeZoneLabel: trimmed(80),
  weekly: z.record(z.string(), z.array(z.object({ start: time, end: time }))),
  blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  leadTimeHours: z.coerce.number().int().min(0).max(720),
  horizonDays: z.coerce.number().int().min(1).max(180),
  autoConfirm: z.boolean(),
  reviewed: z.boolean(),
});

export const bookableServiceSchema = z.object({
  id: required("Id", 80),
  title: required("Title"),
  description: trimmed(1000).default(""),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  instructorId: required("Instructor", 120),
  pricingNote: trimmed(200).default("Pricing on request"),
  active: z.boolean(),
  mode: z.enum(["Online", "In person", "Online or in person"]),
});

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
