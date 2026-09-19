import { type Editor } from "@tiptap/react"
import { expect, test, vi } from "vitest"
import { emptyJobMentionCatalog } from "../../access"
import {
  createJobInstructionDocument,
  jobReferenceNodeName,
  jobSurfaceNodeName,
} from "./document"
import { insertMentionSuggestion } from "./suggestion/input"
import { type InstructionSuggestionState } from "./suggestion/suggest"

test("inserts duplicate suggestions with existing integration tools", () => {
  const { editor, readInserted } = fakeEditor("Read @GitHub.", [
    { integration: "github", tools: ["github_add_issue_comment"] },
  ])
  const setSuggestion = vi.fn()

  insertMentionSuggestion({
    editor,
    permissions: [],
    suggestion: {
      id: "github",
      kind: "integration",
      label: "GitHub",
      surface: "github",
    },
    setSuggestion,
    state: suggestionState(),
  })

  expect(readInserted()).toEqual([
    {
      attrs: {
        integration: "github",
        tools: ["github_add_issue_comment"],
      },
      type: jobSurfaceNodeName,
    },
    { text: " ", type: "text" },
  ])
  expect(setSuggestion).toHaveBeenLastCalledWith(null)
})

test("inserts skill and tool suggestions as reference nodes", () => {
  const { editor, readInserted } = fakeEditor("", [])

  insertMentionSuggestion({
    editor,
    permissions: [],
    suggestion: { id: "meeting-prep", kind: "skill", label: "meeting-prep" },
    setSuggestion: vi.fn(),
    state: suggestionState(),
  })

  expect(readInserted()).toEqual([
    {
      attrs: { id: "meeting-prep", kind: "skill" },
      type: jobReferenceNodeName,
    },
    { text: " ", type: "text" },
  ])
})

test.each([
  { integration: "github", tool: "github_add_issue_comment" },
  { integration: "jori", tool: "web_search" },
] as const)(
  "adds exact $integration access beside a newly selected tool",
  ({ integration, tool }) => {
    const { editor, readInserted } = fakeEditor("", [])

    insertMentionSuggestion({
      editor,
      permissions: [],
      suggestion: {
        access: { integration, kind: "integration" },
        disabled: false,
        id: tool,
        kind: "tool",
        label: tool,
        surface: integration,
      },
      setSuggestion: vi.fn(),
      state: suggestionState(),
    })

    expect(readInserted()).toEqual([
      { attrs: { integration, tools: [tool] }, type: jobSurfaceNodeName },
      { text: " ", type: "text" },
      { attrs: { id: tool, kind: "tool" }, type: jobReferenceNodeName },
      { text: " ", type: "text" },
    ])
  }
)

test("a new pill keeps the access the job holds beside the text", () => {
  const { editor, readInserted } = fakeEditor("Read the table.", [])

  insertMentionSuggestion({
    editor,
    permissions: [],
    suggestion: {
      access: { integration: "jori", kind: "integration" },
      disabled: false,
      id: "web_fetch",
      kind: "tool",
      label: "web_fetch",
      surface: "jori",
    },
    setSuggestion: vi.fn(),
    state: suggestionState(),
    surfaces: [{ integration: "jori", tools: ["read_table"] }],
  })

  expect(readInserted()?.[0]).toEqual({
    attrs: { integration: "jori", tools: ["read_table", "web_fetch"] },
    type: jobSurfaceNodeName,
  })
})

test("adds a selected tool to every existing integration reference", () => {
  const { editor, readInserted, readUpdated } = fakeEditor("Read @GitHub.", [
    { integration: "github", tools: ["github_get_issue"] },
  ])

  insertMentionSuggestion({
    editor,
    permissions: [],
    suggestion: {
      access: { integration: "github", kind: "integration" },
      disabled: false,
      id: "github_add_issue_comment",
      kind: "tool",
      label: "github_add_issue_comment",
      surface: "github",
    },
    setSuggestion: vi.fn(),
    state: suggestionState(),
  })

  expect(readInserted()?.[0]).toEqual({
    attrs: { id: "github_add_issue_comment", kind: "tool" },
    type: jobReferenceNodeName,
  })
  expect(readUpdated()).toEqual([
    {
      integration: "github",
      tools: ["github_get_issue", "github_add_issue_comment"],
    },
  ])
})

function suggestionState(): InstructionSuggestionState {
  return {
    active: { end: 0, kind: "integration", query: "", start: 0 },
    activeIndex: 0,
    empty: "empty",
    range: { from: 0, to: 0 },
    anchor: {
      contextElement: {} as HTMLElement,
      getBoundingClientRect: vi.fn(),
    },
    side: "bottom",
    suggestions: [],
  }
}

function fakeEditor(
  description: string,
  surfaces: Array<{ integration: "github"; tools: string[] }>
) {
  let insertedContent: unknown
  const updated: unknown[] = []
  const transaction = {
    doc: {
      descendants: (visit: (node: unknown, position: number) => void) => {
        surfaces.forEach((surface, index) => {
          visit(
            {
              attrs: surface,
              type: { name: jobSurfaceNodeName },
            },
            index
          )
        })
      },
    },
    setNodeMarkup: (_position: number, _type: unknown, attrs: unknown) =>
      updated.push(attrs),
  }
  const chain: EditorChain = {
    command: (command) => {
      command({ tr: transaction })
      return chain
    },
    focus: () => chain,
    insertContentAt: (_range, content) => {
      insertedContent = content
      return chain
    },
    run: () => true,
  }
  const editor = {
    chain: () => chain,
    getJSON: () =>
      createJobInstructionDocument({
        catalog: emptyJobMentionCatalog,
        description,
        surfaces,
      }),
    state: {
      doc: {
        content: { size: 0 },
        textBetween: () => "",
      },
      selection: { $from: { marks: () => [] } },
    },
  } as unknown as Editor

  return {
    editor,
    readInserted: () => insertedContent as unknown[] | undefined,
    readUpdated: () => updated,
  }
}

type EditorChain = {
  command: (command: (props: { tr: unknown }) => boolean) => EditorChain
  focus: () => EditorChain
  insertContentAt: (range: unknown, content: unknown) => EditorChain
  run: () => boolean
}
