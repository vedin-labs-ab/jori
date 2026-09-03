// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type FileDetail } from "@/shared/console/files/types"
import { noSiblings } from "../siblings"
import { FileHtml, type HtmlMode } from "./html"

vi.mock("@tanstack/react-router", () => ({
  Link: (props: React.ComponentProps<"a">) => <a {...props} />,
  useRouter: () => ({ navigate: vi.fn() }),
}))

// The editor stands in for itself: the code mode only needs a mount to
// land in.
vi.mock("../editor/section", () => ({
  FileEditor: () => <div data-testid="editor" />,
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

function renderHtmlView(mode: HtmlMode) {
  render(
    <TooltipProvider>
      <FileHtml
        errorFallback={<div>error</div>}
        file={file}
        mode={mode}
        onSave={() => Promise.resolve(true)}
        onState={() => undefined}
        siblings={noSiblings}
        url={file.url ?? ""}
      />
    </TooltipProvider>
  )
}

test("renders the document in a scripts-only sandbox", () => {
  renderHtmlView("preview")

  const frame = screen.getByTitle("page.html")

  expect(frame.tagName).toBe("IFRAME")
  expect(frame.getAttribute("sandbox")).toBe("allow-scripts")
  expect(frame.getAttribute("src")).toBe("https://files.test/page")
  expect(screen.queryByTestId("editor")).toBeNull()
})

test("code mode drops into the editor", () => {
  renderHtmlView("code")

  expect(screen.getByTestId("editor")).toBeDefined()
  expect(screen.queryByTitle("page.html")).toBeNull()
})
