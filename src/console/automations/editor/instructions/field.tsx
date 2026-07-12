import { EditorContent } from "@tiptap/react"
import { cn } from "@/lib/utils"
import { automationScopeConflictMessage } from "../../access"
import { useAutomationInstructionsEditor } from "./editor/state"
import { instructionMarkdownClassName } from "./editor/style"
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
            instructionMarkdownClassName,
            props.error !== undefined &&
              "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40 dark:focus-within:border-destructive/50 dark:focus-within:ring-destructive/40",
            props.showAccessError &&
              "data-[access-error=true]:[&_[data-automation-surface-access=unset]]:border-destructive/60 data-[access-error=true]:[&_[data-automation-surface-policy=blocked]]:border-destructive/60 data-[access-error=true]:[&_[data-automation-surface-access=unset]]:ring-2 data-[access-error=true]:[&_[data-automation-surface-policy=blocked]]:ring-2 data-[access-error=true]:[&_[data-automation-surface-access=unset]]:ring-destructive/30 data-[access-error=true]:[&_[data-automation-surface-policy=blocked]]:ring-destructive/30 dark:data-[access-error=true]:[&_[data-automation-surface-access=unset]]:ring-destructive/40 dark:data-[access-error=true]:[&_[data-automation-surface-policy=blocked]]:ring-destructive/40"
          )}
          data-access-error={props.showAccessError ? "true" : undefined}
          data-automation-instructions-frame=""
        >
          <EditorContent className="min-w-0 max-w-full" editor={editor} />
          <div className="flex min-h-9 items-center gap-2 border-t bg-muted/30 px-2 text-muted-foreground text-xs/relaxed">
            <SigilHint sigil="@">access</SigilHint>
            <span aria-hidden="true">·</span>
            <SigilHint sigil="/">skills</SigilHint>
            <span aria-hidden="true">·</span>
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
          <InstructionErrorText error={props.error} />
        </p>
      )}
    </div>
  )
}

function InstructionErrorText({ error }: { error: string }) {
  if (error !== automationScopeConflictMessage) {
    return error
  }

  return error.split(/(Organization|Personal)/).map((part) =>
    part === "Organization" || part === "Personal" ? (
      <span className="font-medium" key={part}>
        {part}
      </span>
    ) : (
      part
    )
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
