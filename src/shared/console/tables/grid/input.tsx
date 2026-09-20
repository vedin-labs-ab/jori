import { type KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { CellError } from "@/shared/cell"

/** The editor fills its cell; only validation feedback leaves its bounds. */
export function CellInput({
  label,
  message,
  onAdvance,
  onChange,
  onClose,
  onCommit,
  value,
}: {
  label: string
  message: string | undefined
  onAdvance: ((direction: 1 | -1) => void) | undefined
  onChange: (text: string) => void
  onClose: () => void
  onCommit: (text: string) => Promise<boolean>
  value: string
}) {
  return (
    <CellError className="h-full min-w-0" message={message}>
      {(attributes) => (
        <Input
          {...attributes}
          autoFocus
          aria-label={label}
          className="h-full min-w-24 rounded-none border-0 bg-transparent px-3 text-xs shadow-none ring-inset focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:focus-visible:ring-destructive/20 dark:bg-transparent"
          onBlur={(event) => void onCommit(event.target.value)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) =>
            handleEditorKey(event, {
              close: onClose,
              commit: onCommit,
              onAdvance,
            })
          }
          value={value}
        />
      )}
    </CellError>
  )
}

/** Enter commits in place, Escape cancels, and Tab commits then moves
 *  editing along the row; a draft that does not commit keeps the editor
 *  (and any error) where it is. */
function handleEditorKey(
  event: KeyboardEvent<HTMLInputElement>,
  editor: {
    close: () => void
    commit: (text: string) => Promise<boolean>
    onAdvance: ((direction: 1 | -1) => void) | undefined
  }
) {
  const draft = event.currentTarget.value

  if (event.key === "Enter") {
    void editor.commit(draft)
  }

  if (event.key === "Escape") {
    editor.close()
  }

  if (event.key === "Tab") {
    event.preventDefault()

    const direction = event.shiftKey ? -1 : 1

    void editor.commit(draft).then((committed) => {
      if (committed) {
        editor.onAdvance?.(direction)
      }
    })
  }
}
