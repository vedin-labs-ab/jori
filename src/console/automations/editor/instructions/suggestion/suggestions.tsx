import { BookOpen, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type AutomationMentionSuggestion,
  type AutomationSurfaceIntegration,
} from "../../../access"
import { SurfaceLogo } from "../../../access/logo"
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

  return (
    <div
      className="absolute z-50 w-64 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      id={listboxId}
      role="listbox"
      style={state.style}
    >
      {state.suggestions.map((suggestion, index) => (
        <button
          aria-selected={index === state.activeIndex}
          className={cn(
            "flex min-h-7 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs/relaxed outline-none",
            index === state.activeIndex
              ? "bg-muted text-foreground"
              : "hover:bg-muted/70"
          )}
          id={`${listboxId}-${index}`}
          key={`${suggestion.kind}:${suggestion.id}`}
          onClick={() => onSelect(suggestion)}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onActiveIndexChange(index)}
          role="option"
          type="button"
        >
          <SuggestionIcon suggestion={suggestion} />
          <span className="min-w-0 truncate font-medium">
            {suggestion.label}
          </span>
          {suggestion.hint === undefined ? null : (
            <span className="ml-auto shrink-0 text-muted-foreground">
              {suggestion.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function SuggestionIcon({
  suggestion,
}: {
  suggestion: AutomationMentionSuggestion
}) {
  if (suggestion.kind === "integration") {
    return (
      <SurfaceLogo
        integration={suggestion.id as AutomationSurfaceIntegration}
      />
    )
  }

  const Icon = suggestion.kind === "skill" ? BookOpen : Wrench

  return (
    <Icon
      aria-hidden="true"
      className="size-3.5 shrink-0 text-muted-foreground"
    />
  )
}
