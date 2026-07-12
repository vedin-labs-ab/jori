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
  let value = markdown.serialize(prepared.document)

  for (const [placeholder, reference] of prepared.references) {
    value = value.replaceAll(placeholder, reference)
  }

  return value
}
