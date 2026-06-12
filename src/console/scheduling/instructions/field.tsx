import { EditorContent } from "@tiptap/react"
import { Sparkles } from "lucide-react"
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
      <div
        className={cn(
          "min-w-0 max-w-full rounded-md border border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 md:text-xs/relaxed",
          "[&_.tiptap]:min-h-24 [&_.tiptap]:min-w-0 [&_.tiptap]:max-w-full [&_.tiptap]:overflow-x-hidden [&_.tiptap]:px-2 [&_.tiptap]:py-2 [&_.tiptap]:break-words [&_.tiptap]:whitespace-pre-wrap [&_.tiptap]:leading-6 [&_.tiptap]:outline-none [&_.tiptap]:[overflow-wrap:anywhere]",
          "[&_.tiptap>p]:my-0 [&_.tiptap>p]:min-h-6 [&_.tiptap>p]:max-w-full [&_.tiptap>p]:break-words [&_.tiptap>p]:leading-6 [&_.tiptap>p]:[overflow-wrap:anywhere]"
        )}
        data-schedule-instructions-frame=""
      >
        <EditorContent className="min-w-0 max-w-full" editor={editor} />
        <div className="mx-2 flex min-h-9 items-center gap-2 border-t text-muted-foreground text-xs/relaxed">
          <Sparkles aria-hidden="true" className="size-3.5 shrink-0" />
          <span>
            Type an integration name to insert a marker. Use marker icons for
            Read, Write, or Both.
          </span>
        </div>
      </div>
      {isEmpty ? (
        <div className="pointer-events-none absolute top-[9px] right-[9px] left-[9px] text-muted-foreground text-sm/6 md:text-xs/6">
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
