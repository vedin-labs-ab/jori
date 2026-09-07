// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  createMentionCatalog,
  emptyMentionSources,
} from "../../mentions/sources"
import { type OpenTarget } from "../pane/tabs"
import { type ChatMessage, type ResolveReference } from "../types"
import { PersonMessage } from "./message"

afterEach(cleanup)

const now = 1_700_000_000_000
const catalog = createMentionCatalog({
  ...emptyMentionSources,
  integrations: ["slack"],
  skills: ["triage"],
  tools: ["search_files"].map((tool) => ({
    label: tool,
    surface: "jori" as const,
    tool,
  })),
})
const resolve: ResolveReference = (target) =>
  target.id === "t1"
    ? { kind: "table", id: "t1", name: "Customer renewals" }
    : undefined

function renderAsk(text: string, onOpen: OpenTarget = vi.fn()) {
  const message: ChatMessage = {
    id: "m1",
    role: "person",
    text,
    parts: [],
    references: [{ kind: "table", id: "t1" }],
    createdAt: now,
  }

  render(
    <TooltipProvider>
      <PersonMessage
        catalog={catalog}
        context={undefined}
        message={message}
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
