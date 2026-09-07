import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react"
import { readMentionAttributes } from "../../mentions/node"
import { ChatMentionChip } from "../mentions"
import { type ComposerMentionOptions } from "./extensions"

/** A mention in the composer: the chat's chip, removable. */
export function ComposerMentionView({
  deleteNode,
  extension,
  node,
  selected,
}: NodeViewProps) {
  const mention = readMentionAttributes(node.attrs)

  if (mention === null) {
    return null
  }

  const options = extension.options as ComposerMentionOptions

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
    >
      <ChatMentionChip
        id={mention.id}
        kind={mention.kind}
        onRemove={deleteNode}
        resolve={options.getResolve()}
        selected={selected}
      />
    </NodeViewWrapper>
  )
}
