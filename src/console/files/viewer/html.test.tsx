// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { noSiblings } from "../siblings"
import { type FileDetail } from "../types"
import { FileHtml } from "./html"

vi.mock("@tanstack/react-router", () => ({
  Link: (props: React.ComponentProps<"a">) => <a {...props} />,
  useNavigate: () => vi.fn(),
}))

// The editor stands in for itself: the toggle only needs a mount to land
// in, and the stub surfaces the tools slot the toggle arrives through.
vi.mock("../editor/section", () => ({
  FileEditor: ({ tools }: { tools?: React.ReactNode }) => (
    <div data-testid="editor">{tools}</div>
  ),
}))

vi.mock("../cache/url", () => ({
  useDisplayUrl: () => "https://files.test/page",
}))

vi.mock("../cache/preload", () => ({
  usePreloadSiblings: () => undefined,
}))

afterEach(cleanup)

const file = {
  fileId: "file-1",
  mimeType: "text/html",
  name: "page.html",
  ownerName: "Albin",
  size: 512,
  source: "upload",
  updatedAt: 1700000000000,
  url: "https://files.test/page",
} as unknown as FileDetail

function renderHtmlView() {
  render(
    <TooltipProvider>
      <FileHtml
        errorFallback={<div>error</div>}
        file={file}
        organizationId="org-1"
        siblings={noSiblings}
        url={file.url ?? ""}
      />
    </TooltipProvider>
  )
}

// Radix tabs select on mousedown, not click.
function switchMode(name: "Code" | "Preview") {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 })
}

test("opens rendered by default, scripts-only sandbox on the frame", () => {
  renderHtmlView()

  const frame = screen.getByTitle("page.html")

  expect(frame.tagName).toBe("IFRAME")
  expect(frame.getAttribute("sandbox")).toBe("allow-scripts")
  expect(frame.getAttribute("src")).toBe("https://files.test/page")
  expect(
    screen.getByRole("tab", { name: "Preview" }).getAttribute("aria-selected")
  ).toBe("true")
  expect(screen.queryByTestId("editor")).toBeNull()
})

test("the toggle switches to the editor and back to the preview", () => {
  renderHtmlView()

  switchMode("Code")

  expect(screen.getByTestId("editor")).toBeDefined()
  expect(screen.queryByTitle("page.html")).toBeNull()
  // The toggle rides along into the editor's toolbar slot.
  expect(
    screen.getByRole("tab", { name: "Code" }).getAttribute("aria-selected")
  ).toBe("true")

  switchMode("Preview")

  expect(screen.getByTitle("page.html")).toBeDefined()
  expect(screen.queryByTestId("editor")).toBeNull()
})
