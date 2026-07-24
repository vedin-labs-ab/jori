import { createFileRoute } from "@tanstack/react-router"
import { Apps } from "@/console/apps"

export const Route = createFileRoute("/apps/")({
  component: Apps,
})
