// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { expect, test } from "vitest"
import { useDraggingBody } from "./body"

function expectDragging(active: boolean) {
  for (const name of [
    "cursor-grabbing",
    "select-none",
    "[&_*]:cursor-grabbing!",
  ]) {
    expect(document.body.classList.contains(name)).toBe(active)
  }
}

test("the body wears the dragging mark only while a drag runs", () => {
  const hook = renderHook(({ isDragging }) => useDraggingBody(isDragging), {
    initialProps: { isDragging: false },
  })

  expectDragging(false)

  hook.rerender({ isDragging: true })
  expectDragging(true)

  hook.rerender({ isDragging: false })
  expectDragging(false)
})

test("unmounting mid-drag takes the mark off", () => {
  const hook = renderHook(() => useDraggingBody(true))

  expectDragging(true)

  hook.unmount()
  expectDragging(false)
})
