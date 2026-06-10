const providerLogos: Record<string, string> = {
  GitHub: "/logos/providers/github.svg",
  Gmail: "/logos/providers/gmail.svg",
  "Google Calendar": "/logos/providers/google-calendar.svg",
  Linear: "/logos/providers/linear.svg",
  "Microsoft Calendar": "/logos/providers/microsoft-calendar.svg",
  "Microsoft Email": "/logos/providers/microsoft-email.svg",
  Notion: "/logos/providers/notion.svg",
  Slack: "/logos/providers/slack.svg",
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
  const logo = isProvider ? providerLogos[label] : undefined

  return (
    <span className="inline-flex items-center gap-1.5">
      {logo !== undefined ? (
        <img alt="" className="size-3 shrink-0" src={logo} />
      ) : null}
      <span>{label}</span>
    </span>
  )
}
