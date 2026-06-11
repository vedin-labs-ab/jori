import { EditorContent } from "@tiptap/react"
import { cn } from "@/lib/utils"
import { useScheduleInstructionsEditor } from "./state"
import { InstructionSuggestions } from "./suggestions"
import { type ScheduleInstructionsFieldProps } from "./types"

export function ScheduleInstructionsField(
  props: ScheduleInstructionsFieldProps
) {
  const {
    editor,
    isEmpty,
    listboxId,
    selectSuggestion,
    setActiveSuggestionIndex,
    suggestion,
  } = useScheduleInstructionsEditor(props)

  return (
    <div className="relative min-w-0">
      <EditorContent
        className={cn(
          "min-w-0 max-w-full rounded-md border border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 md:text-xs/relaxed",
          "[&_.tiptap]:min-h-24 [&_.tiptap]:min-w-0 [&_.tiptap]:max-w-full [&_.tiptap]:overflow-x-hidden [&_.tiptap]:px-2 [&_.tiptap]:py-2 [&_.tiptap]:break-words [&_.tiptap]:whitespace-pre-wrap [&_.tiptap]:outline-none [&_.tiptap]:[overflow-wrap:anywhere]",
          "[&_.tiptap>p]:my-0 [&_.tiptap>p]:min-h-[1.5em] [&_.tiptap>p]:max-w-full [&_.tiptap>p]:break-words [&_.tiptap>p]:[overflow-wrap:anywhere]"
        )}
        editor={editor}
      />
      {isEmpty ? (
        <div className="pointer-events-none absolute top-2 left-2 text-muted-foreground text-sm md:text-xs/relaxed">
          {props.placeholder}
        </div>
      ) : null}
      <InstructionSuggestions
        listboxId={listboxId}
        onActiveIndexChange={setActiveSuggestionIndex}
        onSelect={selectSuggestion}
        state={suggestion}
      />
    </div>
  )
}
