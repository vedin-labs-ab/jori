// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { message, now } from "../../../../../test/chat"
import {
  createMentionCatalog,
  emptyMentionSources,
} from "../../mentions/sources"
import { type ResolveReference } from "../../references"
import { type OpenTarget } from "../pane/tabs"
import { PersonMessage } from "./message"

afterEach(cleanup)

const catalog = createMentionCatalog({
  ...emptyMentionSources,
  integrations: ["slack"],
  skills: ["triage"],
  tools: [{ surface: "jori", tool: "search_files" }],
})
const resolve: ResolveReference = (target) =>
  target.id === "t1"
    ? { kind: "table", id: "t1", name: "Customer renewals" }
    : undefined

function renderAsk(text: string, onOpen: OpenTarget = vi.fn()) {
  const ask = message({
    id: "m1",
    role: "person",
    text,
    references: [{ kind: "table", id: "t1" }],
  })

  render(
    <TooltipProvider>
      <PersonMessage
        catalog={catalog}
        message={ask}
        now={now}
        onOpenReference={onOpen}
        resolveReference={resolve}
      />
    </TooltipProvider>
  )
}

test("the tokens stand in the words as chips, and a resource's opens it", () => {
  const onOpen = vi.fn<OpenTarget>()

  renderAsk(
    "Check +[table:t1] with /triage and #search_files via @Slack",
    onOpen
  )

  const chip = screen.getByRole("button", { name: "Customer renewals" })

  expect(chip.closest("[data-mention-kind]")?.getAttribute("title")).toBe(
    "Table"
  )
  expect(
    screen.getByText("triage").closest("[data-mention-kind]")
  ).not.toBeNull()
  expect(
    screen.getByText("search_files").closest("[data-mention-kind]")
  ).not.toBeNull()
  expect(
    screen.getByText("Slack").closest("[data-mention-kind]")
  ).not.toBeNull()
  expect(screen.queryByRole("button", { name: "triage" })).toBeNull()
  expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull()

  fireEvent.click(chip)

  expect(onOpen).toHaveBeenCalledWith({ kind: "table", id: "t1" })
})

test("a resource the host cannot name reads as its kind, unavailable, and opens nothing; prose stays prose", () => {
  renderAsk("See +[job:gone] and a+b, or #1, /triage")

  const gone = screen.getByText("Job").closest("[data-mention-kind]")

  expect(gone?.getAttribute("title")).toBe("No longer available")
  expect(gone?.querySelector("button")).toBeNull()
  expect(screen.getByText(/a\+b, or #1,/)).toBeDefined()
})
