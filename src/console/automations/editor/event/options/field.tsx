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
import { getAutomationSurfaceLabel } from "../../../access"
import { SurfaceLogo } from "../../../access/logo"
import { type EventIntegrationOption, getIntegrationOptions } from "."

export function EventIntegrationField({
  onValueChange,
  tenantId,
  value,
}: {
  onValueChange: (provider: AutomationEventIntegration) => void
  tenantId: string
  value: AutomationEventIntegration
}) {
  const connections = useQuery(api.automations.console.eventIntegrations, {
    tenantId,
  })
  const options = getIntegrationOptions(connections)

  return (
    <Select
      onValueChange={(provider) =>
        onValueChange(provider as AutomationEventIntegration)
      }
      value={value}
    >
      <SelectTrigger id="automation-event-provider" className="w-full">
        <SelectValue>
          <IntegrationSelectValue provider={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[70]">
        {options.map((option) => (
          <SelectItem
            disabled={option.connected === false}
            key={option.provider}
            value={option.provider}
          >
            <IntegrationSelectItem option={option} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function IntegrationSelectValue({
  provider,
}: {
  provider: AutomationEventIntegration
}) {
  return (
    <span className="pointer-events-none flex min-w-0 items-center gap-1.5">
      <SurfaceLogo provider={provider} />
      <span className="truncate">{getAutomationSurfaceLabel(provider)}</span>
    </span>
  )
}

function IntegrationSelectItem({ option }: { option: EventIntegrationOption }) {
  return (
    <span className="pointer-events-none flex min-w-0 flex-1 items-center justify-between gap-3 pr-5">
      <span className="flex min-w-0 items-center gap-2">
        <SurfaceLogo provider={option.provider} />
        <span className="truncate">
          {getAutomationSurfaceLabel(option.provider)}
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
