import { type Editor, InputRule, textblockTypeInputRule } from "@tiptap/core"
import { type Attrs, Fragment, type NodeType } from "@tiptap/pm/model"
import { Selection, TextSelection } from "@tiptap/pm/state"

const fenceMarkers = ["`", "~"] as const

export function createFenceInputRules({
  getAttributes,
  language,
  type,
}: {
  getAttributes?: (match: RegExpMatchArray) => Attrs
  language: string
  type: NodeType
}) {
  return fenceMarkers.flatMap((marker) => [
    softBreakFenceInputRule({
      find: fenceInputExpression(marker, language, "(?<=\\n)"),
      getAttributes,
      type,
    }),
    textblockTypeInputRule({
      find: fenceInputExpression(marker, language, "^"),
      getAttributes,
      type,
    }),
  ])
}

export function createCodeBlockShortcuts(editor: Editor, nodeName: string) {
  return {
    ArrowDown: () => exitCodeOnArrowDown(editor, nodeName),
    Enter: () => exitCodeOnTripleEnter(editor, nodeName),
    "Mod-Enter": () => editor.commands.exitCode(),
  }
}

function softBreakFenceInputRule({
  find,
  getAttributes,
  type,
}: {
  find: RegExp
  getAttributes?: (match: RegExpMatchArray) => Attrs
  type: NodeType
}) {
  return new InputRule({
    find,
    handler: ({ match, range, state }) => {
      const { $from } = state.selection
      // Match only text, then remove the preceding hard break explicitly.
      // Tiptap rejects input-rule matches that span leaf nodes.
      const offset = range.from - $from.start() - 1

      if (
        !$from.parent.isTextblock ||
        offset < 0 ||
        $from.parent.nodeAt(offset)?.type.name !== "hardBreak"
      ) {
        return null
      }

      const leading = $from.parent.type.create(
        $from.parent.attrs,
        $from.parent.content.cut(0, offset),
        $from.parent.marks
      )
      const block = type.create(getAttributes?.(match))
      const replacement = Fragment.fromArray([leading, block])
      const container = $from.node(-1)

      if (
        !container.canReplace(
          $from.index(-1),
          $from.indexAfter(-1),
          replacement
        )
      ) {
        return null
      }

      const from = $from.before()
      const transaction = state.tr
      transaction
        .replaceWith(from, $from.after(), replacement)
        .setSelection(
          TextSelection.create(transaction.doc, from + leading.nodeSize + 1)
        )
    },
  })
}

function fenceInputExpression(
  marker: "`" | "~",
  language: string,
  lineStart: "^" | "(?<=\\n)"
) {
  return new RegExp(`${lineStart} {0,3}${marker}{3,}${language}[ \\t\\n]$`, "i")
}

function exitCodeOnArrowDown(editor: Editor, nodeName: string) {
  const { $from, empty } = editor.state.selection

  if (
    !empty ||
    $from.parent.type.name !== nodeName ||
    $from.parentOffset !== $from.parent.content.size
  ) {
    return false
  }

  const after = $from.after()
  const nodeAfter = editor.state.doc.nodeAt(after)

  if (nodeAfter === null) {
    return editor.commands.exitCode()
  }

  return editor.commands.command(({ tr }) => {
    tr.setSelection(Selection.near(tr.doc.resolve(after)))
    return true
  })
}

function exitCodeOnTripleEnter(editor: Editor, nodeName: string) {
  const { $from, empty } = editor.state.selection

  if (
    !empty ||
    $from.parent.type.name !== nodeName ||
    $from.parentOffset !== $from.parent.content.size ||
    !$from.parent.textContent.endsWith("\n\n")
  ) {
    return false
  }

  return editor
    .chain()
    .command(({ tr }) => {
      tr.delete($from.pos - 2, $from.pos)
      return true
    })
    .exitCode()
    .run()
}
