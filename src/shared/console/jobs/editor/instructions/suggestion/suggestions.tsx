import { MentionSuggestions } from "@/shared/console/mentions/suggest/listbox"
import { type JobMentionSuggestion } from "../../../access"
import { type InstructionSuggestionState } from "./suggest"

/** The shared listbox with the job's reading of a tool: a tool the job
 *  cannot use says why on hover, and one that brings access along is
 *  described by a footer that says so. */
export function InstructionSuggestions({
  listboxId,
  onActiveIndexChange,
  onDismiss,
  onSelect,
  state,
}: {
  listboxId: string
  onActiveIndexChange: (activeIndex: number) => void
  onDismiss: () => void
  onSelect: (suggestion: JobMentionSuggestion) => void
  state: InstructionSuggestionState | null
}) {
  const accessHintId = `${listboxId}-access-hint`
  const showsAccessHint = state?.suggestions.some(selectionAddsAccess) ?? false

  return (
    <MentionSuggestions
      describe={(suggestion) => ({
        describedBy: selectionAddsAccess(suggestion) ? accessHintId : undefined,
        title:
          suggestion.access?.kind === "unavailable"
            ? suggestion.access.reason
            : undefined,
      })}
      emptyMessage={emptySuggestionMessage}
      footer={
        showsAccessHint ? (
          <p
            className="border-t bg-muted/30 px-3.5 py-1.5 text-muted-foreground text-[0.6875rem]/relaxed"
            id={accessHintId}
          >
            Selecting a tool can add the access it needs.
          </p>
        ) : null
      }
      listboxId={listboxId}
      onActiveIndexChange={onActiveIndexChange}
      onDismiss={onDismiss}
      onSelect={onSelect}
      state={state}
    />
  )
}

function selectionAddsAccess(suggestion: JobMentionSuggestion) {
  return (
    suggestion.access?.kind === "integration" ||
    suggestion.access?.kind === "web"
  )
}

function emptySuggestionMessage(state: InstructionSuggestionState) {
  if (state.active.kind === "tool") {
    if (state.empty === "loading") {
      return "Loading job tools..."
    }
    if (state.empty === "unavailable") {
      return "Job tools are unavailable right now."
    }

    return state.active.query === ""
      ? "No job tools are available."
      : "No matching job tools."
  }

  if (state.active.kind === "skill") {
    return state.active.query === ""
      ? "No skills are available."
      : "No matching skills."
  }

  return "No matching integrations."
}
