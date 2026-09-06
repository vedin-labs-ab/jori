import { toolSurfaceLabel } from "@contracts/integrations"
import { CornerDownRight, Play } from "lucide-react"
import { type ReactNode } from "react"
import { ProviderLogo } from "@/shared/logo/provider"
import { SeparatorDot } from "../../dot"
import { type ListAudience } from "../../list/audience"
import { AudienceDatum } from "../details"
import {
  type ExecutionDetail,
  type ExecutionDetailType,
  type ExecutionSource,
  type SourceDatum,
} from "../types"
import { SourceMetadataDatum } from "./metadata"

const sourceMetadataTypes = new Set<ExecutionDetailType>([
  "calendar_event",
  "channel",
  "file",
  "folder",
  "issue",
  "job",
  "page",
  "project",
  "pull_request",
  "repository",
  "schedule",
  "sender",
  "status",
  "store",
  "subject",
  "table",
])

export function SourceLine({
  details = [],
  audience,
  source,
}: {
  details?: readonly ExecutionDetail[]
  /** Omitted when the list is already filtered to a single audience. */
  audience?: ListAudience
  source: ExecutionSource
}) {
  const items = sourceItems(source, details, audience)

  if (items.length === 0) {
    return null
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground text-xs">
      {items.map((item, index) => (
        <SourceItem key={item.key} showSeparator={index > 0}>
          {item.content}
        </SourceItem>
      ))}
    </div>
  )
}

type SourceItem = {
  content: ReactNode
  key: string
}

function sourceItems(
  source: ExecutionSource,
  details: readonly ExecutionDetail[],
  audience: ListAudience | undefined
): SourceItem[] {
  return [
    ...optionalItem(
      "surface",
      source.surface === undefined ? undefined : (
        <ProviderDatum surface={source.surface} />
      )
    ),
    ...optionalItem(
      "parent",
      source.parent === undefined ? undefined : (
        <SubtaskDatum parent={source.parent} />
      )
    ),
    ...optionalItem(
      "trigger",
      source.trigger === undefined ? undefined : (
        <TriggerDatum actor={source.trigger.actor} />
      )
    ),
    ...optionalItem(
      "kind",
      source.kind === undefined ? undefined : (
        <SourceTypeDatum datum={source.kind} />
      )
    ),
    ...optionalItem(
      "event",
      source.event === undefined ? undefined : (
        <SourceTypeDatum datum={source.event} />
      )
    ),
    ...sourceDetailItems(details, source.surface),
    ...optionalItem(
      "stop",
      source.stop === undefined ? undefined : (
        <span>
          Stopped by{" "}
          <span className="font-medium text-foreground">
            {source.stop.actor.label}
          </span>
        </span>
      )
    ),
    ...optionalItem(
      "audience",
      audience === undefined ? undefined : (
        <AudienceDatum audience={audience} iconClassName="size-3" />
      )
    ),
  ]
}

function SourceItem({
  children,
  showSeparator,
}: {
  children: ReactNode
  showSeparator: boolean
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {showSeparator ? (
        <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      ) : null}
      {children}
    </span>
  )
}

function ProviderDatum({ surface }: { surface: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <ProviderLogo surface={surface} />
      <span className="truncate font-medium text-foreground">
        {toolSurfaceLabel(surface)}
      </span>
    </span>
  )
}

function SubtaskDatum({
  parent,
}: {
  parent: NonNullable<ExecutionSource["parent"]>
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <CornerDownRight className="size-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">
        Subtask
        {parent.title === undefined ? null : (
          <>
            {" of "}
            <span className="font-medium text-foreground">{parent.title}</span>
          </>
        )}
      </span>
    </span>
  )
}

function TriggerDatum({ actor }: { actor?: SourceDatum }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Play className="size-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">
        Manually triggered
        {actor === undefined ? null : (
          <>
            {" by "}
            <span className="font-medium text-foreground">{actor.label}</span>
          </>
        )}
      </span>
    </span>
  )
}

function SourceTypeDatum({ datum }: { datum: SourceDatum }) {
  return (
    <span
      className="truncate font-medium font-mono text-foreground"
      title={datum.label}
    >
      {datum.type}
    </span>
  )
}

function sourceDetailItems(
  details: readonly ExecutionDetail[],
  surface: string | undefined
): SourceItem[] {
  return details.flatMap((detail) =>
    sourceMetadataTypes.has(detail.type)
      ? [
          {
            content: <SourceMetadataDatum detail={detail} surface={surface} />,
            key: `detail-${detail.type}-${detail.url ?? detail.label}`,
          },
        ]
      : []
  )
}

function optionalItem(key: string, content: ReactNode | undefined) {
  return content === undefined ? [] : [{ key, content }]
}
