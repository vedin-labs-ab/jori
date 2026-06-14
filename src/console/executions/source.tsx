import { type ReactNode } from "react"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../dot"
import { providerLogoPath } from "./logos"
import { type ExecutionSource, type SourceDatum } from "./types"

export function ProviderLogo({
  className = "size-3",
  provider,
}: {
  className?: string
  provider: string | undefined
}) {
  const logo = providerLogoPath(provider)

  if (logo === undefined) {
    return null
  }

  return <img alt="" className={`${className} shrink-0`} src={logo} />
}

export function SourceLine({ source }: { source: ExecutionSource }) {
  const items = sourceItems(source)

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

function sourceItems(source: ExecutionSource): SourceItem[] {
  return [
    ...optionalItem(
      "provider",
      source.provider === undefined ? undefined : (
        <ProviderDatum datum={source.provider} />
      )
    ),
    ...optionalItem(
      "event",
      source.event === undefined ? undefined : (
        <EventDatum datum={source.event} />
      )
    ),
    ...source.metadata.map((item) => ({
      key: `metadata-${item.type}-${item.label}`,
      content: <MetadataDatum datum={item} />,
    })),
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

function ProviderDatum({ datum }: { datum: SourceDatum }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <ProviderLogo provider={datum.type} />
      <span className="truncate font-medium text-foreground">
        {datum.label}
      </span>
    </span>
  )
}

function EventDatum({ datum }: { datum: SourceDatum }) {
  return (
    <span
      className="truncate font-medium font-mono text-foreground"
      title={datum.label}
    >
      {datum.type}
    </span>
  )
}

function MetadataDatum({ datum }: { datum: SourceDatum }) {
  const Renderer = metadataRenderers[datum.type] ?? PlainMetadataDatum

  return <Renderer datum={datum} />
}

type MetadataRenderer = (props: { datum: SourceDatum }) => ReactNode

const metadataRenderers: Record<string, MetadataRenderer> = {
  channel: ChannelDatum,
  pull_request: PullRequestDatum,
  repository: RepositoryDatum,
}

function RepositoryDatum({ datum }: { datum: SourceDatum }) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground"
      title={datum.label}
    >
      <RepositoryIcon className="size-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{repositoryLabel(datum.label)}</span>
    </span>
  )
}

function PullRequestDatum({ datum }: { datum: SourceDatum }) {
  return (
    <Kbd className="font-mono" title={datum.label}>
      {pullRequestLabel(datum.label)}
    </Kbd>
  )
}

function ChannelDatum({ datum }: { datum: SourceDatum }) {
  return (
    <span
      className="inline-flex h-5 min-w-0 items-center gap-0.5 rounded-sm bg-muted px-1.5 font-medium text-foreground"
      title={datum.label}
    >
      <span className="shrink-0 text-muted-foreground">#</span>
      <span className="truncate">{channelLabel(datum.label)}</span>
    </span>
  )
}

function PlainMetadataDatum({ datum }: { datum: SourceDatum }) {
  return (
    <span className="truncate font-medium text-foreground" title={datum.label}>
      {datum.label}
    </span>
  )
}

function RepositoryIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-3", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h15A2.5 2.5 0 0 1 22 2.5v19.75a.75.75 0 0 1-1.2.6l-1.45-1.087a.25.25 0 0 0-.3 0L17.6 22.85a.75.75 0 0 1-1.2-.6V2.5a1 1 0 0 0-1-1H4.5a1 1 0 0 0-1 1v16.75c0 .966.784 1.75 1.75 1.75h8.5a.75.75 0 0 1 0 1.5h-8.5A3.25 3.25 0 0 1 2 19.25V2.5Zm15.9-1c.066.323.1.658.1 1v17.25l.65-.487a1.75 1.75 0 0 1 2.1 0l.65.487V2.5a1 1 0 0 0-1-1h-2.5Z" />
    </svg>
  )
}

function repositoryLabel(label: string) {
  return label.split("/").filter(Boolean).at(-1) ?? label
}

function pullRequestLabel(label: string) {
  return label.match(/^#\d+/)?.[0] ?? label
}

function channelLabel(label: string) {
  return label.startsWith("#") ? label.slice(1) : label
}

function optionalItem(key: string, content: ReactNode | undefined) {
  return content === undefined ? [] : [{ key, content }]
}
