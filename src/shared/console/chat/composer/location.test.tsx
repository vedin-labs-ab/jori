// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { typeInto } from "../../../../../test/editor"
import { ChatLocation } from "../location"
import { ChatComposer } from "."

afterEach(cleanup)

test("clearing the save folder keeps the inline reference and draft in the same editor", async () => {
  const props = {
    onSend: vi.fn(),
    onStop: vi.fn(),
    initialReference: {
      kind: "table" as const,
      id: "collections_renewals",
      name: "Customer renewals",
    },
  }
  const metadata = (folderId: string | null) => (
    <ChatLocation
      folderId={folderId}
      folderName="Renewals"
      folders={[]}
      onChange={() =>
        view.rerender(<ChatComposer {...props} metadata={metadata(null)} />)
      }
    />
  )
  const view = render(
    <ChatComposer {...props} metadata={metadata("folders_renewals")} />,
    { wrapper: TooltipProvider }
  )
  const field = await screen.findByRole("textbox", { name: "Message" })
  const chip = await screen.findByRole("button", {
    name: "Remove Customer renewals",
  })
  expect(field.contains(chip)).toBe(true)
  typeInto(field, "needs attention")
  fireEvent.click(screen.getByRole("button", { name: "Remove folder" }))
  expect(
    screen.getByRole("button", { name: "Save in: No folder" })
  ).toBeDefined()
  expect(screen.getByRole("textbox", { name: "Message" })).toBe(field)
  expect(field.contains(chip)).toBe(true)
  expect(field.textContent).toContain("needs attention")
  fireEvent.keyDown(field, { key: "Enter" })
  expect(props.onSend).toHaveBeenCalledWith(
    "+[table:collections_renewals] needs attention",
    [{ kind: "table", id: "collections_renewals" }]
  )
})

test("removing an entry mention survives rerenders and leaves the destination alone", async () => {
  const props = {
    onSend: vi.fn(),
    onStop: vi.fn(),
    initialReference: {
      kind: "table" as const,
      id: "collections_renewals",
      name: "Customer renewals",
    },
  }
  const metadata = (
    <ChatLocation
      folderId="folders_renewals"
      folderName="Renewals"
      folders={[]}
      onChange={vi.fn()}
    />
  )
  const view = render(<ChatComposer {...props} metadata={metadata} />, {
    wrapper: TooltipProvider,
  })
  fireEvent.click(
    await screen.findByRole("button", { name: "Remove Customer renewals" })
  )
  view.rerender(
    <ChatComposer
      {...props}
      initialReference={{ ...props.initialReference }}
      metadata={metadata}
    />
  )
  expect(
    screen.queryByRole("button", { name: "Remove Customer renewals" })
  ).toBeNull()
  expect(
    screen.getByRole("button", { name: "Save in: Renewals" })
  ).toBeDefined()
  const field = screen.getByRole("textbox", { name: "Message" })
  typeInto(field, "Another question")
  fireEvent.keyDown(field, { key: "Enter" })
  expect(props.onSend).toHaveBeenCalledWith("Another question", [])
})

test("pressing Enter in folder search never sends the message draft", async () => {
  const onSend = vi.fn()
  render(
    <ChatComposer
      onSend={onSend}
      onStop={vi.fn()}
      metadata={
        <ChatLocation folderId={null} folders={[]} onChange={vi.fn()} />
      }
    />,
    { wrapper: TooltipProvider }
  )
  const field = await screen.findByRole("textbox", { name: "Message" })
  typeInto(field, "Keep drafting")
  fireEvent.click(screen.getByRole("button", { name: "Save in: No folder" }))
  const search = await screen.findByRole("textbox", { name: "Search folders" })
  fireEvent.keyDown(search, { key: "Enter" })
  expect(onSend).not.toHaveBeenCalled()
  expect(search.closest("form")).toBeNull()
})
