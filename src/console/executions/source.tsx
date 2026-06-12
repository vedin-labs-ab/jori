import { SeparatorDot } from "../dot"

const providerLogos: Record<string, string> = {
  GitHub: "/logos/providers/github.svg",
  Gmail: "/logos/providers/gmail.svg",
  "Google Calendar": "/logos/providers/google-calendar.svg",
  "Google Drive": "/logos/providers/google-drive.svg",
  Linear: "/logos/providers/linear.svg",
  "Microsoft Calendar": "/logos/providers/microsoft-calendar.svg",
  "Outlook Mail": "/logos/providers/microsoft-email.svg",
  Notion: "/logos/providers/notion.svg",
  Slack: "/logos/providers/slack.svg",
  github: "/logos/providers/github.svg",
  gmail: "/logos/providers/gmail.svg",
  googleCalendar: "/logos/providers/google-calendar.svg",
  googleDrive: "/logos/providers/google-drive.svg",
  linear: "/logos/providers/linear.svg",
  microsoftCalendar: "/logos/providers/microsoft-calendar.svg",
  microsoftEmail: "/logos/providers/microsoft-email.svg",
  notion: "/logos/providers/notion.svg",
  slack: "/logos/providers/slack.svg",
}

export function ProviderLogo({
  className = "size-3",
  provider,
}: {
  className?: string
  provider: string | undefined
}) {
  const logo = provider === undefined ? undefined : providerLogos[provider]

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
        <SourceSegment key={segment.key} segment={segment} />
      ))}
    </div>
  )
}

type SourceSegment =
  | {
      actor: string
      key: string
      provider: string | undefined
      type: "triggered"
    }
  | {
      actor: string
      key: string
      type: "stopped"
    }
  | {
      isEmphasized: boolean
      key: string
      label: string
      type: "part"
    }

function SourceSegment({ segment }: { segment: SourceSegment }) {
  if (segment.type === "triggered") {
    return (
      <span>
        Triggered by{" "}
        <span className="font-medium text-foreground">{segment.actor}</span>
        {segment.provider === undefined ? null : (
          <>
            {" in "}
            <span className="inline-flex items-center gap-1 align-middle">
              <ProviderLogo provider={segment.provider} />
              <span className="font-medium text-foreground">
                {segment.provider}
              </span>
            </span>
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

function sourceSegments(parts: string[]) {
  const segments: SourceSegment[] = []
  const keys = new Map<string, number>()

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]

    if (part === "Triggered by" && parts[index + 2] === "in") {
      const actor = parts[index + 1] ?? "someone"
      const providerCandidate = parts[index + 3]
      const provider = providerCandidate?.startsWith("Stopped by ")
        ? undefined
        : providerCandidate

      segments.push({
        actor,
        key: sourceSegmentKey(keys, `triggered-${actor}-${provider ?? ""}`),
        provider,
        type: "triggered",
      })
      index += provider === undefined ? 2 : 3
      continue
    }

    if (part.startsWith("Stopped by ")) {
      const actor = part.slice("Stopped by ".length)

      segments.push({
        actor,
        key: sourceSegmentKey(keys, `stopped-${actor}`),
        type: "stopped",
      })
      continue
    }

    segments.push({
      isEmphasized: isEmphasizedSourcePart(parts, index),
      key: sourceSegmentKey(keys, `part-${part}`),
      label: part,
      type: "part",
    })
  }

  return segments
}

function sourceSegmentKey(keys: Map<string, number>, key: string) {
  const count = keys.get(key) ?? 0
  keys.set(key, count + 1)

  return count === 0 ? key : `${key}-${count}`
}

function isEmphasizedSourcePart(parts: string[], index: number) {
  const label = parts[index]

  return (
    providerLogos[label] !== undefined ||
    (parts[index - 1] === "Triggered by" && parts[index + 1] === "in")
  )
}
