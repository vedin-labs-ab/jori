const providerLogos: Record<string, string> = {
  GitHub: "/logos/integrations/github.svg",
  Gmail: "/logos/integrations/gmail.svg",
  "Google Calendar": "/logos/integrations/google-calendar.svg",
  "Google Drive": "/logos/integrations/google-drive.svg",
  Linear: "/logos/integrations/linear.svg",
  "Microsoft Calendar": "/logos/integrations/microsoft-calendar.svg",
  "Outlook Mail": "/logos/integrations/microsoft-email.svg",
  Notion: "/logos/integrations/notion.svg",
  Slack: "/logos/integrations/slack.svg",
  github: "/logos/integrations/github.svg",
  gmail: "/logos/integrations/gmail.svg",
  googleCalendar: "/logos/integrations/google-calendar.svg",
  googleDrive: "/logos/integrations/google-drive.svg",
  linear: "/logos/integrations/linear.svg",
  microsoftCalendar: "/logos/integrations/microsoft-calendar.svg",
  microsoftEmail: "/logos/integrations/microsoft-email.svg",
  notion: "/logos/integrations/notion.svg",
  slack: "/logos/integrations/slack.svg",
}

export function providerLogoPath(surface: string | undefined) {
  return surface === undefined ? undefined : providerLogos[surface]
}

export function hasProviderLogo(surface: string) {
  return providerLogos[surface] !== undefined
}
