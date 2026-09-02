import { useCallback, useRef, useState } from "react"

// Zoom state for the image viewer. Scale 1 is the contain-fit; x and y pan
// the scaled image in viewport pixels away from its centered position.
// Every move funnels through the pure helpers below so the math stays
// testable on its own.

type ZoomState = { scale: number; x: number; y: number }
export type Size = { height: number; width: number }
type Point = { x: number; y: number }

export const fitZoom: ZoomState = { scale: 1, x: 0, y: 0 }
export const minZoom = 1
export const maxZoom = 8

/** Scale factor for one zoom button press. */
export const zoomStep = 1.5

/** The image's rendered size when contain-fitted into the viewport. */
export function fittedSize(natural: Size, viewport: Size): Size {
  if (natural.width <= 0 || natural.height <= 0) {
    return { height: 0, width: 0 }
  }

  const ratio = Math.min(
    viewport.width / natural.width,
    viewport.height / natural.height
  )

  return { height: natural.height * ratio, width: natural.width * ratio }
}

/** Rescales toward `anchor` — a viewport offset from its center — keeping
 *  the image point under the anchor fixed on screen. */
export function zoomAt(state: ZoomState, scale: number, anchor: Point) {
  const nextScale = clamp(scale, minZoom, maxZoom)
  const ratio = nextScale / state.scale

  return {
    scale: nextScale,
    x: anchor.x - ratio * (anchor.x - state.x),
    y: anchor.y - ratio * (anchor.y - state.y),
  }
}

/** Keeps the image in view: each axis pans only as far as the scaled image
 *  overflows the viewport, and stays centered until it does. */
export function clampedPan(
  state: ZoomState,
  natural: Size,
  viewport: Size
): ZoomState {
  const fitted = fittedSize(natural, viewport)

  return {
    scale: state.scale,
    x: clampAxis(state.x, fitted.width * state.scale, viewport.width),
    y: clampAxis(state.y, fitted.height * state.scale, viewport.height),
  }
}

function clampAxis(offset: number, contentSize: number, viewportSize: number) {
  const overflow = Math.max(0, (contentSize - viewportSize) / 2)

  // The zero guard keeps a centered axis at exactly 0, never -0.
  return overflow === 0 ? 0 : clamp(offset, -overflow, overflow)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export type Zoom = ReturnType<typeof useZoom>

/** Zoom state plus clamped updates. The viewer reports the image's natural
 *  size and the viewport's size as they become known; from then on every
 *  update lands inside the pannable bounds. */
export function useZoom() {
  const [state, setState] = useState(fitZoom)
  const bounds = useRef<{ natural: Size | null; viewport: Size | null }>({
    natural: null,
    viewport: null,
  })

  const update = useCallback((recipe: (current: ZoomState) => ZoomState) => {
    setState((current) => {
      const next = recipe(current)
      const { natural, viewport } = bounds.current

      return natural === null || viewport === null
        ? next
        : clampedPan(next, natural, viewport)
    })
  }, [])

  const measure = useCallback(
    (part: { natural?: Size; viewport?: Size }) => {
      bounds.current = { ...bounds.current, ...part }
      update((current) => current)
    },
    [update]
  )

  const zoomBy = useCallback(
    (factor: number, anchor: Point = { x: 0, y: 0 }) => {
      update((current) => zoomAt(current, current.scale * factor, anchor))
    },
    [update]
  )

  const panBy = useCallback(
    (deltaX: number, deltaY: number) => {
      update((current) => ({
        ...current,
        x: current.x + deltaX,
        y: current.y + deltaY,
      }))
    },
    [update]
  )

  const reset = useCallback(() => setState(fitZoom), [])

  return {
    canZoomIn: state.scale < maxZoom,
    isZoomed: state.scale > minZoom,
    measure,
    panBy,
    reset,
    state,
    zoomBy,
  }
}
