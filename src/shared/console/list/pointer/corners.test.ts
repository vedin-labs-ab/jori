// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest"
import { boxRadius, findClip } from "./corners"

afterEach(() => {
  document.body.replaceChildren()
})

/** A 400 by 300 frame at the viewport's origin, clipped to 12px corners
 *  inside a 1px border, around the list the marquee draws in. */
function frame() {
  const clip = document.createElement("main")
  const list = document.createElement("div")

  // Longhands, since jsdom does not expand the shorthands when read back.
  clip.style.cssText = [
    "overflow-x: hidden",
    "overflow-y: hidden",
    ...["top", "right", "bottom", "left"].map(
      (side) => `border-${side}-width: 1px`
    ),
    ...["top-left", "top-right", "bottom-right", "bottom-left"].map(
      (corner) => `border-${corner}-radius: 12px`
    ),
  ].join(";")
  clip.getBoundingClientRect = () => new DOMRect(0, 0, 400, 300)
  clip.append(list)
  document.body.append(clip)

  return findClip(list)
}

test("the frame is the nearest element that clips to rounded corners", () => {
  expect(frame()?.radii.BottomLeft).toEqual({ x: 11, y: 11 })

  const square = document.createElement("div")
  document.body.append(square)
  expect(findClip(square)).toBeUndefined()
})

test("a corner flush with the frame takes the frame's own curve", () => {
  const box = { bottom: 299, left: 1, right: 200, top: 100 }

  // Bottom left follows the 11px inner curve; the rest keep their 2px.
  expect(boxRadius(box, frame(), 2)).toBe("2px 2px 2px 11px / 2px 2px 2px 11px")
})

test("the curve tightens as the box pulls away, each axis on its own", () => {
  const box = { bottom: 296, left: 6, right: 200, top: 100 }

  expect(boxRadius(box, frame(), 2)).toBe("2px 2px 2px 6px / 2px 2px 2px 8px")
})

test("clear of every curve, or with no frame, the box rests", () => {
  const box = { bottom: 200, left: 100, right: 300, top: 100 }

  expect(boxRadius(box, frame(), 2)).toBe("2px 2px 2px 2px / 2px 2px 2px 2px")
  expect(boxRadius(box, undefined, 2)).toBe("2px")
})
