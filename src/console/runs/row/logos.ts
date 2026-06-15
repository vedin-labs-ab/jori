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

export function providerLogoPath(provider: string | undefined) {
  return provider === undefined ? undefined : providerLogos[provider]
}

export function hasProviderLogo(provider: string) {
  return providerLogos[provider] !== undefined
}
