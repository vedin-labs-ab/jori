import { createFileRoute } from "@tanstack/react-router"
import { Settings } from "@/components/auth/settings/settings"

export const Route = createFileRoute("/settings/$view")({
  component: SettingsView,
})

function SettingsView() {
  const { view } = Route.useParams()

  return <Settings path={view} />
}
