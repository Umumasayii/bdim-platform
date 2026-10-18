// Shared domain types for BDIM. Content types mirror the Supabase schema in
// supabase/migrations (camelCase here, snake_case in Postgres).

export type Level = "Beginner" | "Intermediate" | "Advanced";

export type CategoryId =
  | "analytics-bi"
  | "programming"
  | "statistics-research"
  | "survey-systems"
  | "data-science-ai"
  | "gis";

export type DeliveryFormat =
  | "Live online"
  | "In person (Kigali)"
  | "Self-paced"
  | "Corporate / group";

export type PricingMode = "quote" | "contact" | "fixed" | "free";

export interface Pricing {
  mode: PricingMode;
  /** Only used when mode === "fixed". Leave empty until prices are formally set. */
  amount?: number;
  currency?: string;
  note?: string;
}

export interface LessonResource {
  label: string;
  url: string;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  /** Free preview lesson, visible without enrollment. */
  isSample?: boolean;
  /** Lesson body (simple Markdown). Never sent to the browser for locked lessons. */
  content?: string;
  /** Coding-lab exercise id practised in this lesson. */
  exerciseId?: string;
  /** YouTube/Vimeo link, or "storage:<path>" for an uploaded video. */
  videoUrl?: string;
  resources?: LessonResource[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Answer key. Stripped before course data reaches the browser. */
  answerIndex?: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  passMark: number; // percentage 0-100
  questions: QuizQuestion[];
}

export interface Assignment {
  id: string;
  title: string;
  brief: string;
  /** Deadline (ISO date-time). After it, submissions are refused (the database enforces it). */
  dueAt?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  lessons: Lesson[];
  quiz?: Quiz;
  assignment?: Assignment;
}

export interface CertificateRules {
  enabled: boolean;
  requireAllLessons: boolean;
  /** Minimum score (percent) required on every module quiz. */
  minQuizScore: number;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  category: CategoryId;
  level: Level;
  summary: string;
  description: string;
  prerequisites: string[];
  skills: string[];
  objectives: string[];
  tools: string[];
  formats: DeliveryFormat[];
  /** Indicative duration, e.g. "4 weeks · 2 sessions/week". Editable. */
  duration: string;
  modules: CourseModule[];
  pricing: Pricing;
  /** "open": learners may self-enroll. "approval": BDIM confirms enrollment. */
  enrollmentMode: "open" | "approval";
  certificate: CertificateRules;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

export interface Category {
  id: CategoryId;
  title: string;
  short: string;
  description: string;
}

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  level: Level;
  summary: string;
  audience: string;
  prerequisites: string[];
  objectives: string[];
  courseSlugs: string[];
  assignments: string[];
  estimatedDuration: string;
  published: boolean;
  sortOrder: number;
}

export interface CareerStage {
  title: string;
  duration: string;
  focus: string;
  courseSlugs: string[];
}

export interface CareerGoal {
  id: string;
  title: string;
  role: string;
  summary: string;
  whatYouDo: string[];
  stages: CareerStage[];
  projects: string[];
  questionSlugs: string[];
  pathSlug: string;
}

export type QuestionType =
  | "multiple-choice"
  | "numeric"
  | "short-answer"
  | "formula"
  | "code"
  | "written";

export type QuestionTopic =
  | "Excel"
  | "SQL"
  | "Python"
  | "R"
  | "Statistics"
  | "Probability"
  | "Machine Learning"
  | "Power BI"
  | "GIS"
  | "Survey Methods"
  | "Data Interpretation";

export interface Question {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  topic: QuestionTopic;
  difficulty: Level;
  type: QuestionType;
  language?: "Python" | "SQL" | "R" | "Excel" | "DAX";
  options?: string[];
  /** multiple-choice: option index; numeric: number; short-answer/formula: accepted strings */
  answer?: number | string[];
  tolerance?: number;
  /** For formula questions: worksheet data + expected result. */
  formulaGrid?: FormulaGrid;
  hints: string[];
  solution: string;
  explanation: string;
  relatedCourseSlugs: string[];
  labExerciseId?: string;
  tags: string[];
  isSample: boolean;
  published: boolean;
  /** Free practice zone question (visible to everyone). */
  free: boolean;
}

export type CellValue = string | number | boolean | null;

export interface FormulaGrid {
  /** Column headers in row 1, data from row 2. Keyed by A1-style address. */
  cells: Record<string, CellValue>;
  columns: string[];
  rows: number;
  expected: CellValue;
}

export type LabLanguage = "python" | "sql" | "r";

export interface LabDataset {
  id: string;
  fileName: string;
  tableName: string;
  title: string;
  description: string;
  csv: string;
}

export interface LabExercise {
  id: string;
  title: string;
  language: LabLanguage;
  level: Level;
  instructions: string;
  datasetIds: string[];
  starterCode: string;
  solution: string;
  /** Strings that must appear in real program output for the check to pass. */
  expectedOutputIncludes?: string[];
  free: boolean;
}

export interface FormulaExercise {
  id: string;
  title: string;
  level: Level;
  instructions: string;
  grid: FormulaGrid;
  targetLabel: string;
  hint: string;
  solutionFormula: string;
}

export interface InstructorProfile {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string;
  expertise: string[];
  teachingInterests: string[];
  links: { label: string; url: string }[];
  /** Set true only once the profile text has been verified by BDIM. */
  verified: boolean;
  published: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  organization: string;
  quote: string;
  /** Only verified, consented testimonials may be published. */
  verified: boolean;
  published: boolean;
  createdAt: string;
}

export interface BookableService {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  instructorId: string;
  pricingNote: string;
  active: boolean;
  mode: "Online" | "In person" | "Online or in person";
}

export interface AvailabilityWindow {
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface BookingSettings {
  enabled: boolean;
  /** Fixed UTC offset of the business time zone (Rwanda has no DST). */
  utcOffset: string;
  timeZoneLabel: string;
  /** 0 = Sunday ... 6 = Saturday */
  weekly: Record<string, AvailabilityWindow[]>;
  blackoutDates: string[];
  leadTimeHours: number;
  horizonDays: number;
  autoConfirm: boolean;
  /** Shown in admin until BDIM reviews and saves the schedule. */
  reviewed: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: string;
  reference: string;
  serviceId: string;
  instructorId: string;
  startsAt: string; // ISO UTC
  endsAt: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  notes: string;
  status: BookingStatus;
  manageToken: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  adminNote: string;
}

export type InquiryKind = "consulting" | "training" | "course" | "contact";
export type InquiryStatus = "new" | "in_progress" | "responded" | "closed";

export interface Inquiry {
  id: string;
  reference: string;
  kind: InquiryKind;
  serviceCategory: string;
  courseSlug: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  description: string;
  deadline: string;
  participants: string;
  consent: boolean;
  status: InquiryStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultingService {
  slug: string;
  title: string;
  summary: string;
  description: string;
  deliverables: string[];
  methods: string[];
  tools: string[];
  idealFor: string[];
}

export interface PortfolioProject {
  slug: string;
  title: string;
  domain: string;
  summary: string;
  problem: string;
  methods: string[];
  tools: string[];
  findings: string[];
  impact: string;
  /** true = demonstration with synthetic data. */
  isExample: boolean;
  chart: {
    kind: "bar" | "line" | "area";
    xKey: string;
    series: { key: string; label: string }[];
    data: Record<string, string | number>[];
    caption: string;
  };
}

export type Role = "learner" | "instructor" | "admin";

export interface Viewer {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Local development admin session (no Supabase). */
  local: boolean;
}

export type LibraryKind = "book" | "notes" | "video" | "dataset" | "slides" | "other";
export type LibraryVisibility = "public" | "members" | "enrolled";

export interface LibraryItem {
  id: string;
  title: string;
  description: string;
  kind: LibraryKind;
  filePath: string;
  fileName: string;
  fileSize: number;
  externalUrl: string;
  courseId: string | null;
  visibility: LibraryVisibility;
  /** 0 = free. A paid item is unlocked when staff confirm the learner's payment. */
  price: number;
  currency: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
}

export type LibraryOrderStatus = "pending" | "paid" | "cancelled";

export interface LibraryOrder {
  id: string;
  itemId: string;
  userId: string;
  amount: number;
  currency: string;
  status: LibraryOrderStatus;
  payerPhone: string;
  paymentReference: string;
  note: string;
  createdAt: string;
  paidAt: string | null;
}

/** Payment details shown to buyers; edited in Admin → Library. */
export interface PaymentSettings {
  momoNumber: string;
  momoName: string;
  bankDetails: string;
  instructions: string;
}
