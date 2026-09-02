import {
  type NodeViewProps,
  NodeViewWrapper,
  useEditorState,
} from "@tiptap/react"
import { Ban, BookOpen, Braces, Wrench } from "lucide-react"
import { useContext, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { useRetained } from "@/shared/console/retain"
import { type ToolPermission } from "@/shared/console/tools/model"
import { jobToolReferenceIssue, jobToolScopeIssue } from "../../../access/tools"
import { parseJobReferenceKind } from "../document"
import { readEditorInstructionSurfaces } from "../editor/snapshot"
import { type JobReferenceNodeOptions } from "../markdown/schema"
import { JobMarkerActionButton, JobMarkerRemoveButton } from "./remove"
import { ToolReferencesLoader, ToolSchemaDialog } from "./schema"
import { jobReferenceToneClassNames } from "./tone"
import {
  ToolReferenceContext,
  type ToolReferences,
  toolReferenceReady,
} from "./wire"

export function JobReferenceNodeView({
  deleteNode,
  editor,
  extension,
  node,
  selected,
}: NodeViewProps) {
  const kind = parseJobReferenceKind(node.attrs.kind)
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
      data-job-reference-view=""
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
  const tone = jobReferenceToneClassNames[kind]
  const Icon = kind === "skill" ? BookOpen : issue === undefined ? Wrench : Ban
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
      data-job-reference-access={issue === undefined ? "ready" : "unresolved"}
      data-job-reference-kind={kind}
      data-job-reference-scope={
        scopeIssue === undefined ? "allowed" : "blocked"
      }
      title={issue}
    >
      <JobMarkerRemoveButton
        icon={
          <Icon
            aria-hidden="true"
            className={cn(
              "size-3",
              issue === undefined ? tone.icon : "text-destructive"
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
        />
      )}
    </span>
  )
}

/** The pill's right pane: a schema segment opening the tool's request and
 *  response schemas, mirroring the access pill's tools segment. Hovering
 *  warms the schema subscription so the dialog usually opens resolved; a
 *  click that beats the data spins in the braces slot until it lands. */
function ToolSchemaPane({
  permission,
  separatorClassName,
}: {
  permission: ToolPermission
  separatorClassName: string
}) {
  const hasHost = useContext(ToolReferenceContext) !== undefined
  const [shown, setShown] = useState<ToolPermission>()
  const [warm, setWarm] = useState(false)
  const [references, setReferences] = useState<ToolReferences>()
  const engaged = useRetained(shown) !== undefined || warm
  const pending =
    shown !== undefined && !toolReferenceReady(references, shown.tool)

  if (!hasHost) {
    return null
  }

  return (
    <>
      <span
        aria-hidden="true"
        className={cn("w-[0.5px] shrink-0 self-stretch", separatorClassName)}
      />
      <JobMarkerActionButton
        ariaLabel={`View the ${permission.label} schema`}
        onOpen={() => setShown(permission)}
        onWarm={() => setWarm(true)}
        title="Request and response schema"
      >
        {pending ? (
          <Spinner className="size-3" />
        ) : (
          <Braces className="size-3 opacity-80" />
        )}
      </JobMarkerActionButton>
      {engaged ? (
        <ToolReferencesLoader
          onChange={setReferences}
          tools={[permission.tool]}
        />
      ) : null}
      <ToolSchemaDialog
        onOpenChange={(open) => {
          if (!open) {
            setShown(undefined)
          }
        }}
        permission={shown}
        references={references}
      />
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
  kind: ReturnType<typeof parseJobReferenceKind>
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
    issue: jobToolReferenceIssue({
      permissions: options.getPermissions(),
      scope: state.scope,
      surfaces: state.surfaces,
      tool: id,
      webSearch: state.webSearch,
    }),
    scopeIssue: jobToolScopeIssue({
      permissions: options.getPermissions(),
      scope: state.scope,
      tool: id,
    }),
  }
}

function referenceOptions(extension: NodeViewProps["extension"]) {
  return extension.options as JobReferenceNodeOptions
}
