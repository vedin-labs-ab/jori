import { createFileRoute } from "@tanstack/react-router"
import { FilesPage } from "@/console/files"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/files")({
  component: FilesPage,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/files") }] }),
})
