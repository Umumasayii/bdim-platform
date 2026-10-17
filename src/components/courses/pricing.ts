import type { Pricing } from "@/lib/types";

/** Human label for a course price. Fixed prices only show once BDIM sets them. */
export function pricingLabel(p: Pricing) {
  switch (p.mode) {
    case "free":
      return "Free";
    case "fixed":
      return p.amount ? `${p.currency ?? "RWF"} ${p.amount.toLocaleString("en-GB")}` : "Request a quote";
    case "contact":
      return "Contact us for pricing";
    default:
      return "Request a quote";
  }
}
