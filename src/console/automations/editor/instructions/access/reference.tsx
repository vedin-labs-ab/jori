import {
  type NodeViewProps,
  NodeViewWrapper,
  useEditorState,
} from "@tiptap/react"
import { BookOpen, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { automationToolReferenceIssue } from "../../../access/tools"
import { parseAutomationReferenceKind } from "../document"
import { readInstructionSurfaces } from "../markdown/references"
import { type AutomationReferenceNodeOptions } from "../markdown/schema"
import { AutomationMarkerRemoveButton } from "./remove"
import { automationReferenceToneClassNames } from "./tone"

export function AutomationReferenceNodeView({
  deleteNode,
  editor,
  extension,
  node,
  selected,
}: NodeViewProps) {
  const kind = parseAutomationReferenceKind(node.attrs.kind)
  const id = typeof node.attrs.id === "string" ? node.attrs.id : null
  const accessState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      surfaces: readInstructionSurfaces(currentEditor.getJSON()),
      webSearch: referenceOptions(extension).getWebSearch(),
    }),
  })

  if (kind === null || id === null) {
    return null
  }

  const Icon = kind === "skill" ? BookOpen : Wrench
  const tone = automationReferenceToneClassNames[kind]
  const issue =
    kind === "tool"
      ? automationToolReferenceIssue({
          permissions: referenceOptions(extension).getPermissions(),
          scope: referenceOptions(extension).getScope(),
          surfaces: accessState.surfaces,
          tool: id,
          webSearch: accessState.webSearch,
        })
      : undefined

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
          issue !== undefined &&
            "border-destructive/60 bg-destructive/5 text-destructive",
          selected && "ring-2 ring-ring/40"
        )}
        data-automation-reference-access={
          issue === undefined ? "ready" : "unresolved"
        }
        data-automation-reference-kind={kind}
        title={issue}
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

function referenceOptions(extension: NodeViewProps["extension"]) {
  return extension.options as AutomationReferenceNodeOptions
}
