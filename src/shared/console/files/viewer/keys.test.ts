// @vitest-environment jsdom
import { describe, expect, test } from "vitest"
import { allowsPlayToggle } from "./keys"

function keyEvent(overrides: Partial<Parameters<typeof allowsPlayToggle>[0]>) {
  return {
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    key: " ",
    metaKey: false,
    target: document.body,
    ...overrides,
  }
}

describe("allowsPlayToggle", () => {
  test("plain space on the page toggles", () => {
    expect(allowsPlayToggle(keyEvent({}))).toBe(true)
  })

  test("other keys and modified space stay inert", () => {
    expect(allowsPlayToggle(keyEvent({ key: "Enter" }))).toBe(false)
    expect(allowsPlayToggle(keyEvent({ metaKey: true }))).toBe(false)
    expect(allowsPlayToggle(keyEvent({ defaultPrevented: true }))).toBe(false)
  })

  test("controls that own the key keep it", () => {
    for (const tag of ["input", "button", "video", "audio", "textarea"]) {
      const element = document.createElement(tag)

      document.body.appendChild(element)
      expect(allowsPlayToggle(keyEvent({ target: element }))).toBe(false)
      element.remove()
    }
  })
})
