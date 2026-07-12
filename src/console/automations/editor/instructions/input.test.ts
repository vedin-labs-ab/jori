import { type Editor } from "@tiptap/react"
import { expect, test, vi } from "vitest"
import { emptyAutomationMentionCatalog } from "../../access"
import {
  automationReferenceNodeName,
  automationSurfaceNodeName,
  createAutomationInstructionDocument,
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
    onWebAccessChange: vi.fn(),
    permissions: [],
    suggestion: { id: "github", kind: "integration", label: "GitHub" },
    setSuggestion,
    state: suggestionState(),
  })

  expect(readInserted()).toEqual([
    {
      attrs: {
        integration: "github",
        tools: ["github_add_issue_comment"],
      },
      type: automationSurfaceNodeName,
    },
    { text: " ", type: "text" },
  ])
  expect(setSuggestion).toHaveBeenLastCalledWith(null)
})

test("inserts skill and tool suggestions as reference nodes", () => {
  const { editor, readInserted } = fakeEditor("", [])

  insertMentionSuggestion({
    editor,
    onWebAccessChange: vi.fn(),
    permissions: [],
    suggestion: { id: "meeting-prep", kind: "skill", label: "meeting-prep" },
    setSuggestion: vi.fn(),
    state: suggestionState(),
  })

  expect(readInserted()).toEqual([
    {
      attrs: { id: "meeting-prep", kind: "skill" },
      type: automationReferenceNodeName,
    },
    { text: " ", type: "text" },
  ])
})

test("adds exact integration access beside a newly selected tool", () => {
  const { editor, readInserted } = fakeEditor("", [])

  insertMentionSuggestion({
    editor,
    onWebAccessChange: vi.fn(),
    permissions: [],
    suggestion: {
      access: { integration: "github", kind: "integration" },
      id: "github_add_issue_comment",
      kind: "tool",
      label: "github_add_issue_comment",
    },
    setSuggestion: vi.fn(),
    state: suggestionState(),
  })

  expect(readInserted()).toEqual([
    {
      attrs: {
        integration: "github",
        tools: ["github_add_issue_comment"],
      },
      type: automationSurfaceNodeName,
    },
    { text: " ", type: "text" },
    {
      attrs: { id: "github_add_issue_comment", kind: "tool" },
      type: automationReferenceNodeName,
    },
    { text: " ", type: "text" },
  ])
})

test("adds a selected tool to every existing integration reference", () => {
  const { editor, readInserted, readUpdated } = fakeEditor("Read @GitHub.", [
    { integration: "github", tools: ["github_get_issue"] },
  ])

  insertMentionSuggestion({
    editor,
    onWebAccessChange: vi.fn(),
    permissions: [],
    suggestion: {
      access: { integration: "github", kind: "integration" },
      id: "github_add_issue_comment",
      kind: "tool",
      label: "github_add_issue_comment",
    },
    setSuggestion: vi.fn(),
    state: suggestionState(),
  })

  expect(readInserted()?.[0]).toEqual({
    attrs: { id: "github_add_issue_comment", kind: "tool" },
    type: automationReferenceNodeName,
  })
  expect(readUpdated()).toEqual([
    {
      integration: "github",
      tools: ["github_get_issue", "github_add_issue_comment"],
    },
  ])
})

test("enables web access with a selected web tool", () => {
  const onWebAccessChange = vi.fn()
  const { editor } = fakeEditor("", [])

  insertMentionSuggestion({
    editor,
    onWebAccessChange,
    permissions: [],
    suggestion: {
      access: { kind: "web" },
      id: "web_search",
      kind: "tool",
      label: "web_search",
    },
    setSuggestion: vi.fn(),
    state: suggestionState(),
  })

  expect(onWebAccessChange).toHaveBeenCalledWith(true)
})

function suggestionState(): InstructionSuggestionState {
  return {
    active: { end: 0, kind: "integration", query: "", start: 0 },
    activeIndex: 0,
    empty: "empty",
    range: { from: 0, to: 0 },
    style: {},
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
              type: { name: automationSurfaceNodeName },
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
      createAutomationInstructionDocument({
        catalog: emptyAutomationMentionCatalog,
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
