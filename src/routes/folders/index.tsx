import { createFileRoute } from "@tanstack/react-router"
import { FoldersOverview } from "./-overview"

export const Route = createFileRoute("/folders/")({
  component: FoldersOverview,
})
