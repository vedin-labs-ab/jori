import {
  type NodeViewProps,
  NodeViewWrapper,
  useEditorState,
} from "@tiptap/react"
import { useState } from "react"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"
import {
  type AutomationSurfaceFormValue,
  getAutomationSurfaceAccess,
  getAutomationSurfaceAccessLabel,
  getAutomationSurfaceLabel,
  getAutomationSurfaceScopeIssue,
  isAutomationSurfaceIntegration,
} from "../../../access"
import {
  type AutomationPolicyPermissions,
  isAutomationSurfacePolicyBlocked,
} from "../../../access/policy"
import { parseAutomationSurfaceTools } from "../document"
import { type AutomationSurfaceExtensionOptions } from "../editor/extension"
import { AutomationSurfaceRemoveButton } from "./remove"
import {
  getAutomationSurfaceAccessIcon,
  getAutomationSurfaceToneClassNames,
} from "./tone"
import { AutomationSurfaceToolsDialog } from "./tools"
import { setIntegrationTools } from "./update"

export function AutomationSurfaceNodeView(props: NodeViewProps) {
  const integration = isAutomationSurfaceIntegration(
    props.node.attrs.integration
  )
    ? props.node.attrs.integration
    : null

  if (integration === null) {
    return null
  }

  return <AutomationSurfaceNodeContent {...props} integration={integration} />
}

function AutomationSurfaceNodeContent({
  deleteNode,
  editor,
  extension,
  node,
  integration,
  selected,
}: NodeViewProps & { integration: AutomationSurfaceFormValue["integration"] }) {
  const [isToolDialogOpen, setIsToolDialogOpen] = useState(false)
  const tools = parseAutomationSurfaceTools(node.attrs.tools)
  const permissions = getNodeViewPermissions(extension)
  const surface = { integration, tools }
  const scope = useEditorState({
    editor,
    selector: () => getNodeViewOptions(extension).getScope(),
  })
  const scopeIssue = getAutomationSurfaceScopeIssue(scope, integration)
  const policyBlocked = isAutomationSurfacePolicyBlocked({
    permissions,
    surface,
  })
  const blocked = scopeIssue !== undefined || policyBlocked
  const access = getAutomationSurfaceAccess(surface, permissions)
  const toolSurfaceLabel = getAutomationSurfaceLabel(integration)

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
      data-automation-surface-view=""
    >
      <AutomationSurfaceMarker
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
      <AutomationSurfaceToolsDialog
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
        tenantId={getNodeViewOptions(extension).getTenantId()}
        toolSurfaceLabel={toolSurfaceLabel}
        tools={tools}
      />
    </NodeViewWrapper>
  )
}

function AutomationSurfaceMarker({
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
  access: ReturnType<typeof getAutomationSurfaceAccess>
  blocked: boolean
  count: number
  onOpenTools: () => void
  onRemove: () => void
  integration: AutomationSurfaceFormValue["integration"]
  issue: string | undefined
  policyBlocked: boolean
  toolSurfaceLabel: string
  selected: boolean
}) {
  const toneClassNames = getAutomationSurfaceToneClassNames(access, blocked)

  return (
    <ButtonGroup
      aria-label={`${toolSurfaceLabel} integration tools${issue === undefined ? "" : `: ${issue}`}`}
      className={cn(
        "mx-0.5 inline-flex h-5 overflow-hidden rounded-sm border align-middle text-[0.625rem]/none shadow-none",
        toneClassNames.surface,
        selected && "ring-2 ring-ring/40"
      )}
      data-automation-surface-access={access === "" ? "unset" : access}
      data-automation-surface-policy={policyBlocked ? "blocked" : "allowed"}
      data-automation-surface-scope={
        issue === undefined ? "allowed" : "blocked"
      }
    >
      <AutomationSurfaceRemoveButton
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
        data-automation-surface-separator=""
      />
      <AutomationSurfaceToolsButton
        access={access}
        accessLabel={getAutomationSurfaceAccessLabel(access)}
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

function getNodeViewPermissions(
  extension: NodeViewProps["extension"]
): AutomationPolicyPermissions {
  return (
    extension.options as Partial<AutomationSurfaceExtensionOptions>
  ).getPermissions?.()
}

function getNodeViewOptions(extension: NodeViewProps["extension"]) {
  return extension.options as AutomationSurfaceExtensionOptions
}

function AutomationSurfaceToolsButton({
  access,
  accessLabel,
  blocked,
  count,
  iconClassName,
  issue,
  onOpen,
  toolSurfaceLabel,
}: {
  access: ReturnType<typeof getAutomationSurfaceAccess>
  accessLabel: string
  blocked: boolean
  count: number
  iconClassName: string
  issue: string | undefined
  onOpen: () => void
  toolSurfaceLabel: string
}) {
  const Icon = getAutomationSurfaceAccessIcon(access, blocked)
  const toolCountLabel = count === 0 ? "No tools enabled" : `${count} enabled`
  const label = blocked
    ? `${toolSurfaceLabel} tools: ${toolCountLabel}, some unavailable. Configure tools.`
    : `${toolSurfaceLabel} tools: ${toolCountLabel}. Configure tools.`

  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 self-stretch px-1 font-medium opacity-70 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30",
        iconClassName
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpen()
      }}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      title={
        issue ??
        (count === 0 ? accessLabel : `${accessLabel}: ${count} enabled`)
      }
      type="button"
    >
      <Icon className="size-3" />
      {count > 0 ? <span className="tabular-nums">{count}</span> : null}
    </button>
  )
}
