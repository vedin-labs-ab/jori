import { CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  type IntegrationCallbackProvider,
  type IntegrationCallbackStatus,
  useIntegrationCallbackStatuses,
} from "./integrations/status"

type VisibleCallbackStatus = Exclude<IntegrationCallbackStatus, null>

const integrationCallbackAlerts = [
  callbackAlert(
    "slack",
    "connected",
    "Slack connected",
    "Slack can now send Milo events for the active organization."
  ),
  callbackAlert(
    "linear",
    "connected",
    "Linear connected",
    "Linear can now send Milo issue and comment events for the active organization."
  ),
  callbackAlert(
    "microsoftEmail",
    "connected",
    "Microsoft Email connected",
    "Milo can now use Outlook mail tools for your account when explicitly requested."
  ),
  callbackAlert(
    "microsoftCalendar",
    "connected",
    "Microsoft Calendar connected",
    "Milo can now use Microsoft Calendar tools for your account when explicitly requested."
  ),
  callbackAlert(
    "github",
    "connected",
    "GitHub connected",
    "GitHub can now send Milo comment events for the active organization."
  ),
  callbackAlert(
    "gmail",
    "connected",
    "Email connected",
    "Milo can now use Gmail tools for your account when explicitly requested."
  ),
  callbackAlert(
    "googleCalendar",
    "connected",
    "Calendar connected",
    "Milo can now use Google Calendar tools for your account when explicitly requested."
  ),
  callbackAlert(
    "slack",
    "error",
    "Slack connection failed",
    "Slack did not return an installation token. Check the Slack app OAuth settings and try again."
  ),
  callbackAlert(
    "linear",
    "error",
    "Linear connection failed",
    "Linear did not return an installation token. Check the Linear OAuth app settings and try again."
  ),
  callbackAlert(
    "microsoftEmail",
    "error",
    "Microsoft Email connection failed",
    "Microsoft did not return a usable Outlook mail OAuth token. Check the Microsoft app permissions and try again."
  ),
  callbackAlert(
    "microsoftCalendar",
    "error",
    "Microsoft Calendar connection failed",
    "Microsoft did not return a usable Calendar OAuth token. Check the Microsoft app permissions and try again."
  ),
  callbackAlert(
    "github",
    "error",
    "GitHub connection failed",
    "GitHub did not return an installation. Check the GitHub App setup URL and try again."
  ),
  callbackAlert(
    "gmail",
    "error",
    "Email connection failed",
    "Google did not return a usable Gmail OAuth token. Check the Google OAuth app settings and try again."
  ),
  callbackAlert(
    "googleCalendar",
    "error",
    "Calendar connection failed",
    "Google did not return a usable Calendar OAuth token. Check the Google OAuth app settings and try again."
  ),
]

function callbackAlert(
  provider: IntegrationCallbackProvider,
  status: VisibleCallbackStatus,
  title: string,
  description: string
) {
  return { description, provider, status, title }
}

export function IntegrationCallbackAlerts() {
  const statuses = useIntegrationCallbackStatuses()

  return integrationCallbackAlerts.map((alert) => (
    <CallbackAlert
      key={`${alert.provider}-${alert.status}`}
      alert={alert}
      visibleStatus={statuses[alert.provider]}
    />
  ))
}

function CallbackAlert({
  alert,
  visibleStatus,
}: {
  alert: ReturnType<typeof callbackAlert>
  visibleStatus: IntegrationCallbackStatus
}) {
  if (visibleStatus !== alert.status) {
    return null
  }

  return (
    <Alert variant={alert.status === "error" ? "destructive" : undefined}>
      {alert.status === "connected" ? <CheckCircle2 /> : null}
      <AlertTitle>{alert.title}</AlertTitle>
      <AlertDescription>{alert.description}</AlertDescription>
    </Alert>
  )
}
