import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { referencePresentation } from "../../chat/presentation"
import { MentionKindIcon } from "../icon"
import { type MentionSuggestion } from "../sources"
import { type SuggestionState } from "./state"

const iconClassName = "size-3.5 shrink-0 text-muted-foreground"

/** What a row of the listbox says of its option beyond the option
 *  itself: a hint it is described by, a title on hover. */
export type SuggestionDescription = {
  describedBy?: string
  title?: string
}

/** The listbox under a sigil: one row per suggestion with its kind's mark
 *  and its name, a status line when there is nothing to offer, and room
 *  under the rows for a footer the editor may add. The editor keeps focus
 *  and drives the list through aria-activedescendant, so an option must
 *  never take focus itself. */
export function MentionSuggestions<Suggestion extends MentionSuggestion>({
  describe,
  emptyMessage,
  footer,
  listboxId,
  onActiveIndexChange,
  onSelect,
  state,
}: {
  describe?: (suggestion: Suggestion) => SuggestionDescription
  emptyMessage: (state: SuggestionState<Suggestion>) => string
  footer?: ReactNode
  listboxId: string
  onActiveIndexChange: (activeIndex: number) => void
  onSelect: (suggestion: Suggestion) => void
  state: SuggestionState<Suggestion> | null
}) {
  if (state === null) {
    return null
  }

  return (
    <div
      className="absolute z-50 w-72 max-w-[calc(100%-0.5rem)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      style={state.style}
    >
      <div className="p-1">
        <div id={listboxId} role="listbox">
          {state.suggestions.map((suggestion, index) => (
            <SuggestionOption
              active={index === state.activeIndex}
              description={describe?.(suggestion)}
              id={`${listboxId}-${index}`}
              key={`${suggestion.kind}:${suggestion.id}`}
              onActivate={() => onActiveIndexChange(index)}
              onSelect={() => onSelect(suggestion)}
              suggestion={suggestion}
            />
          ))}
        </div>
        {state.suggestions.length === 0 ? (
          <div
            className="px-2.5 py-2 text-muted-foreground text-xs/relaxed"
            role="status"
          >
            {emptyMessage(state)}
          </div>
        ) : null}
      </div>
      {footer}
    </div>
  )
}

function SuggestionOption({
  active,
  description,
  id,
  onActivate,
  onSelect,
  suggestion,
}: {
  active: boolean
  description: SuggestionDescription | undefined
  id: string
  onActivate: () => void
  onSelect: () => void
  suggestion: MentionSuggestion
}) {
  return (
    <button
      aria-describedby={description?.describedBy}
      aria-selected={active}
      className={cn(
        "flex min-h-7 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs/relaxed outline-none",
        active ? "bg-muted text-foreground" : "hover:bg-muted/70",
        suggestion.disabled &&
          "cursor-not-allowed text-muted-foreground opacity-60 hover:bg-transparent"
      )}
      disabled={suggestion.disabled}
      id={id}
      onClick={onSelect}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={onActivate}
      // Left tabbable, Tab moved focus out of the editor and desynchronised
      // the active descendant from the real one.
      tabIndex={-1}
      role="option"
      title={description?.title}
      type="button"
    >
      <SuggestionIcon suggestion={suggestion} />
      <span className="min-w-0 truncate font-medium">{suggestion.label}</span>
      {suggestion.detail === undefined ? null : (
        <span className="ml-auto shrink-0 text-muted-foreground">
          {suggestion.detail}
        </span>
      )}
    </button>
  )
}

/** The mark a suggestion wears: a resource's kind, the rest their own. */
function SuggestionIcon({ suggestion }: { suggestion: MentionSuggestion }) {
  if (suggestion.kind === "resource") {
    const Icon = referencePresentation(
      suggestion.target.kind,
      suggestion.label
    ).icon

    return <Icon aria-hidden="true" className={iconClassName} />
  }

  return (
    <MentionKindIcon
      className={iconClassName}
      id={suggestion.id}
      kind={suggestion.kind}
      surface={suggestion.surface}
    />
  )
}
