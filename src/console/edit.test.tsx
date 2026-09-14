// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { getFunctionName } from "convex/server"
import { toast } from "sonner"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ItemName } from "@/shared/console/edit/name"
import { type EditKind, useEditing } from "@/shared/console/edit/state"
import { ConsoleEditing } from "./edit"

const { create, rename, navigate } = vi.hoisted(() => ({
  create: vi.fn(),
  rename: vi.fn(),
  navigate: vi.fn(),
}))
vi.mock("convex/react", async (original) => ({
  ...(await original<typeof import("convex/react")>()),
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(ref).endsWith(":create") ? create : rename,
  useQuery: () => ({ status: "ready", folders: [] }),
}))
vi.mock("@/shared/console/shell/location", () => ({
  useConsoleNavigate: () => navigate,
}))
vi.mock("@/shared/session/auth", () => ({
  useActiveOrganization: () => ({ data: { id: "org-1" } }),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
afterEach(cleanup)
beforeEach(() => {
  vi.mocked(toast.error).mockClear()
  create.mockReset()
  rename.mockReset()
  navigate.mockReset()
  rename.mockResolvedValue(null)
})

function setup(kind: EditKind, parentId?: string, sidebar = false) {
  function Controls({
    kind,
    parentId,
    sidebar,
  }: {
    kind: EditKind
    parentId?: string
    sidebar?: boolean
  }) {
    const editing = useEditing()
    const edit = editing?.edit
    return (
      <>
        <button
          type="button"
          onClick={() =>
            editing?.create(
              kind,
              parentId,
              sidebar ? "sidebar" : kind === "folder" ? "contents" : kind
            )
          }
        >
          New item
        </button>
        {edit?.creating ? (
          <span role="status">Creating</span>
        ) : edit ? (
          <ItemName item={edit.item} surface={edit.surface}>
            <a href="#item">{edit.item.name}</a>
          </ItemName>
        ) : null}
        <button type="button">Elsewhere</button>
      </>
    )
  }
  create.mockResolvedValue({
    [`${kind}Id`]: "new",
    name: `New ${kind}`,
    parentId,
  })
  render(
    <ConsoleEditing>
      <Controls kind={kind} parentId={parentId} sidebar={sidebar} />
    </ConsoleEditing>
  )
}

test.each(["folder", "table", "store"] as const)(
  "%s creates immediately in the requested folder and selects its name",
  async (kind) => {
    setup(kind, "finance")
    fireEvent.click(screen.getByText("New item"))
    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(create).toHaveBeenCalledWith(
      kind === "folder"
        ? { organizationId: "org-1", parentId: "finance" }
        : {
            organizationId: "org-1",
            folderId: "finance",
            visibility: { mode: "organization" },
          }
    )
    expect(create.mock.calls[0][0]).not.toHaveProperty("columns")
    expect(create.mock.calls[0][0]).not.toHaveProperty("schema")
    const input = (await screen.findByRole("textbox")) as HTMLInputElement
    await waitFor(() => expect(document.activeElement).toBe(input))
    expect(input.value).toBe(`New ${kind}`)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(navigate).not.toHaveBeenCalled()
  }
)

test.each(["table", "store"] as const)(
  "%s saves a trimmed name through its existing update mutation",
  async (kind) => {
    setup(kind)
    fireEvent.click(screen.getByText("New item"))
    const input = await screen.findByRole("textbox")
    fireEvent.change(input, { target: { value: "  Invoices  " } })
    fireEvent.keyDown(input, { key: "Enter" })
    await waitFor(() =>
      expect(rename).toHaveBeenCalledExactlyOnceWith({
        organizationId: "org-1",
        [`${kind}Id`]: "new",
        name: "Invoices",
      })
    )
  }
)

test.each(["table", "store"] as const)(
  "Escape keeps the created %s instead of renaming or deleting it",
  async (kind) => {
    setup(kind)
    fireEvent.click(screen.getByText("New item"))
    const input = await screen.findByRole("textbox")
    fireEvent.change(input, { target: { value: "Discarded name" } })
    fireEvent.keyDown(input, { key: "Escape" })
    expect(create).toHaveBeenCalledOnce()
    expect(rename).not.toHaveBeenCalled()
    expect(screen.queryByRole("textbox")).toBeNull()
  }
)

test.each(["table", "store"] as const)(
  "sidebar creation reveals the %s's target folder",
  async (kind) => {
    setup(kind, "finance", true)
    fireEvent.click(screen.getByText("New item"))
    await screen.findByRole("textbox")
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      to: "/folders/$folderId",
      params: { folderId: "finance" },
    })
  }
)

test("root sidebar creation stays in the root folder listing", async () => {
  setup("store", undefined, true)
  fireEvent.click(screen.getByText("New item"))
  await screen.findByRole("textbox")
  expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/folders" })
})

test("repeated activation during creation cannot create duplicate items", async () => {
  setup("table")
  let finish!: (item: unknown) => void
  create.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  fireEvent.click(screen.getByText("New item"))
  fireEvent.click(screen.getByText("New item"))
  expect(create).toHaveBeenCalledOnce()
  expect(screen.getByRole("status").textContent).toBe("Creating")
  finish({ tableId: "new", name: "New table" })
  await screen.findByRole("textbox")
})

test("a failed rename preserves the text and blocks another creation until resolved", async () => {
  setup("store")
  rename.mockRejectedValueOnce(new Error("Connection lost"))
  fireEvent.click(screen.getByText("New item"))
  const input = await screen.findByRole("textbox")
  fireEvent.change(input, { target: { value: "Invoices" } })
  fireEvent.click(screen.getByText("New item"))
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledExactlyOnceWith("Connection lost")
  )
  expect(create).toHaveBeenCalledOnce()
  expect(screen.queryByRole("alert")).toBeNull()
  expect(input.getAttribute("aria-invalid")).toBeNull()
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
    "Invoices"
  )
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })
  await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull())
})

test("failed creation clears its placeholder and allows another attempt", async () => {
  setup("table")
  create.mockRejectedValueOnce(new Error("Connection lost"))
  fireEvent.click(screen.getByText("New item"))
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull())
  expect(screen.queryByRole("textbox")).toBeNull()
  fireEvent.click(screen.getByText("New item"))
  await screen.findByRole("textbox")
  expect(create).toHaveBeenCalledTimes(2)
})
