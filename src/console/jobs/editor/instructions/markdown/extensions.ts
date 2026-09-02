import StarterKit from "@tiptap/starter-kit"
import {
  FencedText,
  SafeCodeBlock,
  SafeInlineCode,
  SerializedCodeSpan,
} from "./fence"
import {
  LiteralBlockHtml,
  LiteralMarkdown,
  LiteralMarkdownImage,
} from "./literal"
import { SafeParagraph } from "./paragraph"
import { fencedTextNodeName } from "./schema"

export const instructionMarkdownOptions = { gfm: false } as const

export function createInstructionMarkdownExtensions() {
  return [
    LiteralMarkdown,
    LiteralBlockHtml,
    LiteralMarkdownImage,
    FencedText,
    SafeCodeBlock,
    SafeInlineCode,
    SerializedCodeSpan,
    SafeParagraph,
    StarterKit.configure({
      code: false,
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
      link: { autolink: false, linkOnPaste: false, openOnClick: false },
      paragraph: false,
      strike: false,
      trailingNode: { notAfter: ["codeBlock", fencedTextNodeName] },
      underline: false,
    }),
  ]
}
