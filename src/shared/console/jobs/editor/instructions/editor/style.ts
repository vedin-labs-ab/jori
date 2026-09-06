import { markdownProseClassName } from "@/shared/console/markdown/style"

/** The editor's frame around the shared prose scale: the content's own
 *  box, and the two instruction-only blocks — a plain-text fence and a
 *  literal markdown run — that the brief renders and a chat never does.
 *  The scale itself rides on the content element; see props.ts and the
 *  read-only brief. */
export const instructionMarkdownClassName = [
  "[&_.tiptap]:min-h-24 [&_.tiptap]:min-w-0 [&_.tiptap]:max-w-full [&_.tiptap]:overflow-x-hidden [&_.tiptap]:px-2 [&_.tiptap]:py-2 [&_.tiptap]:break-words [&_.tiptap]:whitespace-pre-wrap [&_.tiptap]:leading-6 [&_.tiptap]:outline-none [&_.tiptap]:[overflow-wrap:anywhere]",
  "[&_.tiptap_pre[data-instruction-text]]:overflow-x-hidden [&_.tiptap_pre[data-instruction-text]]:break-words [&_.tiptap_pre[data-instruction-text]]:whitespace-pre-wrap [&_.tiptap_pre[data-instruction-text]]:[overflow-wrap:anywhere]",
  "[&_.tiptap_[data-markdown-literal]]:font-mono [&_.tiptap_[data-markdown-literal]]:text-muted-foreground",
].join(" ")

/** What the editor's content element and the read-only brief both carry:
 *  TipTap's class, which the frame above addresses, and the prose scale. */
export const instructionContentClassName = `tiptap ${markdownProseClassName}`
