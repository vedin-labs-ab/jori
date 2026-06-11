export function providerLabel(provider: string | undefined) {
  if (provider === undefined) {
    return "Milo"
  }

  const labels: Record<string, string> = {
    github: "GitHub",
    gmail: "Gmail",
    googleCalendar: "Google Calendar",
    googleDrive: "Google Drive",
    linear: "Linear",
    microsoftCalendar: "Microsoft Calendar",
    microsoftEmail: "Microsoft Email",
    milo: "Milo",
    notion: "Notion",
    slack: "Slack",
  }

  return labels[provider] ?? provider
}
