import { createFileRoute, Outlet } from "@tanstack/react-router"
import { PublicConsoleFrame } from "@/console/shell/public"

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
  head: () => ({ meta: [{ title: "Milo · Settings" }] }),
})

function SettingsLayout() {
  return (
    <PublicConsoleFrame isSignedIn>
      <Outlet />
    </PublicConsoleFrame>
  )
}
