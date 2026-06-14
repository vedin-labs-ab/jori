import { type Editor } from "@tiptap/react"
import { describe, expect, test, vi } from "vitest"
import {
  automationSurfaceNodeName,
  createAutomationInstructionDocument,
} from "./document"
import { insertSurfaceSuggestion } from "./input"
import { type InstructionSuggestionState } from "./suggest"

describe("automation instructions input", () => {
  test("inserts duplicate suggestions with existing provider tools", () => {
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
          description: "Read GitHub.",
          surfaces: [
            { provider: "github", tools: ["github_add_issue_comment"] },
          ],
        }),
      state: {
        doc: {
          content: { size: 0 },
          textBetween: () => "",
        },
      },
    } as unknown as Editor
    const setSuggestion = vi.fn()

    insertSurfaceSuggestion({
      editor,
      permissions: [],
      provider: "github",
      setSuggestion,
      state: {
        activeIndex: 0,
        range: { from: 0, to: 0 },
        style: {},
        suggestions: [{ label: "GitHub", provider: "github" }],
      } satisfies InstructionSuggestionState,
    })

    expect(insertedContent).toEqual([
      {
        attrs: {
          provider: "github",
          tools: ["github_add_issue_comment"],
        },
        type: automationSurfaceNodeName,
      },
      { text: " ", type: "text" },
    ])
    expect(setSuggestion).toHaveBeenLastCalledWith(null)
  })
})

type EditorChain = {
  focus: () => EditorChain
  insertContentAt: (range: unknown, content: unknown) => EditorChain
  run: () => boolean
}
