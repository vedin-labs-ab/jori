// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { UsageOverlay } from "./overlay"
import { type UsageDays } from "./types"

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))

// The panel's contract is with the URL: it renders the window it is given
// and navigates for another. The view inside it is Recharts, mocked to the
// one thing asserted here — which window it was handed.
vi.mock("./view", () => ({
  UsageView: ({ days }: { days: UsageDays }) => <p>Usage over {days} days</p>,
}))

afterEach(() => {
  cleanup()
  navigate.mockClear()
})

function overlay(days: UsageDays | undefined) {
  return (
    <UsageOverlay days={days} organizationId="organizations:1">
      <a href="/folders/finance">Finance</a>
    </UsageOverlay>
  )
}

function renderOverlay(days: UsageDays | undefined) {
  return render(overlay(days))
}

function coveredPage() {
  return screen.getByText("Finance").parentElement
}

test("costs the page nothing until the panel is first opened", () => {
  renderOverlay(undefined)

  expect(screen.queryByText(/Usage over/)).toBeNull()
  expect(coveredPage()?.hasAttribute("inert")).toBe(false)
})

test("shows the window the URL opened it with", async () => {
  renderOverlay(30)

  expect(await screen.findByText(/Usage over 30 days/)).toBeDefined()
})

test("puts the page it covers out of reach while it is up", () => {
  renderOverlay(30)

  expect(coveredPage()?.hasAttribute("inert")).toBe(true)
})

test("closes back to the plain page from the button and from Escape", async () => {
  const view = renderOverlay(30)

  await screen.findByText(/Usage over 30 days/)
  fireEvent.click(screen.getByRole("button", { name: "Close usage" }))
  fireEvent.keyDown(window, { key: "Escape" })

  expect(navigate.mock.calls.map(([options]) => options)).toEqual([
    { replace: true, search: {}, to: "/folders" },
    { replace: true, search: {}, to: "/folders" },
  ])

  view.rerender(overlay(undefined))

  // The window it was showing stays up while the panel slides away; a
  // closing panel emptied of its content reads as a flicker.
  expect(screen.getByText(/Usage over 30 days/)).toBeDefined()
})

test("keeps a folder's panel on that folder when the window changes", () => {
  render(
    <UsageOverlay
      days={30}
      folderId={"folders:1" as never}
      organizationId="organizations:1"
    >
      <a href="/folders/finance">Finance</a>
    </UsageOverlay>
  )

  fireEvent.keyDown(window, { key: "Escape" })

  expect(navigate).toHaveBeenCalledWith({
    params: { folderId: "folders:1" },
    replace: true,
    search: {},
    to: "/folders/$folderId",
  })
})
