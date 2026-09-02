import { describe, expect, test } from "vitest"
import {
  clampedPan,
  fittedSize,
  fitZoom,
  maxZoom,
  minZoom,
  zoomAt,
} from "./zoom"

const viewport = { height: 600, width: 800 }

describe("fittedSize", () => {
  test("fits a wide image to the viewport width", () => {
    expect(fittedSize({ height: 500, width: 2000 }, viewport)).toEqual({
      height: 200,
      width: 800,
    })
  })

  test("fits a tall image to the viewport height", () => {
    expect(fittedSize({ height: 1200, width: 600 }, viewport)).toEqual({
      height: 600,
      width: 300,
    })
  })

  test("scales a small image up until one axis fills", () => {
    expect(fittedSize({ height: 60, width: 80 }, viewport)).toEqual({
      height: 600,
      width: 800,
    })
  })

  test("collapses degenerate image sizes to zero", () => {
    expect(fittedSize({ height: 0, width: 100 }, viewport)).toEqual({
      height: 0,
      width: 0,
    })
  })
})

describe("zoomAt", () => {
  test("keeps the center fixed when anchored there", () => {
    expect(zoomAt(fitZoom, 2, { x: 0, y: 0 })).toEqual({ scale: 2, x: 0, y: 0 })
  })

  test("pans toward the anchor so its image point stays put", () => {
    expect(zoomAt(fitZoom, 2, { x: 100, y: -50 })).toEqual({
      scale: 2,
      x: -100,
      y: 50,
    })
  })

  test("compounds an existing pan through the rescale", () => {
    const zoomed = zoomAt(fitZoom, 2, { x: 100, y: 0 })

    // Zooming back out at the same anchor returns exactly to the fit.
    expect(zoomAt(zoomed, 1, { x: 100, y: 0 })).toEqual(fitZoom)
  })

  test("clamps the scale to the zoom range", () => {
    expect(zoomAt(fitZoom, 100, { x: 0, y: 0 }).scale).toBe(maxZoom)
    expect(zoomAt(fitZoom, 0.1, { x: 0, y: 0 }).scale).toBe(minZoom)
  })
})

describe("clampedPan", () => {
  const natural = { height: 300, width: 400 }

  test("centers the image while it fits the viewport", () => {
    const state = { scale: 1, x: 40, y: -25 }

    expect(clampedPan(state, natural, viewport)).toEqual(fitZoom)
  })

  test("limits panning to the scaled overflow", () => {
    // At scale 2 the fitted 800x600 image overflows by 400x300, half of
    // which is pannable in each direction.
    const state = { scale: 2, x: 9999, y: -9999 }

    expect(clampedPan(state, natural, viewport)).toEqual({
      scale: 2,
      x: 400,
      y: -300,
    })
  })

  test("clamps each axis independently", () => {
    // A wide image at scale 2 overflows horizontally only, so the vertical
    // pan snaps back to center.
    const wide = { height: 150, width: 1600 }
    const state = { scale: 2, x: 100, y: 50 }

    expect(clampedPan(state, wide, viewport)).toEqual({
      scale: 2,
      x: 100,
      y: 0,
    })
  })
})
