import { playbookCatalog } from "@contracts/playbooks/catalog"
import { useQuery } from "convex/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../convex/_generated/api"
import { useAutomationEditorHost } from "../automations/editor/host"
import { ConsolePage } from "../page"
import { ConsoleContentGrid, ConsolePageLayout } from "../shared/layout"
import { PlaybookCard } from "./card"
import { usePlaybookActions } from "./enable"

export function Playbooks() {
  return (
    <ConsolePage>
      {(organization) => <PlaybookCatalog tenantId={organization.id} />}
    </ConsolePage>
  )
}

function PlaybookCatalog({ tenantId }: { tenantId: string }) {
  const list = useQuery(api.playbooks.console.list, { tenantId })
  const editorHost = useAutomationEditorHost(tenantId)
  const actions = usePlaybookActions(tenantId, editorHost)

  if (list?.status === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Playbooks unavailable</AlertTitle>
        <AlertDescription>{list.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <ConsolePageLayout>
      <ConsoleContentGrid className="max-w-4xl md:grid-cols-2">
        {playbookCatalog.map((definition) => (
          <PlaybookCard
            key={definition.key}
            actions={actions}
            definition={definition}
            row={list?.playbooks.find((row) => row.key === definition.key)}
          />
        ))}
      </ConsoleContentGrid>
      {editorHost.dialog}
    </ConsolePageLayout>
  )
}
