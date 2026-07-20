import { ConsolePage } from "../page"
import { RunsList } from "./list"

export function Runs() {
  return (
    <ConsolePage>
      {(organizationId) => <RunsList organizationId={organizationId} />}
    </ConsolePage>
  )
}
