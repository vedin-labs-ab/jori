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
    <div className="relative">
      <EditorContent
        className={cn(
          "rounded-md border border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 md:text-xs/relaxed",
          "[&_.tiptap]:min-h-24 [&_.tiptap]:px-2 [&_.tiptap]:py-2 [&_.tiptap]:outline-none",
          "[&_.tiptap>p]:my-0 [&_.tiptap>p]:min-h-[1.5em]"
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
