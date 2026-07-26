import { useEffect } from "react"
import { toast } from "sonner"

const integrationCallbackToasts = [
  callbackToast(
    "slack",
    "connected",
    "Slack connected",
    "Jori can now respond to mentions and search context in your Slack workspace."
  ),
  callbackToast(
    "linear",
    "connected",
    "Linear connected",
    "Jori can now respond to mentions and comment on Linear issues."
  ),
  callbackToast(
    "microsoftEmail",
    "connected",
    "Outlook Mail connected",
    "Jori can now work with your Outlook mail when you ask."
  ),
  callbackToast(
    "microsoftCalendar",
    "connected",
    "Microsoft Calendar connected",
    "Jori can now work with your Microsoft calendar when you ask."
  ),
  callbackToast(
    "github",
    "connected",
    "GitHub connected",
    "Jori can now respond to mentions in GitHub issues and pull requests."
  ),
  callbackToast(
    "gmail",
    "connected",
    "Gmail connected",
    "Jori can now work with your Gmail when you ask."
  ),
  callbackToast(
    "googleCalendar",
    "connected",
    "Google Calendar connected",
    "Jori can now work with your Google Calendar when you ask."
  ),
  callbackToast(
    "notion",
    "connected",
    "Notion connected",
    "Jori can now work with the Notion pages and databases you share."
  ),
  callbackToast(
    "slack",
    "error",
    "Slack integration failed",
    "Slack didn't finish connecting. Try again, and check the Slack app's OAuth settings if it keeps failing."
  ),
  callbackToast(
    "linear",
    "error",
    "Linear integration failed",
    "Linear didn't finish connecting. Try again, and check the Linear OAuth app settings if it keeps failing."
  ),
  callbackToast(
    "microsoftEmail",
    "error",
    "Outlook Mail integration failed",
    "Microsoft didn't finish connecting. Try again, and check the Microsoft app permissions if it keeps failing."
  ),
  callbackToast(
    "microsoftCalendar",
    "error",
    "Microsoft Calendar integration failed",
    "Microsoft didn't finish connecting. Try again, and check the Microsoft app permissions if it keeps failing."
  ),
  callbackToast(
    "github",
    "error",
    "GitHub integration failed",
    "GitHub didn't finish installing the app. Try again, and check the GitHub App settings if it keeps failing."
  ),
  callbackToast(
    "gmail",
    "error",
    "Gmail integration failed",
    "Google didn't finish connecting. Try again, and check the Google OAuth app settings if it keeps failing."
  ),
  callbackToast(
    "googleCalendar",
    "error",
    "Google Calendar integration failed",
    "Google didn't finish connecting. Try again, and check the Google OAuth app settings if it keeps failing."
  ),
  callbackToast(
    "notion",
    "error",
    "Notion integration failed",
    "Notion didn't finish connecting. Try again, and check the Notion integration settings if it keeps failing."
  ),
]

function callbackToast(
  integration: string,
  status: "connected" | "error",
  title: string,
  description: string
) {
  return { description, integration, status, title }
}

export function IntegrationCallbackToasts() {
  useEffect(showIntegrationCallbackToasts, [])

  return null
}

function showIntegrationCallbackToasts() {
  const url = new URL(window.location.href)
  const callbacks = integrationCallbackToasts.filter(
    (callback) => url.searchParams.get(callback.integration) === callback.status
  )

  if (callbacks.length === 0) {
    return
  }

  for (const callback of callbacks) {
    const show = callback.status === "connected" ? toast.success : toast.error

    show(callback.title, {
      description: callback.description,
      id: `${callback.integration}-${callback.status}`,
    })
    url.searchParams.delete(callback.integration)
  }

  window.history.replaceState(window.history.state, "", url)
}
