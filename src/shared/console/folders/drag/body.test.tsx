// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { expect, test } from "vitest"
import { draggingBodyClassNames, markDragging, useDraggingBody } from "./body"

function bodyHasMark() {
  return draggingBodyClassNames.every((name) =>
    document.body.classList.contains(name)
  )
}

test("the body wears the dragging mark only while a drag runs", () => {
  const hook = renderHook(({ isDragging }) => useDraggingBody(isDragging), {
    initialProps: { isDragging: false },
  })

  expect(bodyHasMark()).toBe(false)

  hook.rerender({ isDragging: true })
  expect(bodyHasMark()).toBe(true)

  hook.rerender({ isDragging: false })
  expect(bodyHasMark()).toBe(false)
})

test("unmounting mid-drag takes the mark off", () => {
  const hook = renderHook(() => useDraggingBody(true))

  expect(bodyHasMark()).toBe(true)

  hook.unmount()
  expect(bodyHasMark()).toBe(false)
})

test("the mark grabs, forbids selection, and overrides descendants", () => {
  const element = document.createElement("div")
  const clear = markDragging(element)

  expect(element.className).toBe(
    "cursor-grabbing select-none [&_*]:cursor-grabbing!"
  )

  clear()
  expect(element.className).toBe("")
})
