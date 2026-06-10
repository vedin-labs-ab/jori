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
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-muted-foreground text-xs">
      {parts.map((part, index) => (
        <SourcePart isProvider={index === 0} key={part} label={part} />
      ))}
    </div>
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
