import {
  BellRing,
  CalendarClock,
  FileText,
  History,
  type LucideIcon,
  Mail,
  Table2,
  TriangleAlert,
  Workflow,
} from "lucide-react"

/** Something worth asking first, with the icon of the domain it lives
 *  in, so a row reads at a glance. */
export type ChatSuggestion = {
  icon: LucideIcon
  text: string
}

/** The asks people bring most, written from the person's side and kept
 *  short enough for three to share one line; the home shows a few at a
 *  time and cycles the rest through the composer's placeholder. */
export const chatSuggestionPool: readonly ChatSuggestion[] = [
  { icon: History, text: "What changed this week?" },
  { icon: CalendarClock, text: "Set up a weekly digest" },
  { icon: TriangleAlert, text: "Which jobs failed?" },
  { icon: Table2, text: "Watch a table for changes" },
  { icon: Mail, text: "Draft replies to my emails" },
  { icon: FileText, text: "Write last week's postmortem" },
  { icon: BellRing, text: "Remind owners of overdue steps" },
  { icon: Workflow, text: "What did the jobs do today?" },
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
