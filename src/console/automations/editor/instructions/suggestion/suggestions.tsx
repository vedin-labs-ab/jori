import { BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProviderLogo } from "@/shared/logo/provider"
import { type AutomationMentionSuggestion } from "../../../access"
import { type InstructionSuggestionState } from "./suggest"

export function InstructionSuggestions({
  listboxId,
  onActiveIndexChange,
  onSelect,
  state,
}: {
  listboxId: string
  onActiveIndexChange: (activeIndex: number) => void
  onSelect: (suggestion: AutomationMentionSuggestion) => void
  state: InstructionSuggestionState | null
}) {
  if (state === null) {
    return null
  }

  const accessHintId = `${listboxId}-access-hint`
  const showsAccessHint = state.suggestions.some(selectionAddsAccess)

  return (
    <div
      className="absolute z-50 w-72 max-w-[calc(100%-0.5rem)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      style={state.style}
    >
      <div className="p-1">
        <div id={listboxId} role="listbox">
          {state.suggestions.map((suggestion, index) => (
            <button
              aria-describedby={
                selectionAddsAccess(suggestion) ? accessHintId : undefined
              }
              aria-selected={index === state.activeIndex}
              className={cn(
                "flex min-h-7 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs/relaxed outline-none",
                index === state.activeIndex
                  ? "bg-muted text-foreground"
                  : "hover:bg-muted/70",
                suggestion.disabled &&
                  "cursor-not-allowed text-muted-foreground opacity-60 hover:bg-transparent"
              )}
              disabled={suggestion.disabled}
              id={`${listboxId}-${index}`}
              key={`${suggestion.kind}:${suggestion.id}`}
              onClick={() => onSelect(suggestion)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onActiveIndexChange(index)}
              // The editor keeps focus and drives this list through
              // aria-activedescendant, so an option must never take focus
              // itself. Left tabbable, Tab moved focus out of the editor and
              // desynchronised the active descendant from the real one.
              tabIndex={-1}
              role="option"
              title={
                suggestion.access?.kind === "unavailable"
                  ? suggestion.access.reason
                  : undefined
              }
              type="button"
            >
              <SuggestionIcon suggestion={suggestion} />
              <span className="min-w-0 truncate font-medium">
                {suggestion.label}
              </span>
            </button>
          ))}
        </div>
        {state.suggestions.length === 0 ? (
          <div
            className="px-2.5 py-2 text-muted-foreground text-xs/relaxed"
            role="status"
          >
            {emptySuggestionMessage(state)}
          </div>
        ) : null}
      </div>
      {showsAccessHint ? (
        <p
          className="border-t bg-muted/30 px-3.5 py-1.5 text-muted-foreground text-[0.6875rem]/relaxed"
          id={accessHintId}
        >
          Selecting a tool can add the access it needs.
        </p>
      ) : null}
    </div>
  )
}

function selectionAddsAccess(suggestion: AutomationMentionSuggestion) {
  return (
    suggestion.access?.kind === "integration" ||
    suggestion.access?.kind === "web"
  )
}

function emptySuggestionMessage(state: InstructionSuggestionState) {
  if (state.active.kind === "tool") {
    if (state.empty === "loading") {
      return "Loading automation tools..."
    }
    if (state.empty === "unavailable") {
      return "Automation tools are unavailable right now."
    }

    return state.active.query === ""
      ? "No automation tools are available."
      : "No matching automation tools."
  }

  if (state.active.kind === "skill") {
    return state.active.query === ""
      ? "No skills are available."
      : "No matching skills."
  }

  return "No matching integrations."
}

function SuggestionIcon({
  suggestion,
}: {
  suggestion: AutomationMentionSuggestion
}) {
  if (suggestion.kind !== "skill") {
    return <ProviderLogo className="size-3.5" surface={suggestion.surface} />
  }

  return (
    <BookOpen
      aria-hidden="true"
      className="size-3.5 shrink-0 text-muted-foreground"
    />
  )
}
