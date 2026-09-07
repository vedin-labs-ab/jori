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

/** The asks people bring most, written from the person's side; the home
 *  shows a few at a time and cycles the rest through the composer's
 *  placeholder. */
export const chatSuggestionPool: readonly ChatSuggestion[] = [
  { icon: History, text: "Summarize what changed this week" },
  { icon: CalendarClock, text: "Set up a weekly digest for my team" },
  { icon: TriangleAlert, text: "Which jobs failed recently?" },
  { icon: Table2, text: "Draft a job that watches a table for changes" },
  { icon: Mail, text: "Draft replies to the emails waiting on me" },
  { icon: FileText, text: "Write up last week's incident as a postmortem" },
  { icon: BellRing, text: "Remind owners of the steps overdue this week" },
  { icon: Workflow, text: "Show me what every job did today" },
]

/** How many suggestions the home shows: enough to spark an ask, few
 *  enough that each keeps to one line. */
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
