import { ConsolePage } from "../page"
import { RunsList } from "./list"

export function Runs() {
  return (
    <ConsolePage>
      {(organization) => <RunsList tenantId={organization.id} />}
    </ConsolePage>
  )
}
