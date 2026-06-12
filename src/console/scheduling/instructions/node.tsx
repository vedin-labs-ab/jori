import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react"
import { CircleDashed, FilePenLine, FileText, PenLine, X } from "lucide-react"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"
import { SurfaceLogo } from "../logo"
import {
  getNextScheduleSurfaceAccess,
  getScheduleSurfaceAccessLabel,
  getScheduleSurfaceLabel,
  isScheduleSurfaceProvider,
  type ScheduleSurfaceFormValue,
  type ScheduleSurfaceProvider,
} from "../surfaces"

export function ScheduleSurfaceNodeView({
  deleteNode,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const provider = isScheduleSurfaceProvider(node.attrs.provider)
    ? node.attrs.provider
    : null
  const access = parseScheduleSurfaceAccess(node.attrs.access)

  if (provider === null) {
    return null
  }

  const accessLabel = getScheduleSurfaceAccessLabel(access)
  const providerLabel = getScheduleSurfaceLabel(provider)

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
      data-schedule-surface-view=""
    >
      <ButtonGroup
        aria-label={`${providerLabel} schedule surface`}
        className={cn(
          "mx-0.5 inline-flex h-6 overflow-hidden rounded-md border align-middle text-foreground text-xs/relaxed shadow-none",
          getSurfaceClassName(access),
          selected && "ring-2 ring-ring/40"
        )}
      >
        <ScheduleSurfaceAccessButton
          access={access}
          accessLabel={accessLabel}
          onChange={() =>
            updateAttributes({ access: getNextScheduleSurfaceAccess(access) })
          }
          providerLabel={providerLabel}
        />
        <ButtonGroupSeparator className="my-1 w-px bg-border" />
        <ScheduleSurfaceRemoveButton
          onRemove={deleteNode}
          provider={provider}
          providerLabel={providerLabel}
        />
      </ButtonGroup>
    </NodeViewWrapper>
  )
}

function ScheduleSurfaceAccessButton({
  access,
  accessLabel,
  onChange,
  providerLabel,
}: {
  access: ScheduleSurfaceFormValue["access"]
  accessLabel: string
  onChange: () => void
  providerLabel: string
}) {
  const Icon = getAccessIcon(access)

  return (
    <button
      aria-label={`${providerLabel} access: ${accessLabel}. Change access.`}
      className={cn(
        "grid w-7 place-items-center opacity-55 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30",
        getAccessIconClassName(access)
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onChange()
      }}
      title={accessLabel}
      type="button"
    >
      <Icon className="size-3.5" />
    </button>
  )
}

function ScheduleSurfaceRemoveButton({
  onRemove,
  provider,
  providerLabel,
}: {
  onRemove: () => void
  provider: ScheduleSurfaceProvider
  providerLabel: string
}) {
  return (
    <button
      aria-label={`Remove ${providerLabel} marker`}
      className="group/remove-surface-marker flex items-center gap-1.5 px-2 font-medium outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onRemove()
      }}
      title={`Remove ${providerLabel}`}
      type="button"
    >
      <ScheduleSurfaceRemoveIcon provider={provider} />
      <ScheduleSurfaceRemoveLabel providerLabel={providerLabel} />
    </button>
  )
}

function ScheduleSurfaceRemoveIcon({
  provider,
}: {
  provider: ScheduleSurfaceProvider
}) {
  return (
    <span className="grid size-3.5 shrink-0 place-items-center">
      <span className="col-start-1 row-start-1 flex size-3.5 items-center justify-center group-hover/remove-surface-marker:invisible">
        <SurfaceLogo provider={provider} />
      </span>
      <X
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 size-3.5 text-muted-foreground group-hover/remove-surface-marker:visible"
      />
    </span>
  )
}

function ScheduleSurfaceRemoveLabel({
  providerLabel,
}: {
  providerLabel: string
}) {
  return (
    <span className="relative inline-grid overflow-hidden">
      <span className="col-start-1 row-start-1 group-hover/remove-surface-marker:invisible">
        {providerLabel}
      </span>
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 group-hover/remove-surface-marker:visible"
      >
        Remove
      </span>
    </span>
  )
}

function getAccessIcon(access: ScheduleSurfaceFormValue["access"]) {
  if (access === "read") {
    return FileText
  }

  if (access === "write") {
    return PenLine
  }

  return access === "both" ? FilePenLine : CircleDashed
}

function getSurfaceClassName(access: ScheduleSurfaceFormValue["access"]) {
  if (access === "read") {
    return "border-informational/30 bg-informational/10"
  }

  if (access === "write") {
    return "border-primary/30 bg-primary/10"
  }

  if (access === "both") {
    return "border-foreground/20 bg-muted"
  }

  return "border-dashed bg-background"
}

function getAccessIconClassName(access: ScheduleSurfaceFormValue["access"]) {
  if (access === "read") {
    return "text-informational"
  }

  if (access === "write") {
    return "text-primary"
  }

  if (access === "both") {
    return "text-foreground"
  }

  return "text-muted-foreground"
}

function parseScheduleSurfaceAccess(
  access: unknown
): ScheduleSurfaceFormValue["access"] {
  return access === "read" || access === "write" || access === "both"
    ? access
    : ""
}
