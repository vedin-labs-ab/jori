import { type KeyboardEvent, useRef } from "react"
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
  onRestoreFocus,
  value,
}: {
  label: string
  message: string | undefined
  onAdvance: ((direction: 1 | -1) => void) | undefined
  onChange: (text: string) => void
  onClose: () => void
  onCommit: (text: string) => Promise<boolean>
  onRestoreFocus: () => void
  value: string
}) {
  const left = useRef(false)
  const cancelled = useRef(false)

  return (
    <CellError className="h-full min-w-0" message={message}>
      {(attributes) => (
        <Input
          {...attributes}
          autoFocus
          aria-label={label}
          className="h-full min-w-24 rounded-none border-0 bg-transparent px-3 text-xs shadow-none ring-inset focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:focus-visible:ring-destructive/20 dark:bg-transparent"
          onBlur={(event) => {
            left.current = true
            void onCommit(event.target.value)
          }}
          onFocus={() => {
            left.current = false
          }}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) =>
            handleEditorKey(event, {
              close: onClose,
              cancelled,
              left,
              restore: onRestoreFocus,
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
    cancelled: { current: boolean }
    left: { current: boolean }
    restore: () => void
    commit: (text: string) => Promise<boolean>
    onAdvance: ((direction: 1 | -1) => void) | undefined
  }
) {
  const input = event.currentTarget
  const draft = input.value
  const restore = () => restoreCellFocus(input, editor)

  if (event.key === "Enter") {
    void editor.commit(draft).then((committed) => {
      if (committed && !editor.cancelled.current) {
        restore()
      }
    })
  }

  if (event.key === "Escape") {
    editor.cancelled.current = true
    editor.close()
    restore()
  }

  if (event.key === "Tab") {
    event.preventDefault()

    const direction = event.shiftKey ? -1 : 1

    void editor.commit(draft).then((committed) => {
      if (committed && !editor.left.current && !editor.cancelled.current) {
        editor.onAdvance?.(direction)
        restore()
      }
    })
  }
}

/** Wait for the editor to be replaced by its cell button. An advancing
 *  editor owns its autofocus, and a blur keeps its chosen destination. */
function restoreCellFocus(
  input: HTMLInputElement,
  editor: { left: { current: boolean }; restore: () => void }
) {
  if (editor.left.current) {
    return
  }

  requestAnimationFrame(() => {
    if (
      !editor.left.current &&
      !input.isConnected &&
      input.ownerDocument.activeElement === input.ownerDocument.body
    ) {
      editor.restore()
    }
  })
}
