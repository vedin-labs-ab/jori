// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { renderComposer } from "../../../../../test/composer"
import { typeInto } from "../../../../../test/editor"
import { ChatComposer } from "."

afterEach(cleanup)

test("dropping context removes its row and keeps the draft in the same editor", async () => {
  const props = { onSend: vi.fn(), onStop: vi.fn() }
  const onClearContext = vi.fn(() => {
    view.rerender(<ChatComposer {...props} />)
  })
  const view = render(
    <ChatComposer
      {...props}
      context={{ kind: "folder", id: "folders_finance", name: "Finance" }}
      onClearContext={onClearContext}
    />,
    { wrapper: TooltipProvider }
  )
  const field = await screen.findByRole("textbox", { name: "Message" })
  const row = screen.getByText("Finance").closest("[data-align=block-start]")

  expect(row).not.toBeNull()
  typeInto(field, "Keep this draft")

  fireEvent.click(screen.getByRole("button", { name: "Remove Finance" }))

  expect(onClearContext).toHaveBeenCalledTimes(1)
  expect(row?.isConnected).toBe(false)
  expect(screen.getByRole("textbox", { name: "Message" })).toBe(field)
  expect(field.textContent).toBe("Keep this draft")
})

test("the context ring sits by the send control once a run has measured the window", async () => {
  const usage = {
    condensed: false,
    model: "openai/gpt-x",
    runId: "runs_1",
    turn: { cached: 40_000, input: 61_000, output: 900, reasoning: 300 },
    usedTokens: 61_000,
    windowTokens: 200_000,
  }

  await renderComposer({ usage })

  expect(
    screen.getByRole("button", { name: "Context: 31%, 61K of 200K tokens" })
  ).toBeDefined()
})

test("the + sigil offers resources, and the chosen one goes with the message as its token", async () => {
  const onMention = vi.fn()
  const { field, onSend } = await renderComposer({ onMention })

  typeInto(field, "Look at +ren")

  const listbox = await screen.findByRole("listbox")

  expect(field.getAttribute("aria-expanded")).toBeNull()
  expect(field.getAttribute("aria-controls")).toBe(listbox.id)
  // Names starting with the query come first, then names holding it.
  expect(
    screen.getAllByRole("option").map((option) => option.textContent)
  ).toEqual(["Renewals digestJob", "Customer renewalsTable"])

  fireEvent.keyDown(field, { key: "ArrowUp" })
  fireEvent.keyDown(field, { key: "ArrowDown" })
  fireEvent.keyDown(field, { key: "ArrowDown" })
  fireEvent.keyDown(field, { key: "Enter" })

  expect(screen.queryByRole("listbox")).toBeNull()
  expect(listbox.isConnected).toBe(false)
  expect(field.getAttribute("aria-controls")).toBeNull()
  expect(
    await screen.findByRole("button", { name: "Remove Customer renewals" })
  ).toBeDefined()
  expect(onSend).not.toHaveBeenCalled()

  typeInto(field, "this month")
  fireEvent.keyDown(field, { key: "Enter" })

  expect(onMention).toHaveBeenCalledWith({
    kind: "table",
    id: "collections_renewals",
  })
  expect(onSend).toHaveBeenCalledWith(
    "Look at +[table:collections_renewals] this month",
    [{ kind: "table", id: "collections_renewals" }]
  )
})

test("the other sigils name skills, tools, and integrations, and Escape closes the list", async () => {
  const { field, onSend } = await renderComposer()

  typeInto(field, "/tri")
  fireEvent.click(await screen.findByRole("option", { name: "triage" }))
  typeInto(field, "then #sea")
  fireEvent.keyDown(field, { key: "Tab" })
  typeInto(field, "in @sl")

  expect(await screen.findByRole("option", { name: "Slack" })).toBeDefined()

  fireEvent.keyDown(field, { key: "Escape" })

  expect(screen.queryByRole("listbox")).toBeNull()

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledWith("/triage then #search_files in @sl", [])
})

test("a resource's chip deleted is a resource let go of; one sent is not", async () => {
  const onUnmention = vi.fn()
  const { field, onSend } = await renderComposer({ onUnmention })

  typeInto(
    field,
    "Run +[table:collections_renewals] and +[job:jobs_digest] now"
  )

  fireEvent.click(
    await screen.findByRole("button", { name: "Remove Customer renewals" })
  )

  expect(onUnmention).toHaveBeenCalledWith({
    kind: "table",
    id: "collections_renewals",
  })

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onUnmention).toHaveBeenCalledTimes(1)
  expect(onSend).toHaveBeenCalledWith(
    expect.stringContaining("+[job:jobs_digest]"),
    [{ kind: "job", id: "jobs_digest" }]
  )
})

test("a chip can be removed and a typed token becomes a chip at its boundary", async () => {
  const { field, onSend } = await renderComposer()

  typeInto(field, "Run /triage now")

  fireEvent.click(await screen.findByRole("button", { name: "Remove triage" }))

  expect(screen.queryByRole("button", { name: "Remove triage" })).toBeNull()

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledWith("Run  now", [])
})

test("the + menu lists the kinds, then a kind's items, and puts the chosen one in as a chip", async () => {
  const onMention = vi.fn()
  const { field, onSend } = await renderComposer({ onMention })

  typeInto(field, "Watch ")
  fireEvent.click(screen.getByRole("button", { name: "Mention a resource" }))

  expect(
    (await screen.findAllByRole("option")).map((option) => option.textContent)
  ).toEqual([
    "Chats1",
    "Tables1",
    "Files0",
    "Stores0",
    "Jobs1",
    "Folders0",
    "Runs0",
  ])

  fireEvent.click(screen.getByRole("option", { name: /^Jobs/ }))
  fireEvent.click(
    await screen.findByRole("option", { name: "Renewals digest" })
  )

  expect(
    await screen.findByRole("button", { name: "Remove Renewals digest" })
  ).toBeDefined()

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onMention).toHaveBeenCalledWith({ kind: "job", id: "jobs_digest" })
  expect(onSend).toHaveBeenCalledWith("Watch +[job:jobs_digest]", [
    { kind: "job", id: "jobs_digest" },
  ])
})

test("searching the + menu finds across kinds", async () => {
  await renderComposer()

  fireEvent.click(screen.getByRole("button", { name: "Mention a resource" }))
  fireEvent.change(await screen.findByRole("combobox"), {
    target: { value: "renew" },
  })

  expect(
    (await screen.findAllByRole("option")).map((option) => option.textContent)
  ).toEqual(["Customer renewals", "Renewals digest"])
})
