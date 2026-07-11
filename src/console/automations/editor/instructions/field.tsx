import { EditorContent } from "@tiptap/react"
import { cn } from "@/lib/utils"
import { useAutomationInstructionsEditor } from "./editor/state"
import { InstructionSuggestions } from "./suggestion/suggestions"
import { type AutomationInstructionsFieldProps } from "./types"

export function AutomationInstructionsField(
  props: AutomationInstructionsFieldProps
) {
  const errorId = props.error === undefined ? undefined : `${props.id}-error`
  const {
    editor,
    isEmpty,
    listboxId,
    selectSuggestion,
    setActiveSuggestionIndex,
    suggestion,
  } = useAutomationInstructionsEditor(props)

  return (
    <div className="grid min-w-0 gap-1">
      <div className="relative min-w-0">
        <div
          aria-invalid={props.error === undefined ? undefined : true}
          className={cn(
            "min-w-0 max-w-full overflow-hidden rounded-md border border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 md:text-xs/relaxed",
            "[&_.tiptap]:min-h-24 [&_.tiptap]:min-w-0 [&_.tiptap]:max-w-full [&_.tiptap]:overflow-x-hidden [&_.tiptap]:px-2 [&_.tiptap]:py-2 [&_.tiptap]:break-words [&_.tiptap]:whitespace-pre-wrap [&_.tiptap]:leading-6 [&_.tiptap]:outline-none [&_.tiptap]:[overflow-wrap:anywhere]",
            "[&_.tiptap>p]:my-0 [&_.tiptap>p]:min-h-6 [&_.tiptap>p]:max-w-full [&_.tiptap>p]:break-words [&_.tiptap>p]:leading-6 [&_.tiptap>p]:[overflow-wrap:anywhere]",
            props.error !== undefined &&
              "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40 dark:focus-within:border-destructive/50 dark:focus-within:ring-destructive/40",
            props.showAccessError &&
              "data-[access-error=true]:[&_[data-automation-surface-access=unset]]:border-destructive/60 data-[access-error=true]:[&_[data-automation-surface-policy=blocked]]:border-destructive/60 data-[access-error=true]:[&_[data-automation-surface-access=unset]]:ring-2 data-[access-error=true]:[&_[data-automation-surface-policy=blocked]]:ring-2 data-[access-error=true]:[&_[data-automation-surface-access=unset]]:ring-destructive/30 data-[access-error=true]:[&_[data-automation-surface-policy=blocked]]:ring-destructive/30 dark:data-[access-error=true]:[&_[data-automation-surface-access=unset]]:ring-destructive/40 dark:data-[access-error=true]:[&_[data-automation-surface-policy=blocked]]:ring-destructive/40"
          )}
          data-access-error={props.showAccessError ? "true" : undefined}
          data-automation-instructions-frame=""
        >
          <EditorContent className="min-w-0 max-w-full" editor={editor} />
          <div className="flex min-h-9 items-center gap-3 border-t bg-muted/30 px-2 text-muted-foreground text-xs/relaxed">
            <SigilHint sigil="@">integrations</SigilHint>
            <SigilHint sigil="/">skills</SigilHint>
            <SigilHint sigil="#">tools</SigilHint>
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
      {props.error === undefined ? null : (
        <p
          className="text-destructive text-xs/relaxed"
          id={errorId}
          role="alert"
        >
          {props.error}
        </p>
      )}
    </div>
  )
}

function SigilHint({ children, sigil }: { children: string; sigil: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm border bg-background px-1 font-medium font-mono text-[0.625rem]">
        {sigil}
      </kbd>
      {children}
    </span>
  )
}
