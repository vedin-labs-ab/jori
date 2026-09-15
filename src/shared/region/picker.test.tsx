// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { RegionPicker } from "./picker"

// Exercise the US-only rollout regardless of the local preview's region.
vi.mock("./config", async (original) => {
  const module = await original<typeof import("./config")>()
  return { ...module, regionConfig: module.createRegionConfig({}, true) }
})

afterEach(cleanup)

test("shows the current region and keeps EU unavailable", () => {
  render(<RegionPicker />)

  const picker = screen.getByLabelText("Data region") as HTMLSelectElement
  const options = [...picker.options]

  expect(picker.value).toBe("us")
  expect(options.map((option) => option.text)).toEqual([
    "🇺🇸 United States",
    "🇪🇺 European Union (Coming soon)",
  ])
  expect(screen.getByText("Data region").getAttribute("for")).toBe(picker.id)
  expect(options[1]?.disabled).toBe(true)
})
