import { Layers } from "lucide-react"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { ContextPage } from ".."

export function ContextWorkstreams() {
  return (
    <ContextPage tab="workstreams">
      {() => (
        <ConsoleEmptyState
          className="border"
          description="Workstreams will be available in a future update."
          icon={Layers}
          title="Coming soon"
        />
      )}
    </ContextPage>
  )
}
