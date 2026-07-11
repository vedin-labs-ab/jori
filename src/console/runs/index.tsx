import { ConsolePage } from "../page"
import { RunsList } from "./list"

export function Runs() {
  return (
    <ConsolePage>{(tenantId) => <RunsList tenantId={tenantId} />}</ConsolePage>
  )
}
