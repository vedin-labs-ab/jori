const providerLogos: Record<string, string> = {
  github: "/logos/integrations/github.svg",
  gmail: "/logos/integrations/gmail.svg",
  googleCalendar: "/logos/integrations/google-calendar.svg",
  linear: "/logos/integrations/linear.svg",
  microsoftCalendar: "/logos/integrations/microsoft-calendar.svg",
  microsoftEmail: "/logos/integrations/microsoft-email.svg",
  notion: "/logos/integrations/notion.svg",
  slack: "/logos/integrations/slack.svg",
}

export function providerLogoPath(surface: string | undefined) {
  return surface === undefined ? undefined : providerLogos[surface]
}
