// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type FileSiblings, noSiblings } from "./siblings"
import { FileToolbar } from "./toolbar"

const navigate = vi.hoisted(() => vi.fn())

vi.mock("@tanstack/react-router", () => ({
  Link: (props: React.ComponentProps<"a">) => <a {...props} />,
  useNavigate: () => navigate,
}))

afterEach(() => {
  cleanup()
  navigate.mockClear()
})

const midListSiblings = {
  count: 12,
  next: { fileId: "next-file" },
  position: 4,
  previous: { fileId: "previous-file" },
} as FileSiblings

function renderToolbar(siblings: FileSiblings, tools?: React.ReactNode) {
  render(
    <TooltipProvider>
      <FileToolbar siblings={siblings} tools={tools}>
        meta line
      </FileToolbar>
    </TooltipProvider>
  )
}

test("shows the position and both nav buttons", () => {
  renderToolbar(midListSiblings)

  expect(screen.getByText("4 of 12")).toBeDefined()
  expect(
    screen
      .getByRole("button", { name: "Previous file" })
      .hasAttribute("disabled")
  ).toBe(false)
  expect(
    screen.getByRole("button", { name: "Next file" }).hasAttribute("disabled")
  ).toBe(false)
})

test("navigates to the clicked neighbor", () => {
  renderToolbar(midListSiblings)

  fireEvent.click(screen.getByRole("button", { name: "Next file" }))
  fireEvent.click(screen.getByRole("button", { name: "Previous file" }))

  expect(navigate.mock.calls).toEqual([
    [{ to: "/files/$fileId", params: { fileId: "next-file" } }],
    [{ to: "/files/$fileId", params: { fileId: "previous-file" } }],
  ])
})

test("disables both ends before the list resolves", () => {
  renderToolbar(noSiblings)

  expect(screen.queryByText(/of/)).toBeNull()

  for (const name of ["Previous file", "Next file"]) {
    expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(
      true
    )
  }
})

test("slots per-type tools next to the shared navigation", () => {
  renderToolbar(midListSiblings, <button type="button">Tool</button>)

  expect(screen.getByRole("button", { name: "Tool" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Next file" })).toBeDefined()
})
