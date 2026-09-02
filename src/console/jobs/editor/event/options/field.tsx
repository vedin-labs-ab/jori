import { type JobEventIntegration } from "@contracts/jobs/events"
import { useQuery } from "convex/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getJobSurfaceLabel, type JobScope } from "@/shared/console/jobs/access"
import { ProviderLogo } from "@/shared/logo/provider"
import { api } from "../../../../../../convex/_generated/api"
import { type EventIntegrationOption, getIntegrationOptions } from "."

export function EventIntegrationField({
  onValueChange,
  organizationId,
  scope,
  value,
}: {
  onValueChange: (integration: JobEventIntegration) => void
  organizationId: string
  scope: JobScope
  value: JobEventIntegration
}) {
  const connections = useQuery(api.jobs.connections.list, {
    organizationId,
    kind: scope === "personal" ? "person" : "organization",
  })
  const options = getIntegrationOptions(connections)

  return (
    <Select
      onValueChange={(integration) =>
        onValueChange(integration as JobEventIntegration)
      }
      value={value}
    >
      <SelectTrigger id="job-event-integration" className="w-full">
        <SelectValue>
          <IntegrationSelectValue integration={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[70]">
        {options.map((option) => (
          <SelectItem
            disabled={option.connected === false}
            key={option.integration}
            value={option.integration}
          >
            <IntegrationSelectItem option={option} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function IntegrationSelectValue({
  integration,
}: {
  integration: JobEventIntegration
}) {
  return (
    <span className="pointer-events-none flex min-w-0 items-center gap-1.5">
      <ProviderLogo className="size-3.5" surface={integration} />
      <span className="truncate">{getJobSurfaceLabel(integration)}</span>
    </span>
  )
}

function IntegrationSelectItem({ option }: { option: EventIntegrationOption }) {
  return (
    <span className="pointer-events-none flex min-w-0 flex-1 items-center justify-between gap-3 pr-5">
      <span className="flex min-w-0 items-center gap-2">
        <ProviderLogo className="size-3.5" surface={option.integration} />
        <span className="truncate">
          {getJobSurfaceLabel(option.integration)}
        </span>
      </span>
      {option.connected === false ? (
        <span className="shrink-0 text-muted-foreground text-[0.625rem]">
          Not connected
        </span>
      ) : null}
    </span>
  )
}
