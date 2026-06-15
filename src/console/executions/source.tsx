import {
  CircleDotDashed,
  File,
  GitPullRequestArrow,
  type LucideIcon,
  Repeat2,
} from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { MiloLogo } from "@/shared/brand"
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
  if (provider === "milo") {
    return (
      <MiloLogo
        aria-hidden="true"
        className={className}
        focusable="false"
        title=""
      />
    )
  }

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
    ...source.metadata.map((item) => ({
      key: `metadata-${item.type}-${item.label}`,
      content: <MetadataDatum datum={item} provider={source.provider?.type} />,
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

function MetadataDatum({ datum, provider }: MetadataRendererProps) {
  const Renderer = metadataRenderers[datum.type] ?? PlainMetadataDatum

  return <Renderer datum={datum} provider={provider} />
}

type MetadataRendererProps = {
  datum: SourceDatum
  provider?: string
}

type MetadataRenderer = (props: MetadataRendererProps) => ReactNode

const metadataRenderers: Record<string, MetadataRenderer> = {
  channel: ChannelDatum,
  issue: IssueDatum,
  page: PageDatum,
  pull_request: PullRequestDatum,
  repository: RepositoryDatum,
  schedule: ScheduleDatum,
}

function RepositoryDatum({ datum }: MetadataRendererProps) {
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

function PullRequestDatum({ datum }: MetadataRendererProps) {
  return (
    <IconMetadataDatum
      datum={{ ...datum, label: pullRequestLabel(datum.label) }}
      icon={GitPullRequestArrow}
    />
  )
}

function ChannelDatum({ datum }: MetadataRendererProps) {
  return (
    <span
      className="inline-flex h-5 max-w-64 min-w-0 items-center rounded-md bg-current/10 px-1.5 font-medium text-[#1264A3] dark:text-[#31B9E5]"
      title={datum.label}
    >
      <span className="truncate">#{channelLabel(datum.label)}</span>
    </span>
  )
}

function IssueDatum({ datum, provider }: MetadataRendererProps) {
  if (provider === "github") {
    return (
      <IconMetadataDatum
        datum={{ ...datum, label: issueNumberLabel(datum.label) }}
        icon={CircleDotDashed}
        title={datum.label}
      />
    )
  }

  if (provider !== "linear") {
    return <PlainMetadataDatum datum={datum} />
  }

  return <IconMetadataDatum datum={datum} icon={CircleDotDashed} />
}

function PageDatum({ datum }: MetadataRendererProps) {
  return <IconMetadataDatum datum={datum} icon={File} />
}

function ScheduleDatum({ datum }: MetadataRendererProps) {
  return <IconMetadataDatum datum={datum} icon={Repeat2} />
}

function PlainMetadataDatum({ datum }: MetadataRendererProps) {
  return (
    <span className="truncate font-medium text-foreground" title={datum.label}>
      {datum.label}
    </span>
  )
}

function IconMetadataDatum({
  datum,
  icon: Icon,
  title = datum.label,
}: {
  datum: SourceDatum
  icon: LucideIcon
  title?: string
}) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground"
      title={title}
    >
      <Icon className="size-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{datum.label}</span>
    </span>
  )
}

export function RepositoryIcon({ className }: { className?: string }) {
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

function issueNumberLabel(label: string) {
  return label.match(/^#\d+/)?.[0] ?? label
}

function channelLabel(label: string) {
  return label.startsWith("#") ? label.slice(1) : label
}

function optionalItem(key: string, content: ReactNode | undefined) {
  return content === undefined ? [] : [{ key, content }]
}
