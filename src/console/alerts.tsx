import { CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useIntegrationCallbackStatuses } from "./integrations/status"

const integrationCallbackAlerts = [
  {
    provider: "slack",
    status: "connected",
    title: "Slack connected",
    description: "Slack can now send Milo events for the active organization.",
  },
  {
    provider: "linear",
    status: "connected",
    title: "Linear connected",
    description:
      "Linear can now send Milo issue and comment events for the active organization.",
  },
  {
    provider: "microsoftEmail",
    status: "connected",
    title: "Microsoft Email connected",
    description:
      "Milo can now use Outlook mail tools for your account when explicitly requested.",
  },
  {
    provider: "microsoftCalendar",
    status: "connected",
    title: "Microsoft Calendar connected",
    description:
      "Milo can now use Microsoft Calendar tools for your account when explicitly requested.",
  },
  {
    provider: "github",
    status: "connected",
    title: "GitHub connected",
    description:
      "GitHub can now send Milo comment events for the active organization.",
  },
  {
    provider: "gmail",
    status: "connected",
    title: "Email connected",
    description:
      "Milo can now use Gmail tools for your account when explicitly requested.",
  },
  {
    provider: "googleCalendar",
    status: "connected",
    title: "Calendar connected",
    description:
      "Milo can now use Google Calendar tools for your account when explicitly requested.",
  },
  {
    provider: "slack",
    status: "error",
    title: "Slack connection failed",
    description:
      "Slack did not return an installation token. Check the Slack app OAuth settings and try again.",
  },
  {
    provider: "linear",
    status: "error",
    title: "Linear connection failed",
    description:
      "Linear did not return an installation token. Check the Linear OAuth app settings and try again.",
  },
  {
    provider: "microsoftEmail",
    status: "error",
    title: "Microsoft Email connection failed",
    description:
      "Microsoft did not return a usable Outlook mail OAuth token. Check the Microsoft app permissions and try again.",
  },
  {
    provider: "microsoftCalendar",
    status: "error",
    title: "Microsoft Calendar connection failed",
    description:
      "Microsoft did not return a usable Calendar OAuth token. Check the Microsoft app permissions and try again.",
  },
  {
    provider: "github",
    status: "error",
    title: "GitHub connection failed",
    description:
      "GitHub did not return an installation. Check the GitHub App setup URL and try again.",
  },
  {
    provider: "gmail",
    status: "error",
    title: "Email connection failed",
    description:
      "Google did not return a usable Gmail OAuth token. Check the Google OAuth app settings and try again.",
  },
  {
    provider: "googleCalendar",
    status: "error",
    title: "Calendar connection failed",
    description:
      "Google did not return a usable Calendar OAuth token. Check the Google OAuth app settings and try again.",
  },
] as const

export function IntegrationCallbackAlerts() {
  const statuses = useIntegrationCallbackStatuses()

  return integrationCallbackAlerts.map((alert) => {
    if (statuses[alert.provider] !== alert.status) {
      return null
    }

    return (
      <Alert
        key={`${alert.provider}-${alert.status}`}
        variant={alert.status === "error" ? "destructive" : undefined}
      >
        {alert.status === "connected" ? <CheckCircle2 /> : null}
        <AlertTitle>{alert.title}</AlertTitle>
        <AlertDescription>{alert.description}</AlertDescription>
      </Alert>
    )
  })
}
