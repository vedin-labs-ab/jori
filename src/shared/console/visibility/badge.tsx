import { type VisibilityMode } from "@contracts/visibility"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useVisibilityDirectory } from "./directory"
import { visibilityIcon } from "./marks"
import { type VisibilitySubject, visibilitySummary } from "./summary"

// The quiet visibility vocabulary every material surface shares: one icon
// per mode, named in a tooltip.

export function VisibilityIcon({
  className,
  mode,
}: {
  className?: string
  mode: VisibilityMode | "folder"
}) {
  const Icon = visibilityIcon(mode)

  return <Icon className={className} aria-hidden />
}

/** Compact metadata for navigation and narrow rows. Organization-wide
 * items stay unmarked only when no folder limits their audience. */
export function VisibilityMark({
  className,
  ...props
}: VisibilitySubject & { className?: string }) {
  const summary = visibilitySummary(props, useVisibilityDirectory())
  if (!summary.marked) {
    return null
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-sm text-muted-foreground [&_svg]:size-3.5!",
            className
          )}
        >
          <VisibilityIcon mode={summary.icon} />
          <span className="sr-only"> · {summary.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{summary.description}</TooltipContent>
    </Tooltip>
  )
}

export function VisibilityLabel({
  quietDefault = false,
  ...props
}: VisibilitySubject & { quietDefault?: boolean }) {
  const summary = visibilitySummary(props, useVisibilityDirectory())
  if (quietDefault && props.visibility.mode === "organization") {
    const description =
      props.folderId === undefined ? "Organization default" : "Same as folder"
    return (
      <span className="text-muted-foreground" title={description}>
        <span aria-hidden>—</span>
        <span className="sr-only">{description}</span>
      </span>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex max-w-48 items-center gap-1.5 text-muted-foreground text-xs [&_svg]:size-3.5!">
          <VisibilityIcon mode={summary.icon} />
          <span className="truncate">{summary.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{summary.description}</TooltipContent>
    </Tooltip>
  )
}

/** A real button, unlike passive row metadata. Opens the existing access
 * dialog, which resolves folder constraints and enforces owner permissions. */
export function VisibilityButton({
  onClick,
  className,
  ...subject
}: VisibilitySubject & { onClick: () => void; className?: string }) {
  const summary = visibilitySummary(subject, useVisibilityDirectory())
  return (
    <Button
      aria-label={`Audience: ${summary.label}`}
      className={cn(
        "max-w-32 shrink-0 gap-1.5 @max-2xl/inset:size-7 @max-2xl/inset:px-0 @2xl/inset:max-w-48 [&_svg]:size-3.5!",
        className
      )}
      onClick={onClick}
      title={summary.description}
      type="button"
      variant="ghost"
    >
      <VisibilityIcon mode={summary.icon} />
      <span className="truncate @max-2xl/inset:hidden">{summary.label}</span>
    </Button>
  )
}
