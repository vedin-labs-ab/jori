import { createFileRoute } from "@tanstack/react-router"
import { FilesPage } from "@/console/files"

export const Route = createFileRoute("/_workspace/files/")({
  component: FilesPage,
})
