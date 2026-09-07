import { Fragment, type Node as ProseMirrorNode, Slice } from "@tiptap/pm/model"
import { type Editor } from "@tiptap/react"
import { type MentionCatalog } from "../../mentions/scan"
import { toProseMirrorNode } from "../../mentions/suggest/insert"
import { parseComposerLine } from "./codec"

/** Pasting puts the clipboard's plain text in: its lines as line breaks,
 *  and any mention token in it as the chip it stands for, so a message
 *  copied from the thread pastes back as it was written. Anything else
 *  the clipboard holds — markup, files — is left alone. */
export function insertPastedText(
  view: Editor["view"],
  event: ClipboardEvent,
  catalog: MentionCatalog
) {
  const text = event.clipboardData?.getData("text/plain") ?? ""

  if (text === "") {
    return false
  }

  const { schema } = view.state
  const marks = view.state.selection.$from.marks()
  const nodes: ProseMirrorNode[] = []

  for (const [index, line] of text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .entries()) {
    if (index > 0) {
      nodes.push(schema.nodes.hardBreak.create())
    }

    for (const node of parseComposerLine(line, catalog)) {
      nodes.push(toProseMirrorNode(node, schema, marks))
    }
  }

  view.dispatch(
    view.state.tr
      .replaceSelection(new Slice(Fragment.fromArray(nodes), 0, 0))
      .scrollIntoView()
  )

  return true
}
