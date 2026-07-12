import { type JSONContent } from "@tiptap/core"
import { MarkdownManager } from "@tiptap/markdown"
import {
  createInstructionMarkdownExtensions,
  instructionMarkdownOptions,
} from "./extensions"
import { createInstructionMarked } from "./literal"
import { prepareInstructionSerialization } from "./prepare"

const markdown = new MarkdownManager({
  extensions: createInstructionMarkdownExtensions(),
  marked: createInstructionMarked(),
  markedOptions: instructionMarkdownOptions,
})

export function parseInstructionMarkdown(value: string) {
  return markdown.parse(value)
}

export function serializeInstructionMarkdown(document: JSONContent) {
  const prepared = prepareInstructionSerialization(document)
  const value = markdown.serialize(prepared.document)

  return value.replace(
    /\uE000\d+:\d+\uE001/g,
    (placeholder) => prepared.references.get(placeholder) ?? placeholder
  )
}
