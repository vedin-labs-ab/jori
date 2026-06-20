import { toolSurfaceLabel } from "@contracts/integrations"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../shared/dot"
import { ProviderLogo } from "../../shared/logo/provider"
import { type ExecutionSource } from "../types"

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
      "surface",
      source.surface === undefined ? undefined : (
        <ProviderDatum surface={source.surface} />
      )
    ),
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

function optionalItem(key: string, content: ReactNode | undefined) {
  return content === undefined ? [] : [{ key, content }]
}
