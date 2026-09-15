// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useShortcuts } from "./index"
import { registerShortcuts, type Scope } from "./registry"

const disposers: (() => void)[] = []
afterEach(() => {
  cleanup()
  for (const dispose of disposers.splice(0)) {
    dispose()
  }
  document.body.replaceChildren()
})
function register(scope: Scope) {
  const dispose = registerShortcuts(() => scope)
  disposers.push(dispose)
  return dispose
}
function press(target: Element, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "j",
    code: "KeyJ",
    altKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
    ...options,
  })
  target.dispatchEvent(event)
  return event
}
const shortcut = { key: "j", alt: true, shift: true }

test("global bindings leave typing and dialogs alone", () => {
  const run = vi.fn()
  register({ bindings: [{ shortcut, run }] })
  document.body.innerHTML =
    '<input/><textarea></textarea><select></select><div contenteditable="plaintext-only"><span>edit</span></div><div role="dialog"><button>Confirm</button></div><div role="menu"><button>Action</button></div>'
  for (const target of document.body.querySelectorAll(
    "input, textarea, select, span, button"
  )) {
    expect(press(target).defaultPrevented).toBe(false)
  }
  expect(run).not.toHaveBeenCalled()
  expect(press(document.body).defaultPrevented).toBe(true)
  expect(run).toHaveBeenCalledOnce()
})

test("scoped bindings win regardless of mount order and ignore nested dialogs", () => {
  document.body.innerHTML =
    '<section><input/><div role="dialog"><input/></div></section>'
  const element = document.querySelector("section")
  const inputs = document.querySelectorAll("input")
  const local = vi.fn(),
    global = vi.fn()
  const dispose = register({
    element,
    bindings: [{ shortcut, run: local, allowInInput: true }],
  })
  register({ bindings: [{ shortcut, run: global, allowInInput: true }] })
  press(inputs[0])
  press(inputs[1])
  expect(local).toHaveBeenCalledOnce()
  expect(global).not.toHaveBeenCalled()
  dispose()
  press(inputs[0])
  expect(global).toHaveBeenCalledOnce()
})

test.each([
  { repeat: true },
  { isComposing: true },
  { keyCode: 229 },
  { ctrlKey: true },
  { metaKey: true },
  { altKey: false },
  { shiftKey: false },
])("ignored key event does not prevent its default: %j", (options) => {
  const run = vi.fn()
  register({ bindings: [{ shortcut, run }] })
  expect(press(document.body, options).defaultPrevented).toBe(false)
  expect(run).not.toHaveBeenCalled()
})

test("handled events and AltGraph composition remain untouched", () => {
  const run = vi.fn()
  register({ bindings: [{ shortcut, run }] })
  const prevent = (event: KeyboardEvent) => event.preventDefault()
  document.body.addEventListener("keydown", prevent, { once: true })
  press(document.body)
  press(document.body, { modifierAltGraph: true })
  expect(run).not.toHaveBeenCalled()
})

test("modified macOS characters match their displayed digit and plain digits remain text", () => {
  const run = vi.fn()
  register({
    bindings: [{ shortcut: { key: "1", alt: true }, run, allowInInput: true }],
  })
  const input = document.createElement("input")
  document.body.append(input)
  press(input, { key: "¡", code: "Digit1", shiftKey: false })
  expect(run).toHaveBeenCalledOnce()
  expect(
    press(input, { key: "1", code: "Digit1", altKey: false, shiftKey: false })
      .defaultPrevented
  ).toBe(false)
})

test("hook updates callbacks, disables bindings, and releases them on unmount", () => {
  const first = vi.fn(),
    next = vi.fn()
  const hook = renderHook(
    ({ run, enabled }) => useShortcuts([{ shortcut, run }], { enabled }),
    {
      initialProps: { run: first, enabled: true },
    }
  )
  press(document.body)
  hook.rerender({ run: next, enabled: true })
  press(document.body)
  expect(first).toHaveBeenCalledOnce()
  expect(next).toHaveBeenCalledOnce()
  hook.rerender({ run: next, enabled: false })
  expect(press(document.body).defaultPrevented).toBe(false)
  hook.rerender({ run: next, enabled: true })
  hook.unmount()
  expect(press(document.body).defaultPrevented).toBe(false)
})
