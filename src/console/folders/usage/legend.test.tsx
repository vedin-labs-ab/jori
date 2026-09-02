// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type UsageSegment } from "@/shared/console/folders/usage/types"
import { SegmentLegend } from "./legend"

afterEach(cleanup)

const segments: UsageSegment[] = [
  { key: "folders:1", label: "Sales", micros: 900, ended: 3, failed: 0 },
  { key: "other", label: "Other", micros: 100, ended: 1, failed: 0 },
]

test("each entry is a switch that reads as on while its segment is drawn", () => {
  const onToggle = vi.fn()

  render(
    <SegmentLegend
      hidden={new Set(["other"])}
      onToggle={onToggle}
      segments={segments}
    />
  )

  const sales = screen.getByRole("button", { name: "Sales" })
  const other = screen.getByRole("button", { name: "Other" })

  expect(sales.getAttribute("aria-pressed")).toBe("true")
  expect(other.getAttribute("aria-pressed")).toBe("false")

  fireEvent.click(sales)

  expect(onToggle).toHaveBeenCalledWith("folders:1")
})
