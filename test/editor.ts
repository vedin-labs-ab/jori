import { fireEvent } from "@testing-library/react"

/** Puts text into a ProseMirror field the way a paste does: jsdom has no
 *  input events for a contenteditable, and the composer takes pasted text
 *  as typed. */
export function typeInto(field: HTMLElement, text: string) {
  fireEvent.paste(field, {
    clipboardData: { getData: () => text, types: ["text/plain"] },
  })
}
