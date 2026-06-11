const providerLogos: Record<string, string> = {
  GitHub: "/logos/providers/github.svg",
  Gmail: "/logos/providers/gmail.svg",
  "Google Calendar": "/logos/providers/google-calendar.svg",
  Linear: "/logos/providers/linear.svg",
  "Microsoft Calendar": "/logos/providers/microsoft-calendar.svg",
  "Microsoft Email": "/logos/providers/microsoft-email.svg",
  Notion: "/logos/providers/notion.svg",
  Slack: "/logos/providers/slack.svg",
  github: "/logos/providers/github.svg",
  gmail: "/logos/providers/gmail.svg",
  googleCalendar: "/logos/providers/google-calendar.svg",
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
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground text-xs">
      {parts.map((part, index) => (
        <SourcePart
          isEmphasized={isEmphasizedSourcePart(parts, index)}
          isStoppedBy={part.startsWith("Stopped by ")}
          key={part}
          label={part}
        />
      ))}
    </div>
  )
}

function SourcePart({
  isEmphasized,
  isStoppedBy,
  label,
}: {
  isEmphasized: boolean
  isStoppedBy: boolean
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {isStoppedBy ? (
        <span className="px-1 text-muted-foreground/60" aria-hidden="true">
          ·
        </span>
      ) : null}
      <ProviderLogo provider={label} />
      <span className={isEmphasized ? "font-medium text-foreground" : ""}>
        {label}
      </span>
    </span>
  )
}

function isEmphasizedSourcePart(parts: string[], index: number) {
  const label = parts[index]

  return (
    providerLogos[label] !== undefined ||
    (parts[index - 1] === "Triggered by" && parts[index + 1] === "in")
  )
}
