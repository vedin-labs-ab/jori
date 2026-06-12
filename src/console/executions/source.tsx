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
      automation: string
      key: string
      type: "automation"
    }
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
    const matchedSegment = matchedSourceSegment(parts, index, keys)

    if (matchedSegment !== undefined) {
      segments.push(matchedSegment.segment)
      index += matchedSegment.skip
      continue
    }

    segments.push(partSourceSegment(parts, index, keys))
  }

  return segments
}

type SourceSegmentMatch = {
  segment: SourceSegment
  skip: number
}

function matchedSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  return (
    automationSourceSegment(parts, index, keys) ??
    triggeredSourceSegment(parts, index, keys) ??
    stoppedSourceSegment(parts[index], keys)
  )
}

function automationSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  if (parts[index] !== "Triggered by automation:") {
    return undefined
  }

  const automation = parts[index + 1]

  if (automation === undefined || automation === "") {
    return undefined
  }

  return {
    segment: {
      automation,
      key: sourceSegmentKey(keys, `automation-${automation}`),
      type: "automation",
    },
    skip: 1,
  }
}

function triggeredSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  if (parts[index] !== "Triggered by" || parts[index + 2] !== "in") {
    return undefined
  }

  const actor = parts[index + 1] ?? "someone"
  const providerCandidate = parts[index + 3]
  const provider = providerCandidate?.startsWith("Stopped by ")
    ? undefined
    : providerCandidate

  return {
    segment: {
      actor,
      key: sourceSegmentKey(keys, `triggered-${actor}-${provider ?? ""}`),
      provider,
      type: "triggered",
    },
    skip: provider === undefined ? 2 : 3,
  }
}

function stoppedSourceSegment(
  part: string,
  keys: Map<string, number>
): SourceSegmentMatch | undefined {
  if (!part.startsWith("Stopped by ")) {
    return undefined
  }

  const actor = part.slice("Stopped by ".length)

  return {
    segment: {
      actor,
      key: sourceSegmentKey(keys, `stopped-${actor}`),
      type: "stopped",
    },
    skip: 0,
  }
}

function partSourceSegment(
  parts: string[],
  index: number,
  keys: Map<string, number>
): SourceSegment {
  const part = parts[index]

  return {
    isEmphasized: isEmphasizedSourcePart(parts, index),
    key: sourceSegmentKey(keys, `part-${part}`),
    label: part,
    type: "part",
  }
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
