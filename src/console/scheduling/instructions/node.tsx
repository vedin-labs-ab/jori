import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react"
import { CircleDashed, FilePenLine, FileText, PenLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SurfaceLogo } from "../logo"
import {
  getNextScheduleSurfaceAccess,
  getScheduleSurfaceAccessLabel,
  getScheduleSurfaceLabel,
  isScheduleSurfaceProvider,
  type ScheduleSurfaceFormValue,
} from "../surfaces"

export function ScheduleSurfaceNodeView({
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
  const Icon = getAccessIcon(access)

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-baseline"
      contentEditable={false}
      data-schedule-surface-view=""
    >
      <Badge
        className={cn(
          "mx-0.5 h-5 gap-1.5 rounded-md px-1.5 align-baseline text-[0.6875rem]",
          getAccessClassName(access),
          selected && "ring-2 ring-ring/40"
        )}
        variant="outline"
      >
        <button
          aria-label={`${getScheduleSurfaceLabel(provider)} access: ${accessLabel}. Change access.`}
          className="grid size-4 place-items-center rounded-[4px] outline-none hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            updateAttributes({ access: getNextScheduleSurfaceAccess(access) })
          }}
          title={accessLabel}
          type="button"
        >
          <Icon className="size-3" />
        </button>
        <SurfaceLogo provider={provider} />
        <span>{getScheduleSurfaceLabel(provider)}</span>
      </Badge>
    </NodeViewWrapper>
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

function getAccessClassName(access: ScheduleSurfaceFormValue["access"]) {
  if (access === "read") {
    return "border-informational/30 bg-informational/10 text-informational"
  }

  if (access === "write") {
    return "border-primary/30 bg-primary/10 text-primary"
  }

  if (access === "both") {
    return "border-foreground/20 bg-muted text-foreground"
  }

  return "border-dashed bg-background text-muted-foreground"
}

function parseScheduleSurfaceAccess(
  access: unknown
): ScheduleSurfaceFormValue["access"] {
  return access === "read" || access === "write" || access === "both"
    ? access
    : ""
}
