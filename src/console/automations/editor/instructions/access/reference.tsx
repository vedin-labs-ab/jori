import {
  type NodeViewProps,
  NodeViewWrapper,
  useEditorState,
} from "@tiptap/react"
import { Ban, BookOpen, Braces, Wrench } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { type ToolPermission } from "../../../../permissions/types"
import { useRetained } from "../../../../shared/retain"
import {
  automationToolReferenceIssue,
  automationToolScopeIssue,
} from "../../../access/tools"
import { parseAutomationReferenceKind } from "../document"
import { readEditorInstructionSurfaces } from "../editor/snapshot"
import { type AutomationReferenceNodeOptions } from "../markdown/schema"
import {
  AutomationMarkerActionButton,
  AutomationMarkerRemoveButton,
} from "./remove"
import { ToolSchemaDialog } from "./schema"
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

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
      data-automation-reference-view=""
    >
      <ReferencePill
        extension={extension}
        id={id}
        issue={issue}
        kind={kind}
        onRemove={deleteNode}
        scopeIssue={scopeIssue}
        selected={selected}
      />
    </NodeViewWrapper>
  )
}

function ReferencePill({
  extension,
  id,
  issue,
  kind,
  onRemove,
  scopeIssue,
  selected,
}: {
  extension: NodeViewProps["extension"]
  id: string
  issue: string | undefined
  kind: "skill" | "tool"
  onRemove: () => void
  scopeIssue: string | undefined
  selected: boolean
}) {
  const tone = automationReferenceToneClassNames[kind]
  const Icon =
    kind === "skill" ? BookOpen : scopeIssue === undefined ? Wrench : Ban
  const permission =
    kind === "tool"
      ? referenceOptions(extension)
          .getPermissions()
          ?.find((candidate) => candidate.tool === id)
      : undefined

  return (
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
        onRemove={onRemove}
      />
      {permission === undefined ? null : (
        <ToolSchemaPane
          permission={permission}
          separatorClassName={tone.separator}
          tenantId={referenceOptions(extension).getTenantId()}
        />
      )}
    </span>
  )
}

/** The pill's right pane: a schema segment opening the tool's request and
 *  response schemas, mirroring the access pill's tools segment. */
function ToolSchemaPane({
  permission,
  separatorClassName,
  tenantId,
}: {
  permission: ToolPermission
  separatorClassName: string
  tenantId: string
}) {
  const [shown, setShown] = useState<ToolPermission>()
  // Mounted on first use, so nothing subscribes until someone asks.
  const hasOpened = useRetained(shown) !== undefined

  return (
    <>
      <span
        aria-hidden="true"
        className={cn("w-[0.5px] shrink-0 self-stretch", separatorClassName)}
      />
      <AutomationMarkerActionButton
        ariaLabel={`View the ${permission.label} schema`}
        onOpen={() => setShown(permission)}
        title="Request and response schema"
      >
        <Braces className="size-3 opacity-80" />
      </AutomationMarkerActionButton>
      {hasOpened ? (
        <ToolSchemaDialog
          onOpenChange={(open) => {
            if (!open) {
              setShown(undefined)
            }
          }}
          permission={shown}
          tenantId={tenantId}
        />
      ) : null}
    </>
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
      surfaces: readEditorInstructionSurfaces(currentEditor),
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
