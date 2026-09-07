// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { typeInto } from "../../../../../test/editor"
import { type MentionSources } from "../../mentions/sources"
import { ChatComposer } from "."

afterEach(cleanup)

const sources: MentionSources = {
  integrations: ["slack", "github"],
  resources: [
    { kind: "table", id: "collections_renewals", name: "Customer renewals" },
    { kind: "job", id: "jobs_digest", name: "Renewals digest" },
    { kind: "chat", id: "conversations_1", name: "Last week's sync" },
  ],
  skills: ["triage", "release-notes"],
  tools: [{ label: "Search files", surface: "jori", tool: "search_files" }],
}

async function renderComposer(
  props: Partial<Parameters<typeof ChatComposer>[0]> = {}
) {
  const onSend = vi.fn()

  render(
    <TooltipProvider>
      <ChatComposer
        live={null}
        mentions={sources}
        onSend={onSend}
        onStop={vi.fn()}
        {...props}
      />
    </TooltipProvider>
  )

  const field = await screen.findByRole("textbox", { name: "Message" })

  return { field, onSend }
}

test("Enter sends the trimmed text and clears the field; Shift+Enter keeps writing", async () => {
  const { field, onSend } = await renderComposer()

  expect(
    screen
      .getByRole("button", { name: "Send message" })
      .hasAttribute("disabled")
  ).toBe(true)

  typeInto(field, "  Chase the invoices ")
  fireEvent.keyDown(field, { key: "Enter", shiftKey: true })

  expect(onSend).not.toHaveBeenCalled()

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledWith("Chase the invoices", [])
  expect(field.textContent).toBe("")
})

test("while a run is live the control stops it instead of sending", async () => {
  const onStop = vi.fn()
  const { field, onSend } = await renderComposer({
    live: { id: "runs_1", status: "running" },
    onStop,
  })

  expect(screen.queryByRole("button", { name: "Send message" })).toBeNull()

  typeInto(field, "Also this")
  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Stop run" }))

  expect(onStop).toHaveBeenCalledTimes(1)
})

test("disabled, it says why", async () => {
  const { field } = await renderComposer({
    disabled: true,
    reason: "Spending is paused for this folder.",
  })

  expect(field.getAttribute("aria-disabled")).toBe("true")
  expect(field.getAttribute("contenteditable")).toBe("false")
  expect(screen.getByText("Spending is paused for this folder.")).toBeDefined()
  expect(field.getAttribute("aria-describedby")).not.toBeNull()
  expect(screen.queryByRole("button", { name: "Attach a resource" })).toBeNull()
})

test("the context chip names the resource and can be dropped", async () => {
  const onClearContext = vi.fn()

  await renderComposer({
    context: { kind: "folder", id: "folders_finance", name: "Finance" },
    onClearContext,
  })

  expect(screen.getByText("Finance")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Remove Finance" }))

  expect(onClearContext).toHaveBeenCalledTimes(1)
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
  const { field, onSend } = await renderComposer()

  typeInto(field, "Look at +ren")

  const listbox = await screen.findByRole("listbox")

  expect(field.getAttribute("aria-expanded")).toBe("true")
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
  expect(
    await screen.findByRole("button", { name: "Remove Customer renewals" })
  ).toBeDefined()
  expect(onSend).not.toHaveBeenCalled()

  typeInto(field, "this month")
  fireEvent.keyDown(field, { key: "Enter" })

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

test("a chip can be removed like any character, and a typed token becomes a chip at its boundary", async () => {
  const { field, onSend } = await renderComposer()

  typeInto(field, "Run /triage now")

  fireEvent.click(await screen.findByRole("button", { name: "Remove triage" }))

  expect(screen.queryByRole("button", { name: "Remove triage" })).toBeNull()

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledWith("Run  now", [])
})

test("a click on the frame beside the controls puts the caret in the field", async () => {
  const { field } = await renderComposer()

  field.blur()
  expect(document.activeElement).not.toBe(field)

  fireEvent.click(screen.getByText("resources"))

  // The editor takes focus on the next frame.
  await waitFor(() => expect(document.activeElement).toBe(field))
})

test("the + menu lists the kinds, then a kind's items, and puts the chosen one in as a chip", async () => {
  const onMention = vi.fn()
  const { field, onSend } = await renderComposer({ onMention })

  typeInto(field, "Watch ")
  fireEvent.click(screen.getByRole("button", { name: "Attach a resource" }))

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

  fireEvent.click(screen.getByRole("button", { name: "Attach a resource" }))
  fireEvent.change(await screen.findByRole("combobox"), {
    target: { value: "renew" },
  })

  expect(
    (await screen.findAllByRole("option")).map((option) => option.textContent)
  ).toEqual(["Customer renewals", "Renewals digest"])
})
