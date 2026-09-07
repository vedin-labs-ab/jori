import { type JSONContent } from "@tiptap/core"
import { Fragment, type Mark, type Schema } from "@tiptap/pm/model"
import { type Transaction } from "@tiptap/pm/state"
import { type Editor } from "@tiptap/react"
import { type MentionAttributes, mentionNodeName } from "../node"
import { isMentionNameCharacter } from "../scan"

/** A mention as a document node, under the marks the text around it
 *  carries. */
export function mentionNodeContent(
  mention: MentionAttributes,
  marks: JSONContent["marks"]
): JSONContent {
  return {
    attrs: { id: mention.id, kind: mention.kind },
    marks,
    type: mentionNodeName,
  }
}

/** Puts a mention in place of the token being typed, followed by a space
 *  unless one is already there, and leaves the cursor after it. What an
 *  editor changes alongside — a job adding access — goes into the same
 *  transaction through `prepare`, so one undo takes both back. */
export function insertMentionContent(
  editor: Editor,
  range: { from: number; to: number },
  content: JSONContent[],
  prepare?: (transaction: Transaction) => void
) {
  const marks = activeMarks(editor)
  const inserted = content.map((node) => ({ ...node, marks }))

  if (shouldInsertTrailingSpace(editor, range.to)) {
    inserted.push({ marks, text: " ", type: "text" })
  }

  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      prepare?.(tr)
      return true
    })
    .insertContentAt(range, inserted)
    .run()
}

/** The marks at the selection, as content takes them; none is nothing. */
function activeMarks(editor: Editor) {
  const marks = editor.state.selection.$from
    .marks()
    .map((mark) => mark.toJSON())

  return marks.length === 0 ? undefined : marks
}

/** The text of the block before the cursor, with atoms as object
 *  replacement characters so offsets stay true. */
export function textBeforeCursor(view: Editor["view"]) {
  return view.state.selection.$from.parent.textBetween(
    0,
    view.state.selection.$from.parentOffset,
    "\n",
    "￼"
  )
}

/** Swaps the typed token for nodes and puts the boundary character that
 *  finished it after them, in one transaction. */
export function replaceTypedMention({
  content,
  from,
  start,
  text,
  view,
}: {
  content: JSONContent[]
  from: number
  start: number
  text: string
  view: Editor["view"]
}) {
  const marks = view.state.storedMarks ?? view.state.selection.$from.marks()
  const nodes = content.map((node) =>
    toProseMirrorNode(node, view.state.schema, marks)
  )
  const transaction = view.state.tr

  transaction.replaceWith(start, from, Fragment.fromArray(nodes))
  transaction.insertText(
    text,
    start + nodes.reduce((size, node) => size + node.nodeSize, 0)
  )

  return transaction
}

export function toProseMirrorNode(
  node: JSONContent,
  schema: Schema,
  marks: readonly Mark[]
) {
  if (node.type === "text") {
    return schema.text(node.text ?? "", marks)
  }

  const nodeType = schema.nodes[node.type ?? ""]

  if (nodeType === undefined) {
    throw new Error(`Unknown mention node: ${node.type}`)
  }

  return nodeType.create(node.attrs, undefined, marks)
}

function shouldInsertTrailingSpace(editor: Editor, position: number) {
  const nextCharacter = editor.state.doc.textBetween(
    position,
    Math.min(position + 1, editor.state.doc.content.size),
    "\n",
    "￼"
  )

  return nextCharacter === "" || isMentionNameCharacter(nextCharacter)
}
