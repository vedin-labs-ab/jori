// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { UsageSeriesSection } from "./series"
import { type UsageDays, type UsageOverview } from "./types"

const { asked, sliced } = vi.hoisted(() => ({
  asked: [] as unknown[],
  sliced: { current: undefined as { series: unknown[] } | undefined },
}))

// Stands in for the series query: it records what was asked of it, and
// answers "skip" with nothing at all, the way a skipped query reads.
vi.mock("convex/react", () => ({
  useQuery: (_reference: unknown, args: unknown) => {
    asked.push(args)

    return args === "skip" ? undefined : sliced.current
  },
}))

// Recharts needs a laid-out box jsdom never gives it; what this section owns
// is the control beside the charts and which series they are handed.
vi.mock("./chart", () => ({
  UsageCharts: ({ series }: { series?: { date: string }[] }) => (
    <div data-days={series?.length ?? "loading"} data-testid="charts" />
  ),
}))

beforeAll(() => {
  // Radix's select reaches for pointer-capture APIs jsdom leaves out.
  window.HTMLElement.prototype.hasPointerCapture = () => false
  window.HTMLElement.prototype.releasePointerCapture = () => undefined
  window.HTMLElement.prototype.scrollIntoView = () => undefined
})

afterEach(() => {
  asked.length = 0
  sliced.current = undefined
  cleanup()
})

function overview(overrides: Partial<UsageOverview> = {}) {
  return {
    series: [
      { date: "2026-03-14", micros: 100, ended: 1, failed: 0 },
      { date: "2026-03-15", micros: 900, ended: 3, failed: 1 },
    ],
    automations: [
      { id: "automations:1", label: "Morning digest", micros: 900 },
    ],
    folders: [{ folderId: "folders:2", name: "Pipeline", micros: 100 }],
    ...overrides,
  } as UsageOverview
}

function section({
  days = 30,
  folderId,
  usage = overview(),
}: {
  days?: UsageDays
  folderId?: string
  usage?: UsageOverview
} = {}) {
  return (
    <UsageSeriesSection
      days={days}
      folderId={folderId as never}
      organizationId="organization"
      usage={usage}
    />
  )
}

function choose(name: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Filter" }), {
    key: "ArrowDown",
  })
  fireEvent.click(screen.getByRole("option", { name }))
}

function chartDays() {
  return screen.getByTestId("charts").dataset.days
}

test("the unfiltered charts draw the window the overview already carries", () => {
  render(section())

  expect(chartDays()).toBe("2")
  expect(asked.at(-1)).toBe("skip")
  expect(screen.getByText("Everything")).toBeDefined()
})

test("choosing an automation asks for that automation's own days", () => {
  sliced.current = { series: [{ date: "2026-03-15" }] }
  render(section())
  choose("Morning digest")

  expect(asked.at(-1)).toEqual({
    organizationId: "organization",
    days: 30,
    automationId: "automations:1",
  })
  expect(chartDays()).toBe("1")
})

test("inside a folder an automation's days stay inside that folder", () => {
  render(section({ folderId: "folders:1" }))
  choose("Morning digest")

  expect(asked.at(-1)).toEqual({
    organizationId: "organization",
    days: 30,
    folderId: "folders:1",
    automationId: "automations:1",
  })
})

test("choosing a subfolder charts that subfolder rather than the page's", () => {
  render(section({ folderId: "folders:1" }))
  choose("Pipeline")

  expect(asked.at(-1)).toEqual({
    organizationId: "organization",
    days: 30,
    folderId: "folders:2",
  })
})

test("the charts hold their boxes while a chosen slice is on its way", () => {
  render(section())
  choose("Morning digest")

  expect(chartDays()).toBe("loading")
})

test("a window the choice has fallen out of goes back to everything", () => {
  const view = render(section())

  choose("Morning digest")

  expect(asked.at(-1)).not.toBe("skip")

  view.rerender(
    section({ days: 7, usage: overview({ automations: [], folders: [] }) })
  )

  expect(asked.at(-1)).toBe("skip")
  expect(chartDays()).toBe("2")

  // And it stays gone: the window it belonged to comes back unfiltered.
  view.rerender(section())

  expect(asked.at(-1)).toBe("skip")
  expect(screen.getByText("Everything")).toBeDefined()
})

test("nothing to narrow to means no control to offer", () => {
  render(section({ usage: overview({ automations: [], folders: [] }) }))

  expect(screen.queryByRole("combobox")).toBeNull()
  expect(chartDays()).toBe("2")
})

test("an automation with no id left to open is not on offer", () => {
  render(
    section({
      usage: overview({
        automations: [
          { label: "One-shot reminder", micros: 20, ended: 1, failed: 0 },
        ],
        folders: [],
      }),
    })
  )

  expect(screen.queryByRole("combobox")).toBeNull()
})
