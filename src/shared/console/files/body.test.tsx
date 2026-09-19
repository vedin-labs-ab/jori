// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { type ReactNode, useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
} from "../materials/breadcrumb"
import { FileBody } from "./body"
import { type FileEditorState } from "./editor/section"
import { type FileSiblings } from "./siblings"
import { type FileDetail } from "./types"

vi.mock("@tanstack/react-router", () => ({
  Link: (props: React.ComponentProps<"a">) => <a {...props} />,
  useRouter: () => ({ navigate: vi.fn() }),
}))

// The editor stands in for itself: this is about what the page hangs off
// the file's name, so the stand-in only reports what an editor would.
vi.mock("./editor/section", async () => {
  const { useEffect } = await import("react")

  return {
    FileEditor: ({
      onState,
    }: {
      onState: (state: FileEditorState | undefined) => void
    }) => {
      useEffect(() => {
        onState({ saveStatus: "saving", savedText: "# Notes" })

        return () => onState(undefined)
      }, [onState])

      return <div data-testid="editor" />
    },
  }
})

vi.mock("./cache/url", () => ({
  useDisplayUrl: () => "https://files.test/current",
}))

vi.mock("./cache/preload", () => ({
  textSizeLimit: 1024 * 1024,
  usePreloadSiblings: () => undefined,
}))

afterEach(cleanup)

const siblings = {
  count: 3,
  next: { fileId: "next-file" },
  position: 2,
  previous: { fileId: "previous-file" },
} as FileSiblings

function renderBody(overrides: Partial<FileDetail>) {
  /** Stands in for the console header: the published name as the menu's
   *  trigger, with the published menu beside it and the rest of the crumb
   *  on show. */
  function Header({ children }: { children: ReactNode }) {
    const [crumb, setCrumb] = useState<MaterialBreadcrumb>()

    return (
      <MaterialBreadcrumbContext.Provider value={setCrumb}>
        <DropdownMenu>
          <DropdownMenuTrigger>{crumb?.name}</DropdownMenuTrigger>
          {crumb?.menu}
        </DropdownMenu>
        <output data-testid="save">{crumb?.saveStatus}</output>
        {children}
      </MaterialBreadcrumbContext.Provider>
    )
  }

  const file = {
    fileId: "file-1",
    mimeType: "text/markdown",
    name: "notes.md",
    ownerName: "Ada Lovelace",
    size: 2048,
    source: "upload",
    updatedAt: Date.now(),
    url: "https://files.test/current",
    ...overrides,
  } as unknown as FileDetail

  render(
    <TooltipProvider>
      <Header>
        <FileBody
          file={file}
          onSave={() => Promise.resolve(true)}
          siblings={siblings}
          titleMenu={(lead) => (
            <DropdownMenuContent>
              {lead}
              <div>Rename…</div>
            </DropdownMenuContent>
          )}
        />
      </Header>
    </TooltipProvider>
  )
}

/** Opens the menu on the file's name. Radix opens on pointer down and
 *  hides the rest of the page from assistive tech while it is open, so
 *  the trigger is looked up once. */
function openMenu(name: string) {
  const trigger = screen.getByRole("button", { name })

  fireEvent.pointerDown(trigger)
  fireEvent.click(trigger)
}

test("publishes the file's crumb: its name and the editor's save", () => {
  renderBody({})

  expect(screen.getByTestId("editor")).toBeDefined()
  expect(screen.getByTestId("save").textContent).toBe("saving")
})

test("the title menu leads with provenance and a copy, then the host's items", async () => {
  const writeText = vi.fn(() => Promise.resolve())

  Object.assign(navigator, { clipboard: { writeText } })
  renderBody({})

  openMenu("notes.md")

  expect(screen.getByText("Ada Lovelace")).toBeDefined()
  expect(screen.getByText(/^Updated just now · 2 KB$/)).toBeDefined()
  expect(screen.queryByRole("menuitemradio")).toBeNull()
  expect(screen.getByText("Rename…")).toBeDefined()

  // The editor's saved buffer, not the stored blob.
  fireEvent.click(screen.getByRole("menuitem", { name: "Copy text" }))

  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("# Notes"))
})

test("an HTML file opens rendered and offers its view in the menu", () => {
  renderBody({ mimeType: "text/html", name: "page.html" })

  expect(screen.getByTitle("page.html").tagName).toBe("IFRAME")
  expect(screen.getByText("2 of 3")).toBeDefined()

  openMenu("page.html")

  expect(
    screen.getByRole("menuitemradio", { name: "Preview" }).dataset.state
  ).toBe("checked")

  fireEvent.click(screen.getByRole("menuitemradio", { name: "Code" }))

  expect(screen.getByTestId("editor")).toBeDefined()
  expect(screen.queryByTitle("page.html")).toBeNull()
})

test("a picture gets the viewer, its zoom in the dock, and no text to copy", () => {
  renderBody({ mimeType: "image/png", name: "chart.png", source: "run" })

  expect(screen.getByRole("img", { name: "chart.png" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Zoom in" })).toBeDefined()
  expect(screen.getByText("2 of 3")).toBeDefined()
  expect(screen.getByTestId("save").textContent).toBe("")

  openMenu("chart.png")

  expect(screen.getByText("Jori")).toBeDefined()
  expect(screen.queryByRole("menuitem", { name: "Copy text" })).toBeNull()
})

test("a file with no inline view offers the download under the dock", () => {
  renderBody({ mimeType: "application/zip", name: "bundle.zip" })

  expect(screen.getByText("No inline view")).toBeDefined()
  expect(screen.getByRole("button", { name: "Download" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Next file" })).toBeDefined()
})
