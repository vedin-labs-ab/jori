import { type AutomationEventIntegration } from "@contracts/automations/events"
import { useQuery } from "convex/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "../../../../../../convex/_generated/api"
import {
  type AutomationScope,
  getAutomationSurfaceLabel,
} from "../../../access"
import { SurfaceLogo } from "../../../access/logo"
import { type EventIntegrationOption, getIntegrationOptions } from "."

export function EventIntegrationField({
  onValueChange,
  organizationId,
  scope,
  value,
}: {
  onValueChange: (integration: AutomationEventIntegration) => void
  organizationId: string
  scope: AutomationScope
  value: AutomationEventIntegration
}) {
  const connections = useQuery(api.automations.connections.list, {
    organizationId,
    kind: scope === "personal" ? "person" : "organization",
  })
  const options = getIntegrationOptions(connections)

  return (
    <Select
      onValueChange={(integration) =>
        onValueChange(integration as AutomationEventIntegration)
      }
      value={value}
    >
      <SelectTrigger id="automation-event-integration" className="w-full">
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
  integration: AutomationEventIntegration
}) {
  return (
    <span className="pointer-events-none flex min-w-0 items-center gap-1.5">
      <SurfaceLogo integration={integration} />
      <span className="truncate">{getAutomationSurfaceLabel(integration)}</span>
    </span>
  )
}

function IntegrationSelectItem({ option }: { option: EventIntegrationOption }) {
  return (
    <span className="pointer-events-none flex min-w-0 flex-1 items-center justify-between gap-3 pr-5">
      <span className="flex min-w-0 items-center gap-2">
        <SurfaceLogo integration={option.integration} />
        <span className="truncate">
          {getAutomationSurfaceLabel(option.integration)}
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
