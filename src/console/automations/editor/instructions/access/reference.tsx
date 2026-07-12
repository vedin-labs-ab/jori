import {
  type NodeViewProps,
  NodeViewWrapper,
  useEditorState,
} from "@tiptap/react"
import { Ban, BookOpen, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  automationToolReferenceIssue,
  automationToolScopeIssue,
} from "../../../access/tools"
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
  const { issue, scopeIssue } = useReferenceAccess({
    editor,
    extension,
    id,
    kind,
  })

  if (kind === null || id === null) {
    return null
  }

  const tone = automationReferenceToneClassNames[kind]
  const Icon =
    kind === "skill" ? BookOpen : scopeIssue === undefined ? Wrench : Ban

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
        data-automation-reference-scope={
          scopeIssue === undefined ? "allowed" : "blocked"
        }
        title={issue}
      >
        <AutomationMarkerRemoveButton
          icon={
            <Icon
              aria-hidden="true"
              className={cn(
                "size-3",
                scopeIssue === undefined ? tone.icon : "text-destructive"
              )}
            />
          }
          label={id}
          onRemove={deleteNode}
        />
      </span>
    </NodeViewWrapper>
  )
}

function useReferenceAccess({
  editor,
  extension,
  id,
  kind,
}: Pick<NodeViewProps, "editor" | "extension"> & {
  id: string | null
  kind: ReturnType<typeof parseAutomationReferenceKind>
}) {
  const options = referenceOptions(extension)
  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      scope: options.getScope(),
      surfaces: readInstructionSurfaces(currentEditor.getJSON()),
      webSearch: options.getWebSearch(),
    }),
  })

  if (kind !== "tool" || id === null) {
    return { issue: undefined, scopeIssue: undefined }
  }

  return {
    issue: automationToolReferenceIssue({
      permissions: options.getPermissions(),
      scope: state.scope,
      surfaces: state.surfaces,
      tool: id,
      webSearch: state.webSearch,
    }),
    scopeIssue: automationToolScopeIssue({
      permissions: options.getPermissions(),
      scope: state.scope,
      tool: id,
    }),
  }
}

function referenceOptions(extension: NodeViewProps["extension"]) {
  return extension.options as AutomationReferenceNodeOptions
}
