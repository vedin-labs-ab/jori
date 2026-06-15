import { cn } from "@/lib/utils"
import { type AutomationSurfaceIntegration } from "../../../access"
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
  onSelect: (provider: AutomationSurfaceIntegration) => void
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
          key={suggestion.provider}
          onClick={() => onSelect(suggestion.provider)}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onActiveIndexChange(index)}
          role="option"
          type="button"
        >
          <SurfaceLogo provider={suggestion.provider} />
          <span className="font-medium">{suggestion.label}</span>
        </button>
      ))}
    </div>
  )
}
