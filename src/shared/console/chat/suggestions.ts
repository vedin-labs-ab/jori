import {
  CalendarClock,
  FileText,
  GitPullRequest,
  ListChecks,
  type LucideIcon,
  Mail,
  Megaphone,
  Newspaper,
  Table2,
} from "lucide-react"

/** Something worth asking first, with the icon of the domain it lives
 *  in, so a row reads at a glance. */
export type ChatSuggestion = {
  icon: LucideIcon
  text: string
}

/** The asks people at a company bring most — the day's meetings, the
 *  team's update, what is stuck in the tracker, the inbox, a table to
 *  keep — written from the person's side and kept short enough for three
 *  to share one line; the home shows a few at a time and cycles the rest
 *  through the composer's placeholder. */
export const chatSuggestionPool: readonly ChatSuggestion[] = [
  { icon: CalendarClock, text: "Prep tomorrow's meetings" },
  { icon: Megaphone, text: "Draft a team update" },
  { icon: ListChecks, text: "What's blocked in Linear?" },
  { icon: GitPullRequest, text: "Which PRs need review?" },
  { icon: Mail, text: "Which emails need a reply?" },
  { icon: Table2, text: "Track invoices in a table" },
  { icon: Newspaper, text: "Send me a Monday digest" },
  { icon: FileText, text: "Write up the last incident" },
]

/** How many suggestions the home shows at most: three share the column
 *  at its widest, and the third steps aside where it would not fit. */
export const shownSuggestions = 3

/** The pool from `start`, wrapping, so successive visits see different
 *  asks first and every ask has its turn. */
export function rotateSuggestions<Suggestion>(
  pool: readonly Suggestion[],
  start: number
): Suggestion[] {
  if (pool.length === 0) {
    return []
  }

  const offset = ((start % pool.length) + pool.length) % pool.length

  return [...pool.slice(offset), ...pool.slice(0, offset)]
}
