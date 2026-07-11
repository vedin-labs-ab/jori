import { type Editor } from "@tiptap/react"
import { describe, expect, test, vi } from "vitest"
import { emptyAutomationMentionCatalog } from "../../access"
import {
  automationReferenceNodeName,
  automationSurfaceNodeName,
  createAutomationInstructionDocument,
} from "./document"
import { insertMentionSuggestion } from "./suggestion/input"
import { type InstructionSuggestionState } from "./suggestion/suggest"

describe("automation instructions input", () => {
  test("inserts duplicate suggestions with existing integration tools", () => {
    const { editor, readInserted } = fakeEditor("Read @GitHub.", [
      { integration: "github", tools: ["github_add_issue_comment"] },
    ])
    const setSuggestion = vi.fn()

    insertMentionSuggestion({
      editor,
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
})

function suggestionState(): InstructionSuggestionState {
  return {
    activeIndex: 0,
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
  const chain: EditorChain = {
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
    },
  } as unknown as Editor

  return { editor, readInserted: () => insertedContent }
}

type EditorChain = {
  focus: () => EditorChain
  insertContentAt: (range: unknown, content: unknown) => EditorChain
  run: () => boolean
}
