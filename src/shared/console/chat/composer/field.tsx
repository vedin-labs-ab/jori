import { EditorContent } from "@tiptap/react"
import { X } from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { InputGroupAddon } from "@/components/ui/input-group"
import { MentionSuggestions } from "../../mentions/suggest/listbox"
import { type ReferenceView } from "../../references"
import { referencePresentation } from "../../references/presentation"
import { type useComposerEditor } from "./editor"

type Composer = ReturnType<typeof useComposerEditor>

/** The field itself: the editor, the placeholder while it is empty, and
 *  the listbox a sigil opens under the caret. */
export function ComposerField({
  composer,
  onSelect,
  placeholder,
}: {
  composer: Composer
  onSelect: Parameters<typeof MentionSuggestions>[0]["onSelect"]
  placeholder: ReactNode
}) {
  return (
    <div className="relative w-full min-w-0">
      <EditorContent className="w-full min-w-0" editor={composer.editor} />
      {composer.isEmpty ? (
        <div className="pointer-events-none absolute top-2 right-2 left-2 truncate text-muted-foreground text-sm">
          {placeholder}
        </div>
      ) : null}
      <MentionSuggestions
        emptyMessage={emptySuggestionMessage}
        listboxId={composer.listboxId}
        onActiveIndexChange={composer.setActiveSuggestionIndex}
        onSelect={onSelect}
        state={composer.suggestion}
      />
    </div>
  )
}

function emptySuggestionMessage({
  active,
  empty,
}: NonNullable<ReturnType<typeof useComposerEditor>["suggestion"]>) {
  if (empty === "loading") {
    return "Looking…"
  }

  switch (active.kind) {
    case "integration":
      return active.query === ""
        ? "No integrations to mention."
        : "No matching integrations."
    case "resource":
      return active.query === ""
        ? "Nothing to mention yet."
        : "No matching resources."
    case "skill":
      return active.query === "" ? "No skills yet." : "No matching skills."
    case "tool":
      return active.query === "" ? "No tools to mention." : "No matching tools."
  }
}

/** The resource row takes space only while the chat has context. */
export function ComposerContext({
  onClear,
  reference,
}: {
  onClear: (() => void) | undefined
  reference: ReferenceView | undefined
}) {
  if (reference === undefined) {
    return null
  }

  return (
    <InputGroupAddon align="block-start" className="min-h-9">
      <ContextChip onClear={onClear} reference={reference} />
    </InputGroupAddon>
  )
}

/** The resource the chat was opened about, named by its kind's icon, with
 *  a control to send the next message without it — larger under a
 *  finger, without growing the chip. */
export function ContextChip({
  onClear,
  reference,
}: {
  onClear: (() => void) | undefined
  reference: ReferenceView
}) {
  const { icon: Icon, label } = referencePresentation(
    reference.kind,
    reference.name
  )

  return (
    <Badge className="max-w-full gap-1 pr-1" variant="outline">
      <Icon aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{reference.name}</span>
      {onClear === undefined ? null : (
        <button
          aria-label={`Remove ${reference.name}`}
          className="grid size-4 cursor-pointer place-items-center rounded-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:-my-1.5 pointer-coarse:size-7"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      )}
    </Badge>
  )
}
