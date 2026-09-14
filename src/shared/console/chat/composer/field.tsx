import { EditorContent } from "@tiptap/react"
import { type ReactNode } from "react"
import { MentionSuggestions } from "../../mentions/suggest/listbox"
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
