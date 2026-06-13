import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react"
import { useState } from "react"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"
import {
  type AutomationPolicyPermissions,
  isAutomationSurfacePolicyBlocked,
} from "../../policy"
import {
  type AutomationSurfaceFormValue,
  getAutomationSurfaceAccess,
  getAutomationSurfaceAccessLabel,
  getAutomationSurfaceLabel,
  isAutomationSurfaceProvider,
} from "../../surfaces"
import { type AutomationSurfaceExtensionOptions } from "./extension"
import { AutomationSurfaceRemoveButton } from "./remove"
import {
  getAutomationSurfaceAccessIcon,
  getAutomationSurfaceToneClassNames,
} from "./tone"
import { AutomationSurfaceToolsDialog } from "./tools"

export function AutomationSurfaceNodeView(props: NodeViewProps) {
  const provider = isAutomationSurfaceProvider(props.node.attrs.provider)
    ? props.node.attrs.provider
    : null

  if (provider === null) {
    return null
  }

  return <AutomationSurfaceNodeContent {...props} provider={provider} />
}

function AutomationSurfaceNodeContent({
  deleteNode,
  extension,
  node,
  provider,
  selected,
  updateAttributes,
}: NodeViewProps & { provider: AutomationSurfaceFormValue["provider"] }) {
  const [isToolDialogOpen, setIsToolDialogOpen] = useState(false)
  const tools = parseAutomationSurfaceTools(node.attrs.tools)
  const permissions = getNodeViewPermissions(extension)
  const surface = { provider, tools }
  const blocked = isAutomationSurfacePolicyBlocked({ permissions, surface })
  const access = getAutomationSurfaceAccess(surface, permissions)
  const providerLabel = getAutomationSurfaceLabel(provider)

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
        provider={provider}
        providerLabel={providerLabel}
        selected={selected}
      />
      <AutomationSurfaceToolsDialog
        onOpenChange={setIsToolDialogOpen}
        onToolsChange={(nextTools) => updateAttributes({ tools: nextTools })}
        open={isToolDialogOpen}
        permissions={permissions}
        provider={provider}
        providerLabel={providerLabel}
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
  provider,
  providerLabel,
  selected,
}: {
  access: ReturnType<typeof getAutomationSurfaceAccess>
  blocked: boolean
  count: number
  onOpenTools: () => void
  onRemove: () => void
  provider: AutomationSurfaceFormValue["provider"]
  providerLabel: string
  selected: boolean
}) {
  const toneClassNames = getAutomationSurfaceToneClassNames(access, blocked)

  return (
    <ButtonGroup
      aria-label={`${providerLabel} integration tools`}
      className={cn(
        "mx-0.5 inline-flex h-5 overflow-hidden rounded-sm border align-middle text-[0.625rem]/none shadow-none",
        toneClassNames.surface,
        selected && "ring-2 ring-ring/40"
      )}
      data-automation-surface-access={access === "" ? "unset" : access}
      data-automation-surface-policy={blocked ? "blocked" : "allowed"}
    >
      <AutomationSurfaceRemoveButton
        onRemove={onRemove}
        provider={provider}
        providerLabel={providerLabel}
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
        onOpen={onOpenTools}
        providerLabel={providerLabel}
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

function AutomationSurfaceToolsButton({
  access,
  accessLabel,
  blocked,
  count,
  iconClassName,
  onOpen,
  providerLabel,
}: {
  access: ReturnType<typeof getAutomationSurfaceAccess>
  accessLabel: string
  blocked: boolean
  count: number
  iconClassName: string
  onOpen: () => void
  providerLabel: string
}) {
  const Icon = getAutomationSurfaceAccessIcon(access, blocked)
  const label = blocked
    ? `${providerLabel} tools: ${count} enabled, some unavailable. Configure tools.`
    : `${providerLabel} tools: ${count} enabled. Configure tools.`

  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-5 items-center gap-1 px-1 font-medium opacity-70 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30",
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
      title={`${accessLabel}: ${count} enabled`}
      type="button"
    >
      <Icon className="size-3" />
      <span className="tabular-nums">{count}</span>
    </button>
  )
}

function parseAutomationSurfaceTools(tools: unknown) {
  return Array.isArray(tools)
    ? tools.filter((tool): tool is string => typeof tool === "string")
    : []
}
