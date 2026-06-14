import { File, type LucideIcon } from "lucide-react"
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
  page: PageDatum,
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
      className="inline-flex h-5 max-w-64 min-w-0 items-center rounded-md bg-[#173241] px-1.5 font-medium text-[#31B9E5]"
      title={datum.label}
    >
      <span className="truncate">#{channelLabel(datum.label)}</span>
    </span>
  )
}

function PageDatum({ datum }: { datum: SourceDatum }) {
  return <IconMetadataDatum datum={datum} icon={File} />
}

function PlainMetadataDatum({ datum }: { datum: SourceDatum }) {
  return (
    <span className="truncate font-medium text-foreground" title={datum.label}>
      {datum.label}
    </span>
  )
}

function IconMetadataDatum({
  datum,
  icon: Icon,
}: {
  datum: SourceDatum
  icon: LucideIcon
}) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground"
      title={datum.label}
    >
      <Icon className="size-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{datum.label}</span>
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
      <path d="M3 2.75A2.75 2.75 0 0 1 5.75 0h14.5a.75.75 0 0 1 .75.75v20.5a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1 0-1.5h5.25v-4H6A1.5 1.5 0 0 0 4.5 18v.75c0 .716.43 1.334 1.05 1.605a.75.75 0 0 1-.6 1.374A3.251 3.251 0 0 1 3 18.75ZM19.5 1.5H5.75c-.69 0-1.25.56-1.25 1.25v12.651A2.989 2.989 0 0 1 6 15h13.5Z" />
      <path d="M7 18.25a.25.25 0 0 1 .25-.25h5a.25.25 0 0 1 .25.25v5.01a.25.25 0 0 1-.397.201l-2.206-1.604a.25.25 0 0 0-.294 0L7.397 23.46a.25.25 0 0 1-.397-.2v-5.01Z" />
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
