import { ConsolePage } from "../page"
import { ExecutionsList } from "./list"

export function Executions() {
  return (
    <ConsolePage>
      {(organization) => <ExecutionsList tenantId={organization.id} />}
    </ConsolePage>
  )
}
