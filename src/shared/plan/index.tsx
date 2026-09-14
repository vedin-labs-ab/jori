import { microsToDollars, plan } from "@contracts/billing"
import { CloudUpload, Folder, type LucideIcon, Users, Zap } from "lucide-react"

export type PlanFact = {
  icon: LucideIcon
  note: string
  term: string
  value: string
}

/** The plan in the words the pricing page and the console both use: what
 *  the organization gets, one line each, with the numbers from the
 *  contract so the two can never disagree. */
export const planTitle = [
  "The workspace is yours.",
  "The upkeep is ours.",
] as const

export const planPriceNote = "per month"

export const planFacts: readonly PlanFact[] = [
  {
    icon: Users,
    term: "People",
    value: "Everyone included",
    note: "No seats to count",
  },
  {
    icon: Zap,
    term: "AI usage",
    value: `$${microsToDollars(plan.monthlyAllowanceMicros)} a month`,
    note: "Resets monthly, shared by every job and chat",
  },
  {
    icon: Folder,
    term: "File storage",
    value: `${plan.storageGb} GB`,
    note: "Room for the team's materials",
  },
  {
    icon: CloudUpload,
    term: "Hosting & updates",
    value: "Handled by us",
    note: "You focus on the work",
  },
]
