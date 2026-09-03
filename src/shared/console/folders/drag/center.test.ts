// @vitest-environment jsdom
import { expect, test } from "vitest"
import { eventCoordinates, snapCenterToCursor } from "./center"

const rect = {
  width: 120,
  height: 32,
  top: 0,
  left: 0,
  right: 120,
  bottom: 32,
}
const transform = { x: 10, y: 5, scaleX: 1, scaleY: 1 }

function args(overrides: Partial<Parameters<typeof snapCenterToCursor>[0]>) {
  return {
    activatorEvent: new MouseEvent("pointerdown", {
      clientX: 100,
      clientY: 50,
    }),
    active: null,
    activeNodeRect: null,
    containerNodeRect: null,
    draggingNodeRect: rect,
    over: null,
    overlayNodeRect: rect,
    scrollableAncestors: [],
    scrollableAncestorRects: [],
    transform,
    windowRect: null,
    ...overrides,
  }
}

test("puts the ghost's center under the pointer", () => {
  // The pointer sits at (110, 55) after its travel; the ghost's corner
  // lands half a ghost up and left of it.
  expect(snapCenterToCursor(args({}))).toEqual({
    ...transform,
    x: 110 - 60,
    y: 55 - 16,
  })
})

test("leaves the transform alone until the ghost has been measured", () => {
  expect(snapCenterToCursor(args({ overlayNodeRect: null }))).toBe(transform)
})

test("leaves the transform alone without an activating event", () => {
  expect(snapCenterToCursor(args({ activatorEvent: null }))).toBe(transform)
})

test("reads a pointer's and a touch's coordinates", () => {
  expect(
    eventCoordinates(new MouseEvent("pointerdown", { clientX: 3, clientY: 4 }))
  ).toEqual({ x: 3, y: 4 })
  expect(
    eventCoordinates({
      touches: [{ clientX: 7, clientY: 8 }],
    } as unknown as Event)
  ).toEqual({ x: 7, y: 8 })
  expect(eventCoordinates({ touches: [] } as unknown as Event)).toBeUndefined()
  expect(eventCoordinates(new Event("keydown"))).toBeUndefined()
})
