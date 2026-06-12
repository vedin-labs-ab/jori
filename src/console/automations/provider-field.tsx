import { useQuery } from "convex/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "../../../convex/_generated/api"
import { type AutomationEventProvider } from "../../../convex/automations/events"
import { SurfaceLogo } from "./logo"
import {
  type EventProviderOption,
  getProviderOptions,
} from "./provider-options"
import { getAutomationSurfaceLabel } from "./surfaces"

export function EventProviderField({
  onValueChange,
  tenantId,
  value,
}: {
  onValueChange: (provider: AutomationEventProvider) => void
  tenantId: string
  value: AutomationEventProvider
}) {
  const connections = useQuery(api.automations.console.eventProviders, {
    tenantId,
  })
  const options = getProviderOptions(connections)

  return (
    <Select
      onValueChange={(provider) =>
        onValueChange(provider as AutomationEventProvider)
      }
      value={value}
    >
      <SelectTrigger id="automation-event-provider" className="w-full">
        <SelectValue>
          <ProviderSelectValue provider={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[70]">
        {options.map((option) => (
          <SelectItem
            disabled={option.connected === false}
            key={option.provider}
            value={option.provider}
          >
            <ProviderSelectItem option={option} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ProviderSelectValue({
  provider,
}: {
  provider: AutomationEventProvider
}) {
  return (
    <span className="pointer-events-none flex min-w-0 items-center gap-1.5">
      <SurfaceLogo provider={provider} />
      <span className="truncate">{getAutomationSurfaceLabel(provider)}</span>
    </span>
  )
}

function ProviderSelectItem({ option }: { option: EventProviderOption }) {
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
