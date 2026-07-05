import { CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  type IntegrationCallbackIntegration,
  type IntegrationCallbackStatus,
  useIntegrationCallbackStatuses,
} from "./card/status"

type VisibleCallbackStatus = Exclude<IntegrationCallbackStatus, null>

const integrationCallbackAlerts = [
  callbackAlert(
    "slack",
    "connected",
    "Slack connected",
    "Milo can now respond to mentions and search context in your Slack workspace."
  ),
  callbackAlert(
    "linear",
    "connected",
    "Linear connected",
    "Milo can now respond to mentions and comment on Linear issues."
  ),
  callbackAlert(
    "microsoftEmail",
    "connected",
    "Outlook Mail connected",
    "Milo can now work with your Outlook mail when you ask."
  ),
  callbackAlert(
    "microsoftCalendar",
    "connected",
    "Microsoft Calendar connected",
    "Milo can now work with your Microsoft calendar when you ask."
  ),
  callbackAlert(
    "github",
    "connected",
    "GitHub connected",
    "Milo can now respond to mentions in GitHub issues and pull requests."
  ),
  callbackAlert(
    "gmail",
    "connected",
    "Gmail connected",
    "Milo can now work with your Gmail when you ask."
  ),
  callbackAlert(
    "googleCalendar",
    "connected",
    "Google Calendar connected",
    "Milo can now work with your Google Calendar when you ask."
  ),
  callbackAlert(
    "slack",
    "error",
    "Slack integration failed",
    "Slack didn't finish connecting. Try again, and check the Slack app's OAuth settings if it keeps failing."
  ),
  callbackAlert(
    "linear",
    "error",
    "Linear integration failed",
    "Linear didn't finish connecting. Try again, and check the Linear OAuth app settings if it keeps failing."
  ),
  callbackAlert(
    "microsoftEmail",
    "error",
    "Outlook Mail integration failed",
    "Microsoft didn't finish connecting. Try again, and check the Microsoft app permissions if it keeps failing."
  ),
  callbackAlert(
    "microsoftCalendar",
    "error",
    "Microsoft Calendar integration failed",
    "Microsoft didn't finish connecting. Try again, and check the Microsoft app permissions if it keeps failing."
  ),
  callbackAlert(
    "github",
    "error",
    "GitHub integration failed",
    "GitHub didn't finish installing the app. Try again, and check the GitHub App settings if it keeps failing."
  ),
  callbackAlert(
    "gmail",
    "error",
    "Gmail integration failed",
    "Google didn't finish connecting. Try again, and check the Google OAuth app settings if it keeps failing."
  ),
  callbackAlert(
    "googleCalendar",
    "error",
    "Google Calendar integration failed",
    "Google didn't finish connecting. Try again, and check the Google OAuth app settings if it keeps failing."
  ),
]

function callbackAlert(
  integration: IntegrationCallbackIntegration,
  status: VisibleCallbackStatus,
  title: string,
  description: string
) {
  return { description, integration, status, title }
}

export function IntegrationCallbackAlerts() {
  const statuses = useIntegrationCallbackStatuses()

  return integrationCallbackAlerts.map((alert) => (
    <CallbackAlert
      key={`${alert.integration}-${alert.status}`}
      alert={alert}
      visibleStatus={statuses[alert.integration]}
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
