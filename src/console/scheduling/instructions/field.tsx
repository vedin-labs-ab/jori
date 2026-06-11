import { Textarea } from "@/components/ui/textarea"
import { InstructionAutocomplete } from "./autocomplete"
import { InstructionHighlight } from "./highlight"
import { useInstructionHandlers, useInstructionState } from "./state"

export function ScheduleInstructionsField({
  id,
  onBlur,
  onValueChange,
  placeholder,
  rows,
  value,
}: {
  id: string
  onBlur: () => void
  onValueChange: (value: string) => void
  placeholder: string
  rows: number
  value: string
}) {
  const state = useInstructionState(value)
  const handlers = useInstructionHandlers({ onValueChange, state, value })

  return (
    <div className="relative">
      <InstructionHighlight value={value} />
      <Textarea
        aria-activedescendant={
          state.isAutocompleteOpen
            ? `${state.listboxId}-${state.activeIndex}`
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={state.isAutocompleteOpen ? state.listboxId : undefined}
        aria-expanded={state.isAutocompleteOpen}
        className="relative z-10 bg-transparent text-transparent caret-foreground selection:bg-informational/20"
        id={id}
        onBlur={onBlur}
        onChange={handlers.handleChange}
        onClick={(event) => handlers.updateSelection(event.currentTarget)}
        onFocus={(event) => handlers.updateSelection(event.currentTarget)}
        onKeyDown={handlers.handleKeyDown}
        onKeyUp={(event) => handlers.updateSelection(event.currentTarget)}
        placeholder={placeholder}
        ref={state.textareaRef}
        rows={rows}
        spellCheck={true}
        value={value}
      />
      <InstructionAutocomplete handlers={handlers} state={state} />
    </div>
  )
}
