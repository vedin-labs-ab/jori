import { Workflow, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DetailRow } from "../runs/row/details"
import { ExecutionToolsValue } from "../runs/row/groups"
import { automationSummary, type CapabilityGroup } from "./format"
import { type ArtifactSummary } from "./types"

export function ArtifactExpanded({
  automations,
  capabilityGroups,
  now,
}: {
  automations: ArtifactSummary["automations"]
  capabilityGroups: CapabilityGroup[]
  now: number
}) {
  return (
    <div>
      <DetailRow
        icon={Wrench}
        iconClassName="text-muted-foreground"
        label="Tools"
      >
        <ArtifactToolsValue groups={capabilityGroups} />
      </DetailRow>
      <DetailRow
        icon={Workflow}
        iconClassName="text-muted-foreground"
        label="Automations"
      >
        <AutomationChips automations={automations} now={now} />
      </DetailRow>
    </div>
  )
}

function ArtifactToolsValue({ groups }: { groups: CapabilityGroup[] }) {
  if (groups.length === 0) {
    return <EmptyDetailValue>No artifact tools</EmptyDetailValue>
  }

  return (
    <ExecutionToolsValue
      description="Tools granted to this artifact."
      groups={groups}
    />
  )
}

function AutomationChips({
  automations,
  now,
}: {
  automations: ArtifactSummary["automations"]
  now: number
}) {
  if (automations.length === 0) {
    return <EmptyDetailValue>No artifact automations</EmptyDetailValue>
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {automations.map((automation) => (
        <Badge
          className="h-7 gap-2 rounded-md px-2.5 font-normal"
          key={automation.automationId}
          variant="outline"
        >
          <span className="font-medium text-foreground">
            {automation.name ?? "Automation"}
          </span>
          <span className="text-muted-foreground">
            {automationSummary(automation, now)}
          </span>
        </Badge>
      ))}
    </div>
  )
}

function EmptyDetailValue({ children }: { children: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted px-2.5 py-2 text-muted-foreground text-xs">
      {children}
    </div>
  )
}
