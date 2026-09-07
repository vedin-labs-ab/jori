import { type Editor } from "@tiptap/react"
import { type ActiveMention } from "@/shared/console/mentions/active"
import {
  getSuggestionState,
  type SuggestionState,
} from "@/shared/console/mentions/suggest/state"
import {
  getJobMentionSuggestions,
  type JobMentionSources,
  type JobMentionSuggestion,
  jobMentionKinds,
} from "../../../access"
import { isReferenceInputAllowed } from "./context"

export type InstructionSuggestionState = SuggestionState<JobMentionSuggestion>

/** The listbox under a job sigil: the shared suggestion state, fed by the
 *  job's own sources and kept out of code spans and literal markdown. */
export function getInstructionSuggestionState(
  editor: Editor,
  sources: JobMentionSources,
  activeIndex = 0
): InstructionSuggestionState | null {
  return getSuggestionState(editor, {
    activeIndex,
    isAllowed: isReferenceInputAllowed,
    kinds: jobMentionKinds,
    suggest: (active) => ({
      empty: suggestionEmptyState(active, sources),
      suggestions: getJobMentionSuggestions(active, sources),
    }),
  })
}

function suggestionEmptyState(
  active: ActiveMention,
  sources: JobMentionSources
): InstructionSuggestionState["empty"] {
  if (active.kind === "tool" && sources.permissions === undefined) {
    return "loading"
  }

  return active.kind === "tool" && sources.permissions === null
    ? "unavailable"
    : "empty"
}
