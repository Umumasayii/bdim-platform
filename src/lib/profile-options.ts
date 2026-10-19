import { categories } from "@/content/categories";

/* Choices for the sign-up form and profile. Stored values are the `value`s. */

export const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const genderLabel = (v?: string) => GENDERS.find((g) => g.value === v)?.label ?? "Not given";

export const OCCUPATIONS = ["Student", "Employed", "Self-employed / business owner", "Researcher / academic", "Looking for work", "Other"] as const;

/** Interests = the course areas, so they line up with the catalogue. */
export const INTERESTS = categories.map((c) => c.short);

export interface ProfileDetails {
  gender: string;
  country: string;
  /** Province / county / region / state. */
  province: string;
  /** District (Rwanda) or city / town. */
  city: string;
  organization: string;
  occupation: string;
  interests: string[];
  phone: string;
}

export const emptyDetails = (): ProfileDetails => ({ gender: "", country: "", province: "", city: "", organization: "", occupation: "", interests: [], phone: "" });

/** "Huye, Southern Province, Rwanda" / "Nairobi, Kenya" / "" — whatever parts are known. */
export const formatLocation = (d: { city?: string | null; province?: string | null; country?: string | null }) =>
  [d.city, d.province, d.country].filter((x): x is string => Boolean(x && x.trim())).join(", ");
