import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react"
import { BookOpen, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { automationMentionText } from "../../../access"
import { parseAutomationReferenceKind } from "../document"

const referenceTones = {
  skill: "border-informational/40 bg-informational/10 text-informational",
  tool: "border-border bg-muted text-muted-foreground",
} as const

export function AutomationReferenceNodeView({ node, selected }: NodeViewProps) {
  const kind = parseAutomationReferenceKind(node.attrs.kind)
  const id = typeof node.attrs.id === "string" ? node.attrs.id : null

  if (kind === null || id === null) {
    return null
  }

  const Icon = kind === "skill" ? BookOpen : Wrench

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
      data-automation-reference-view=""
    >
      <span
        className={cn(
          "mx-0.5 inline-flex h-5 items-center gap-1 rounded-sm border px-1 align-middle font-medium text-[0.625rem]/none",
          referenceTones[kind],
          selected && "ring-2 ring-ring/40"
        )}
        data-automation-reference-kind={kind}
      >
        <Icon aria-hidden="true" className="size-3 opacity-70" />
        {automationMentionText(kind, id)}
      </span>
    </NodeViewWrapper>
  )
}
