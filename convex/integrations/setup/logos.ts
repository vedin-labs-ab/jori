import { type Integration } from "../../shared/integrations"

const slackIconPaths = {
  slack: "/logos/integrations/png/slack.png",
  linear: "/logos/integrations/png/linear.png",
  github: "/logos/integrations/png/github.png",
  gmail: "/logos/integrations/png/gmail.png",
  googleCalendar: "/logos/integrations/png/google-calendar.png",
  googleDrive: "/logos/integrations/png/google-drive.png",
  notion: "/logos/integrations/png/notion.png",
  microsoftEmail: "/logos/integrations/png/microsoft-email.png",
  microsoftCalendar: "/logos/integrations/png/microsoft-calendar.png",
} satisfies Record<Integration, string>

export function integrationSlackIconUrl(
  integration: Integration,
  origin: string
) {
  return new URL(slackIconPaths[integration], origin).toString()
}
