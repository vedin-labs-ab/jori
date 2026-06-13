import { SeparatorDot } from "../dot"
import { providerLogoPath } from "./logos"
import { type SourceSegment, sourceSegments } from "./segments"

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

export function SourceParts({ parts }: { parts: string[] }) {
  const segments = sourceSegments(parts)

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground text-xs">
      {segments.map((segment) => (
        <SourceSegmentView key={segment.key} segment={segment} />
      ))}
    </div>
  )
}

function SourceSegmentView({ segment }: { segment: SourceSegment }) {
  if (segment.type === "automation") {
    return (
      <span>
        Triggered by the{" "}
        <span className="font-medium text-foreground">
          {segment.automation}
        </span>{" "}
        automation
      </span>
    )
  }

  if (segment.type === "event") {
    return <EventSourceSegment segment={segment} />
  }

  if (segment.type === "triggered") {
    return (
      <span>
        Triggered by{" "}
        <span className="font-medium text-foreground">{segment.actor}</span>
        {segment.provider === undefined ? null : (
          <>
            {" in "}
            <ProviderName provider={segment.provider} />
          </>
        )}
      </span>
    )
  }

  if (segment.type === "stopped") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <SeparatorDot className="text-muted-foreground/60" />
        <span>
          Stopped by{" "}
          <span className="font-medium text-foreground">{segment.actor}</span>
        </span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <ProviderLogo provider={segment.label} />
      <span
        className={segment.isEmphasized ? "font-medium text-foreground" : ""}
      >
        {segment.label}
      </span>
    </span>
  )
}

function EventSourceSegment({
  segment,
}: {
  segment: Extract<SourceSegment, { type: "event" }>
}) {
  const shouldShowEvent =
    segment.provider !== undefined || segment.event !== "Provider event"

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span>
        Triggered by{" "}
        {segment.actor === undefined ? null : (
          <>
            <span className="font-medium text-foreground">{segment.actor}</span>
            {segment.provider === undefined ? " " : " in "}
          </>
        )}
        {segment.provider === undefined ? (
          "provider event"
        ) : (
          <ProviderName provider={segment.provider} />
        )}
      </span>
      {shouldShowEvent ? (
        <span className="inline-flex items-center gap-1.5">
          <SeparatorDot className="text-muted-foreground/60" />
          <span className="font-medium text-foreground">{segment.event}</span>
        </span>
      ) : null}
      {segment.automation === undefined ? null : (
        <span className="inline-flex items-center gap-1.5">
          <SeparatorDot className="text-muted-foreground/60" />
          <span>
            Automation{" "}
            <span className="font-medium text-foreground">
              {segment.automation}
            </span>
          </span>
        </span>
      )}
    </span>
  )
}

function ProviderName({ provider }: { provider: string }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <ProviderLogo provider={provider} />
      <span className="font-medium text-foreground">{provider}</span>
    </span>
  )
}
