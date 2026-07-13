// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, expect, test } from "vitest"
import { buildPulse } from "../series"
import { PulseViewport } from "./viewport"

const originalResizeObserver = globalThis.ResizeObserver

class TestResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

beforeAll(() => {
  globalThis.ResizeObserver = TestResizeObserver as typeof ResizeObserver
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver
})

test("fades both axes while keeping the pinned band outside vertical scroll", () => {
  const { container } = renderViewport()
  const vertical = container.querySelector(".scroll-fade-y")
  const horizontal = container.querySelectorAll(".scroll-fade-x")

  expect(vertical).not.toBeNull()
  expect(horizontal).toHaveLength(2)
  expect(vertical?.contains(horizontal[1] ?? null)).toBe(false)
  expect(vertical?.classList).toContain("[--scroll-fade-reveal:24px]")

  for (const scroller of horizontal) {
    expect(scroller.classList).toContain("[--scroll-fade-reveal:24px]")
  }
})

test("synchronizes horizontal progress between both scroll regions", () => {
  const { container } = renderViewport()
  const [workstreams, footer] = Array.from(
    container.querySelectorAll<HTMLDivElement>(".scroll-fade-x")
  )

  if (workstreams === undefined || footer === undefined) {
    throw new Error("Expected both horizontal scroll regions")
  }

  setScrollSize(workstreams, 600, 300)
  setScrollSize(footer, 500, 250)
  workstreams.scrollLeft = 150
  fireEvent.scroll(workstreams)

  expect(footer.scrollLeft).toBe(125)
})

function renderViewport() {
  const pulse = buildPulse([], [], new Date(2026, 6, 13).getTime())

  return render(
    <PulseViewport
      dayCount={14}
      days={pulse.days}
      lanes={pulse.lanes}
      onOpen={() => undefined}
      unplaced={0}
      workstreams={[]}
    />
  )
}

function setScrollSize(
  node: HTMLDivElement,
  scrollWidth: number,
  width: number
) {
  Object.defineProperties(node, {
    clientWidth: { configurable: true, value: width },
    scrollWidth: { configurable: true, value: scrollWidth },
  })
}
