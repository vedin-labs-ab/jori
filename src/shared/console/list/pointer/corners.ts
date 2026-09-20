// The console's main view clips to rounded corners, so a marquee dragged
// into one would have its square corner, border and all, cut off by the
// curve. Instead each corner of the box takes the curve it has entered:
// the arc that shares the container's center, which meets the container's
// own arc when the box is flush with both edges and tightens back to the
// box's resting radius as the box pulls away.

type Rect = { bottom: number; left: number; right: number; top: number }

type Corner = "TopLeft" | "TopRight" | "BottomRight" | "BottomLeft"

/** Corners in the order CSS lists them in `border-radius`. */
const corners: readonly Corner[] = [
  "TopLeft",
  "TopRight",
  "BottomRight",
  "BottomLeft",
]

/** An element that clips what is inside it to rounded corners: the box its
 *  content is cut to, and the curve's radii at each corner of that box. */
export type Clip = {
  element: HTMLElement
  /** Border widths, which sit outside the clipped box. */
  inset: Rect
  radii: Record<Corner, { x: number; y: number }>
}

/** The nearest element around the list that clips to rounded corners, or
 *  nothing where the list sits in a square frame. */
export function findClip(from: HTMLElement): Clip | undefined {
  for (let node: HTMLElement | null = from; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    const clips = style.overflowX !== "visible" || style.overflowY !== "visible"
    const inset = {
      bottom: Number.parseFloat(style.borderBottomWidth) || 0,
      left: Number.parseFloat(style.borderLeftWidth) || 0,
      right: Number.parseFloat(style.borderRightWidth) || 0,
      top: Number.parseFloat(style.borderTopWidth) || 0,
    }
    const radii = Object.fromEntries(
      corners.map((corner) => {
        const radius =
          Number.parseFloat(style.getPropertyValue(radiusProperty[corner])) || 0

        // The content is cut along the border's inner edge, whose curve is
        // the outer one less the border on each side.
        return [
          corner,
          {
            x: Math.max(
              0,
              radius - inset[corner.endsWith("Left") ? "left" : "right"]
            ),
            y: Math.max(
              0,
              radius - inset[corner.startsWith("Top") ? "top" : "bottom"]
            ),
          },
        ]
      })
    ) as Clip["radii"]

    if (clips && corners.some((corner) => radii[corner].x > 0)) {
      return { element: node, inset, radii }
    }
  }

  return undefined
}

const radiusProperty: Record<Corner, string> = {
  BottomLeft: "border-bottom-left-radius",
  BottomRight: "border-bottom-right-radius",
  TopLeft: "border-top-left-radius",
  TopRight: "border-top-right-radius",
}

/** The `border-radius` for a box at `box` on screen: `resting` at every
 *  corner, except those inside one of the clip's curves. */
export function boxRadius(box: Rect, clip: Clip | undefined, resting: number) {
  if (clip === undefined) {
    return `${resting}px`
  }

  const bounds = clip.element.getBoundingClientRect()
  const cut: Rect = {
    bottom: bounds.bottom - clip.inset.bottom,
    left: bounds.left + clip.inset.left,
    right: bounds.right - clip.inset.right,
    top: bounds.top + clip.inset.top,
  }
  const radii = corners.map((corner) => {
    const horizontal = corner.endsWith("Left") ? "left" : "right"
    const vertical = corner.startsWith("Top") ? "top" : "bottom"
    const x = clip.radii[corner].x - Math.abs(box[horizontal] - cut[horizontal])
    const y = clip.radii[corner].y - Math.abs(box[vertical] - cut[vertical])

    // Outside the curve's own square the box keeps its resting corner.
    return x > 0 && y > 0
      ? { x: Math.max(x, resting), y: Math.max(y, resting) }
      : { x: resting, y: resting }
  })

  return `${radii.map((radius) => `${radius.x}px`).join(" ")} / ${radii
    .map((radius) => `${radius.y}px`)
    .join(" ")}`
}
