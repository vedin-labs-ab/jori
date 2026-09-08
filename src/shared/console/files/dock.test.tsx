// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FileDock } from "./dock"
import { type FileSiblings, noSiblings } from "./siblings"

const navigate = vi.hoisted(() => vi.fn())

vi.mock("@tanstack/react-router", () => ({
  Link: (props: React.ComponentProps<"a">) => <a {...props} />,
  useRouter: () => ({ navigate }),
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

const tools = <button type="button">Zoom in</button>

function renderDock(siblings: FileSiblings, dockTools?: React.ReactNode) {
  render(
    <TooltipProvider>
      <FileDock hasArrowKeys siblings={siblings} tools={dockTools} />
    </TooltipProvider>
  )
}

function navButton(name: "Previous file" | "Next file") {
  return screen.getByRole("button", { name })
}

test("shows the file's position and navigates to either neighbor", () => {
  renderDock(midListSiblings)

  const dock = screen.getByRole("toolbar", { name: "File navigation" })

  expect(dock.textContent).toBe("4 of 12")
  expect(navButton("Next file").getAttribute("aria-keyshortcuts")).toBe(
    "ArrowRight"
  )

  fireEvent.click(navButton("Next file"))
  fireEvent.click(navButton("Previous file"))

  expect(navigate.mock.calls).toEqual([
    [{ to: "/files/$fileId", params: { fileId: "next-file" } }],
    [{ to: "/files/$fileId", params: { fileId: "previous-file" } }],
  ])
})

test("disables the step past an end", () => {
  renderDock({ ...midListSiblings, next: null, position: 12 })

  expect(navButton("Previous file").hasAttribute("disabled")).toBe(false)
  expect(navButton("Next file").hasAttribute("disabled")).toBe(true)
})

test("a file alone with nothing to offer shows no dock", () => {
  renderDock(noSiblings)

  expect(screen.queryByRole("toolbar")).toBeNull()
})

test("a file alone shows its tools plainly, with no navigation to fold behind", () => {
  renderDock({ ...noSiblings, count: 1, position: 1 }, tools)

  expect(screen.queryByRole("button", { name: "Next file" })).toBeNull()
  expect(
    screen.getByRole("button", { name: "Zoom in" }).parentElement?.className
  ).not.toContain("grid-cols-[0fr]")
})

test("folds the tools behind the navigation until the dock is hovered or holds the focus", () => {
  renderDock(midListSiblings, tools)

  const zoom = screen.getByRole("button", { name: "Zoom in" })
  const fold = zoom.closest(".grid")

  expect(fold?.className).toContain("grid-cols-[0fr]")
  expect(fold?.className).toContain("group-hover/dock:grid-cols-[1fr]")
  expect(fold?.className).toContain("group-focus-within/dock:grid-cols-[1fr]")
  expect(fold?.className).toContain("motion-reduce:transition-none")

  // The fold hides nothing from the keyboard: the tool takes focus, which
  // is what opens the fold.
  zoom.focus()

  expect(document.activeElement).toBe(zoom)
  expect(
    screen.getByRole("toolbar", { name: "File navigation" }).contains(zoom)
  ).toBe(true)
})
