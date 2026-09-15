// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConsoleSearch, SidebarSearch } from "./index"

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock("./query", () => ({
  useSearch: () => ({ status: "idle", hits: [], partial: false }),
}))
vi.mock("./open", () => ({ useOpenHit: () => vi.fn() }))
vi.mock("@/shared/session/auth", () => ({
  useActiveOrganization: () => ({ data: { id: "org", name: "Workspace" } }),
}))
vi.mock("@/shared/console/shell/location", () => ({
  useConsoleNavigate: () => mocks.navigate,
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function preview(sidebar: boolean) {
  return (
    <TooltipProvider>
      <ConsoleSearch chats={[]}>
        {sidebar ? <SidebarSearch /> : null}
        <input aria-label="Editor" />
      </ConsoleSearch>
    </TooltipProvider>
  )
}

test("product shortcuts outlive the sidebar and search toggles while an editor has focus", () => {
  const view = render(preview(true))
  fireEvent.click(screen.getByRole("button", { name: "Search workspace" }))
  expect(screen.getByRole("combobox")).toBeTruthy()
  fireEvent.keyDown(screen.getByRole("combobox"), {
    key: "k",
    code: "KeyK",
    ctrlKey: true,
  })
  expect(screen.queryByRole("combobox")).toBeNull()
  view.rerender(preview(false))
  fireEvent.keyDown(document.body, {
    key: "j",
    code: "KeyJ",
    altKey: true,
    shiftKey: true,
  })
  expect(mocks.navigate).toHaveBeenCalledWith({ to: "/jobs" })
  fireEvent.keyDown(screen.getByRole("textbox"), {
    key: "k",
    code: "KeyK",
    ctrlKey: true,
  })
  expect(screen.getByRole("combobox")).toBeTruthy()
})
