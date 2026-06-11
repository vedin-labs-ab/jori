import { cn } from "@/lib/utils"
import { SurfaceLogo } from "../logo"
import {
  type ActiveScheduleSurfaceMention,
  type ScheduleSurfaceProvider,
  type ScheduleSurfaceSuggestion,
} from "../surfaces"
import { type InstructionHandlers, type InstructionState } from "./state"

export function InstructionAutocomplete({
  handlers,
  state,
}: {
  handlers: InstructionHandlers
  state: InstructionState
}) {
  if (!state.isAutocompleteOpen || state.activeMention === null) {
    return null
  }

  const activeMention = state.activeMention

  return (
    <div
      className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      id={state.listboxId}
      role="listbox"
    >
      {state.suggestions.map((suggestion, index) => (
        <SuggestionButton
          activeMention={activeMention}
          index={index}
          isActive={index === state.activeIndex}
          key={suggestion.provider}
          listboxId={state.listboxId}
          onActiveIndexChange={state.setActiveIndex}
          onSelect={handlers.selectSuggestion}
          suggestion={suggestion}
        />
      ))}
    </div>
  )
}

function SuggestionButton({
  activeMention,
  index,
  isActive,
  listboxId,
  onActiveIndexChange,
  onSelect,
  suggestion,
}: {
  activeMention: ActiveScheduleSurfaceMention
  index: number
  isActive: boolean
  listboxId: string
  onActiveIndexChange: (index: number) => void
  onSelect: (
    mention: ActiveScheduleSurfaceMention,
    provider: ScheduleSurfaceProvider
  ) => void
  suggestion: ScheduleSurfaceSuggestion
}) {
  return (
    <button
      aria-selected={isActive}
      className={cn(
        "flex min-h-7 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs/relaxed outline-none",
        isActive ? "bg-muted text-foreground" : "hover:bg-muted/70"
      )}
      id={`${listboxId}-${index}`}
      onClick={() => onSelect(activeMention, suggestion.provider)}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={() => onActiveIndexChange(index)}
      role="option"
      type="button"
    >
      <SurfaceLogo provider={suggestion.provider} />
      <span className="font-medium">@{suggestion.label}</span>
    </button>
  )
}
