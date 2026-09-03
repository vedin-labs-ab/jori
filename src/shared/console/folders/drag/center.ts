// Keeps the drag ghost centered under the pointer. The overlay is pinned
// to the viewport's origin (see the provider), so its place is the
// pointer's own: where the drag started plus how far it has travelled,
// less half the ghost so its middle, not its corner, rides the cursor.

import { type Modifier } from "@dnd-kit/core"

type Coordinates = { x: number; y: number }

/** Where an activating pointer or touch event happened, in client space. */
export function eventCoordinates(event: Event): Coordinates | undefined {
  if ("clientX" in event && "clientY" in event) {
    return { x: event.clientX as number, y: event.clientY as number }
  }

  if ("touches" in event) {
    const touch = (event as TouchEvent).touches[0]

    return touch === undefined
      ? undefined
      : { x: touch.clientX, y: touch.clientY }
  }

  return undefined
}

/** The dnd-kit modifier behind the centering, for an overlay whose wrapper
 *  sits at the viewport's top-left corner. Before the overlay has been
 *  measured the transform passes through untouched. */
export const snapCenterToCursor: Modifier = ({
  activatorEvent,
  overlayNodeRect,
  transform,
}) => {
  const pointer =
    activatorEvent === null ? undefined : eventCoordinates(activatorEvent)

  if (pointer === undefined || overlayNodeRect === null) {
    return transform
  }

  return {
    ...transform,
    x: transform.x + pointer.x - overlayNodeRect.width / 2,
    y: transform.y + pointer.y - overlayNodeRect.height / 2,
  }
}
