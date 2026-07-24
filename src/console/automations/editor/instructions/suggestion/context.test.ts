import { getSchema } from "@tiptap/core"
import { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { describe, expect, test } from "vitest"
import { parseInstructionMarkdown } from "../markdown/codec"
import { createInstructionMarkdownExtensions } from "../markdown/extensions"
import { isReferenceInputAllowed } from "./context"

const schema = getSchema(createInstructionMarkdownExtensions())

describe("instruction reference input context", () => {
  test("suppresses the start of inline code but allows whitespace references", () => {
    const document = instructionDocument("`#share_app` and `Use #share_app`.")

    expect(isReferenceInputAllowed(document.resolve(1), 0)).toBe(false)
    expect(isReferenceInputAllowed(document.resolve(25), 26)).toBe(true)
  })

  test("allows plain fences and suppresses programming fences", () => {
    const plain = instructionDocument("```txt\nUse #share_app\n```")
    const code = instructionDocument("```json\nUse #share_app\n```")

    expect(isReferenceInputAllowed(plain.resolve(2), 4)).toBe(true)
    expect(isReferenceInputAllowed(code.resolve(2), 4)).toBe(false)
  })

  test("suppresses literal HTML source", () => {
    const document = instructionDocument(
      '<span title="#share_app">literal</span>'
    )

    expect(isReferenceInputAllowed(document.resolve(2), 13)).toBe(false)
  })
})

function instructionDocument(markdown: string) {
  return ProseMirrorNode.fromJSON(schema, parseInstructionMarkdown(markdown))
}
