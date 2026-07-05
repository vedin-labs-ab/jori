// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { TimelineRow } from "./timeline"

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

afterEach(() => {
  cleanup()
})

const hour = 3_600_000
const now = 1_700_000_000_000

test("renders the timestamp, label, body, and details", () => {
  render(
    <ol>
      <TimelineRow
        at={now - hour}
        continues={false}
        details={<span>3 sources</span>}
        label={<span>Shared Timeline</span>}
        now={now}
      >
        Standardized the shared timeline.
      </TimelineRow>
    </ol>
  )

  expect(screen.getByText("1h ago")).toBeDefined()
  expect(screen.getByText("Shared Timeline")).toBeDefined()
  expect(screen.getByText("Standardized the shared timeline.")).toBeDefined()
  expect(screen.getByText("3 sources")).toBeDefined()
})

test("renders without optional label and details", () => {
  render(
    <ol>
      <TimelineRow at={now - hour} continues={true} now={now}>
        Entry body
      </TimelineRow>
    </ol>
  )

  expect(screen.getByText("Entry body")).toBeDefined()
})
