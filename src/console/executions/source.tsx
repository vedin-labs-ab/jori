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
  const visibleParts = visibleSourceParts(parts)

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-muted-foreground text-xs">
      {visibleParts.map((part, index) => (
        <SourcePart isProvider={index === 0} key={part} label={part} />
      ))}
    </div>
  )
}

function visibleSourceParts(parts: string[]) {
  if (providerLogos[parts[0] ?? ""] === undefined) {
    return parts
  }

  if (parts.length <= 2) {
    return [parts[0]].filter((part): part is string => Boolean(part))
  }

  return [parts[0], parts.at(-1)].filter((part): part is string =>
    Boolean(part)
  )
}

function SourcePart({
  isProvider,
  label,
}: {
  isProvider: boolean
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ProviderLogo provider={isProvider ? label : undefined} />
      <span>{label}</span>
    </span>
  )
}
