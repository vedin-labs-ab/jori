import { createFileRoute } from "@tanstack/react-router"
import { Playbooks } from "@/console/playbooks"
import { consoleDocumentTitle } from "@/console/shell/routes"

export const Route = createFileRoute("/playbooks")({
  component: Playbooks,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/playbooks") }] }),
})
