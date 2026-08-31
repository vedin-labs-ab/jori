// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { TimezoneSection } from "./timezone"

const declareTimezone = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock("convex/react", () => ({ useMutation: () => declareTimezone }))
vi.mock("../../../shared/error", () => ({ showErrorToast: vi.fn() }))

beforeEach(() => {
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderSection(declared: string | undefined) {
  render(<TimezoneSection declared={declared} organizationId="acme" />)

  return screen.getByLabelText<HTMLInputElement>("Timezone")
}

test("an undeclared organization is shown counting in UTC", () => {
  expect(renderSection(undefined).value).toBe("UTC")
})

test("picking a zone declares it for the organization", async () => {
  const input = renderSection("Europe/Stockholm")

  expect(input.value).toBe("Europe/Stockholm")

  fireEvent.keyDown(input, { key: "ArrowDown" })
  fireEvent.change(input, { target: { value: "Asia/Tokyo" } })

  await waitFor(() =>
    expect(screen.getByRole("option", { name: "Asia/Tokyo" })).toBeDefined()
  )
  fireEvent.click(screen.getByRole("option", { name: "Asia/Tokyo" }))

  await waitFor(() =>
    expect(declareTimezone).toHaveBeenCalledWith({
      organizationId: "acme",
      timezone: "Asia/Tokyo",
    })
  )
})
