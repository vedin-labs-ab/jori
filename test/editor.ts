import { fireEvent } from "@testing-library/react"

/** Puts text into a ProseMirror field the way a paste does: jsdom has no
 *  input events for a contenteditable, and the composer takes pasted text
 *  as typed. */
export function typeInto(field: HTMLElement, text: string) {
  fireEvent.paste(field, {
    clipboardData: { getData: () => text, types: ["text/plain"] },
  })
}

/** Models implicit Enter submission from a field. jsdom does not implement
 *  it, so dispatch submit on the enclosing form. */
export function submitFrom(field: HTMLElement) {
  const form = field.closest("form")

  if (form === null) {
    throw new Error("The field is not inside a form.")
  }

  fireEvent.submit(form)
}
