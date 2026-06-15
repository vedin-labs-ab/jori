import {
  Code2,
  FileText,
  GitPullRequestArrow,
  type LucideIcon,
  MessageSquareText,
  PencilLine,
  Search,
  Sparkles,
} from "lucide-react"
import { type Skill } from "./types"

export type AssociatedProvider = {
  label: string
  patterns: RegExp[]
  surface: string
}

const providerMatchers: AssociatedProvider[] = [
  {
    label: "Slack",
    patterns: [/\bslack\b/, /\bblock kit\b/],
    surface: "slack",
  },
  {
    label: "GitHub",
    patterns: [/\bgithub\b/, /\bpull request\b/, /\bpr\b/],
    surface: "github",
  },
  { label: "Linear", patterns: [/\blinear\b/], surface: "linear" },
  { label: "Notion", patterns: [/\bnotion\b/], surface: "notion" },
  {
    label: "Google Drive",
    patterns: [/\bgoogle drive\b/, /\bdrive\b/],
    surface: "googleDrive",
  },
  { label: "Gmail", patterns: [/\bgmail\b/], surface: "gmail" },
  {
    label: "Google Calendar",
    patterns: [/\bgoogle calendar\b/, /\bcalendar\b/],
    surface: "googleCalendar",
  },
  {
    label: "Outlook Mail",
    patterns: [/\boutlook\b/, /\bmicrosoft email\b/],
    surface: "microsoftEmail",
  },
  {
    label: "Microsoft Calendar",
    patterns: [/\bmicrosoft calendar\b/],
    surface: "microsoftCalendar",
  },
]

export function getAssociatedProviders(skill: Skill) {
  const text = skillText(skill)

  return providerMatchers.filter((provider) =>
    provider.patterns.some((pattern) => pattern.test(text))
  )
}

export function getSkillIcon(skill: Skill): LucideIcon {
  const text = skillText(skill)

  if (/\bslack\b|\bmessage\b|\bblock kit\b/.test(text)) {
    return MessageSquareText
  }

  if (/\bpull request\b|\bpr\b|\bgithub\b/.test(text)) {
    return GitPullRequestArrow
  }

  if (/\bcode\b|\bdeveloper\b|\bengineering\b/.test(text)) {
    return Code2
  }

  if (/\bwrite\b|\bcopy\b|\bwriting\b/.test(text)) {
    return PencilLine
  }

  if (/\bdocument\b|\bdoc\b|\bfile\b/.test(text)) {
    return FileText
  }

  if (/\bresearch\b|\bweb\b|\bsearch\b/.test(text)) {
    return Search
  }

  return Sparkles
}

export function getSkillIconClassName(skill: Skill) {
  const providers = getAssociatedProviders(skill)

  if (providers.some((provider) => provider.surface === "slack")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }

  if (providers.some((provider) => provider.surface === "github")) {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-300"
  }

  if (providers.some((provider) => provider.surface === "notion")) {
    return "bg-slate-500/10 text-slate-700 dark:text-slate-300"
  }

  if (providers.some((provider) => provider.surface === "linear")) {
    return "bg-sky-500/10 text-sky-700 dark:text-sky-300"
  }

  return skill.scope === "global"
    ? "bg-primary/10 text-primary"
    : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function skillText(skill: Skill) {
  return [skill.name, skill.description, skill.body].join(" ").toLowerCase()
}
