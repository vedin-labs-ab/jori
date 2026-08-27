import { createFileRoute } from "@tanstack/react-router"
import { StoresPage } from "@/console/stores"

export const Route = createFileRoute("/stores/")({
  component: StoresPage,
})
