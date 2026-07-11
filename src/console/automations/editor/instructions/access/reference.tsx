import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react"
import { BookOpen, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseAutomationReferenceKind } from "../document"
import { AutomationMarkerRemoveButton } from "./remove"
import { automationReferenceToneClassNames } from "./tone"

export function AutomationReferenceNodeView({
  deleteNode,
  node,
  selected,
}: NodeViewProps) {
  const kind = parseAutomationReferenceKind(node.attrs.kind)
  const id = typeof node.attrs.id === "string" ? node.attrs.id : null

  if (kind === null || id === null) {
    return null
  }

  const Icon = kind === "skill" ? BookOpen : Wrench
  const tone = automationReferenceToneClassNames[kind]

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
      data-automation-reference-view=""
    >
      <span
        className={cn(
          "mx-0.5 inline-flex h-5 items-center overflow-hidden rounded-sm border align-middle text-[0.625rem]/none",
          tone.surface,
          selected && "ring-2 ring-ring/40"
        )}
        data-automation-reference-kind={kind}
      >
        <AutomationMarkerRemoveButton
          icon={<Icon aria-hidden="true" className={cn("size-3", tone.icon)} />}
          label={id}
          onRemove={deleteNode}
        />
      </span>
    </NodeViewWrapper>
  )
}
