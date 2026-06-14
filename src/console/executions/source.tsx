import { type ReactNode } from "react"
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
  return (
    <span className="truncate font-medium text-foreground" title={datum.label}>
      {datum.label}
    </span>
  )
}

function optionalItem(key: string, content: ReactNode | undefined) {
  return content === undefined ? [] : [{ key, content }]
}
