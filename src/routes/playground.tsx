import { createFileRoute } from "@tanstack/react-router"
import { Playground } from "@/console/playground"

export const Route = createFileRoute("/playground")({
  component: Playground,
})
