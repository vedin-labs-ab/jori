import {
  type NodeViewProps,
  NodeViewWrapper,
  useEditorState,
} from "@tiptap/react"
import { useState } from "react"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"
import {
  getJobSurfaceAccess,
  getJobSurfaceAccessLabel,
  getJobSurfaceLabel,
  getJobSurfaceScopeIssue,
  isJobSurfaceIntegration,
  type JobSurfaceFormValue,
} from "@/shared/console/jobs/access"
import { isJobSurfacePolicyBlocked } from "@/shared/console/jobs/access/policy"
import { parseJobSurfaceTools } from "../document"
import { type JobSurfaceNodeOptions } from "../markdown/schema"
import { JobMarkerActionButton, JobSurfaceRemoveButton } from "./remove"
import { getJobSurfaceAccessIcon, getJobSurfaceToneClassNames } from "./tone"
import { JobSurfaceToolsDialog } from "./tools"
import { setIntegrationTools } from "./update"

export function JobSurfaceNodeView(props: NodeViewProps) {
  const integration = isJobSurfaceIntegration(props.node.attrs.integration)
    ? props.node.attrs.integration
    : null

  if (integration === null) {
    return null
  }

  return <JobSurfaceNodeContent {...props} integration={integration} />
}

function JobSurfaceNodeContent({
  deleteNode,
  editor,
  extension,
  node,
  integration,
  selected,
}: NodeViewProps & { integration: JobSurfaceFormValue["integration"] }) {
  const [isToolDialogOpen, setIsToolDialogOpen] = useState(false)
  const tools = parseJobSurfaceTools(node.attrs.tools)
  const permissions = getNodeViewOptions(extension).getPermissions()
  const surface = { integration, tools }
  const scope = useEditorState({
    editor,
    selector: () => getNodeViewOptions(extension).getScope(),
  })
  const scopeIssue = getJobSurfaceScopeIssue(scope, integration)
  const policyBlocked = isJobSurfacePolicyBlocked({
    permissions,
    surface,
  })
  const blocked = scopeIssue !== undefined || policyBlocked
  const access = getJobSurfaceAccess(surface, permissions)
  const toolSurfaceLabel = getJobSurfaceLabel(integration)

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
      data-job-surface-view=""
    >
      <JobSurfaceMarker
        access={access}
        blocked={blocked}
        count={tools.length}
        onOpenTools={() => setIsToolDialogOpen(true)}
        onRemove={deleteNode}
        integration={integration}
        issue={scopeIssue}
        policyBlocked={policyBlocked}
        toolSurfaceLabel={toolSurfaceLabel}
        selected={selected}
      />
      <JobSurfaceToolsDialog
        onOpenChange={setIsToolDialogOpen}
        onToolsChange={(nextTools) =>
          setIntegrationTools({
            editor,
            integration,
            tools: nextTools,
          })
        }
        open={isToolDialogOpen}
        permissions={permissions}
        integration={integration}
        organizationId={getNodeViewOptions(extension).getOrganizationId()}
        toolSurfaceLabel={toolSurfaceLabel}
        tools={tools}
      />
    </NodeViewWrapper>
  )
}

function JobSurfaceMarker({
  access,
  blocked,
  count,
  onOpenTools,
  onRemove,
  integration,
  issue,
  policyBlocked,
  toolSurfaceLabel,
  selected,
}: {
  access: ReturnType<typeof getJobSurfaceAccess>
  blocked: boolean
  count: number
  onOpenTools: () => void
  onRemove: () => void
  integration: JobSurfaceFormValue["integration"]
  issue: string | undefined
  policyBlocked: boolean
  toolSurfaceLabel: string
  selected: boolean
}) {
  const toneClassNames = getJobSurfaceToneClassNames(access, blocked)

  return (
    <ButtonGroup
      aria-label={`${toolSurfaceLabel} integration tools${issue === undefined ? "" : `: ${issue}`}`}
      className={cn(
        "mx-0.5 inline-flex h-5 overflow-hidden rounded-sm border align-middle text-[0.625rem]/none shadow-none",
        toneClassNames.surface,
        selected && "ring-2 ring-ring/40"
      )}
      data-job-surface-access={access === "" ? "unset" : access}
      data-job-surface-policy={policyBlocked ? "blocked" : "allowed"}
      data-job-surface-scope={issue === undefined ? "allowed" : "blocked"}
    >
      <JobSurfaceRemoveButton
        onRemove={onRemove}
        integration={integration}
        toolSurfaceLabel={toolSurfaceLabel}
      />
      <span
        aria-hidden="true"
        className={cn(
          "w-[0.5px] shrink-0 self-stretch rounded-none",
          toneClassNames.separator
        )}
        data-job-surface-separator=""
      />
      <JobSurfaceToolsButton
        access={access}
        accessLabel={getJobSurfaceAccessLabel(access)}
        blocked={blocked}
        count={count}
        iconClassName={toneClassNames.scopeIcon}
        issue={issue}
        onOpen={onOpenTools}
        toolSurfaceLabel={toolSurfaceLabel}
      />
    </ButtonGroup>
  )
}

function getNodeViewOptions(extension: NodeViewProps["extension"]) {
  return extension.options as JobSurfaceNodeOptions
}

function JobSurfaceToolsButton({
  access,
  accessLabel,
  blocked,
  count,
  iconClassName,
  issue,
  onOpen,
  toolSurfaceLabel,
}: {
  access: ReturnType<typeof getJobSurfaceAccess>
  accessLabel: string
  blocked: boolean
  count: number
  iconClassName: string
  issue: string | undefined
  onOpen: () => void
  toolSurfaceLabel: string
}) {
  const Icon = getJobSurfaceAccessIcon(access, blocked)
  const toolCountLabel = count === 0 ? "No tools enabled" : `${count} enabled`
  const label = blocked
    ? `${toolSurfaceLabel} tools: ${toolCountLabel}, some unavailable. Configure tools.`
    : `${toolSurfaceLabel} tools: ${toolCountLabel}. Configure tools.`

  return (
    <JobMarkerActionButton
      ariaLabel={label}
      className={iconClassName}
      onOpen={onOpen}
      title={
        issue ??
        (count === 0 ? accessLabel : `${accessLabel}: ${count} enabled`)
      }
    >
      <Icon className="size-3" />
      {count > 0 ? <span className="tabular-nums">{count}</span> : null}
    </JobMarkerActionButton>
  )
}
