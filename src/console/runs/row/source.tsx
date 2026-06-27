import { toolSurfaceLabel } from "@contracts/integrations"
import { type ReactNode } from "react"
import { SeparatorDot } from "../../shared/dot"
import { ProviderLogo } from "../../shared/logo/provider"
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
  "page",
  "project",
  "pull_request",
  "repository",
  "schedule",
  "sender",
  "status",
  "subject",
])

export function SourceLine({
  details = [],
  source,
}: {
  details?: readonly ExecutionDetail[]
  source: ExecutionSource
}) {
  const items = sourceItems(source, details)

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
  details: readonly ExecutionDetail[]
): SourceItem[] {
  return [
    ...optionalItem(
      "surface",
      source.surface === undefined ? undefined : (
        <ProviderDatum surface={source.surface} />
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
