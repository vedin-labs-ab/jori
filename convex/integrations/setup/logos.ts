import { type Integration } from "../../shared/integrations"

const logoPaths = {
  slack: "/logos/integrations/slack.svg",
  linear: "/logos/integrations/linear.svg",
  github: "/logos/integrations/github.svg",
  gmail: "/logos/integrations/gmail.svg",
  googleCalendar: "/logos/integrations/google-calendar.svg",
  googleDrive: "/logos/integrations/google-drive.svg",
  notion: "/logos/integrations/notion.svg",
  microsoftEmail: "/logos/integrations/microsoft-email.svg",
  microsoftCalendar: "/logos/integrations/microsoft-calendar.svg",
} satisfies Record<Integration, string>

export function integrationLogoUrl(integration: Integration, origin: string) {
  return new URL(logoPaths[integration], origin).toString()
}
