import { playbookCatalog } from "@contracts/playbooks/catalog"
import { useQuery } from "convex/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
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
  const actions = usePlaybookActions(tenantId)

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
      <div className="grid gap-4 md:grid-cols-2">
        {playbookCatalog.map((definition) => (
          <PlaybookCard
            key={definition.key}
            actions={actions}
            definition={definition}
            row={list?.playbooks.find((row) => row.key === definition.key)}
          />
        ))}
      </div>
    </ConsolePageLayout>
  )
}
