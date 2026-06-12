import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type AutomationEventDefinition,
  type AutomationEventProvider,
  automationEventCatalog,
  getAutomationEventDefinition,
  getDefaultAutomationEvent,
} from "../../../convex/automations/events"
import { EventOptionField } from "./resource"
import { getAutomationSurfaceLabel } from "./surfaces"
import { type AutomationFormValues } from "./types"

export function EventFields({
  tenantId,
  onValuesChange,
  values,
}: {
  tenantId: string
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
}) {
  const events = getEventDefinitions(values.eventProvider)
  const selectedEvent = getSelectedEvent(values.eventProvider, values.event)

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label htmlFor="automation-event-provider">Provider</Label>
          <Select
            onValueChange={(provider) =>
              onProviderChange({
                provider: provider as AutomationEventProvider,
                onValuesChange,
                values,
              })
            }
            value={values.eventProvider}
          >
            <SelectTrigger id="automation-event-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {automationEventCatalog.map((definition) => (
                <SelectItem
                  key={definition.provider}
                  value={definition.provider}
                >
                  {getAutomationSurfaceLabel(definition.provider)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="automation-event-name">Event</Label>
          <Select
            onValueChange={(event) =>
              onValuesChange({
                ...values,
                event,
                eventResource: "",
              })
            }
            value={selectedEvent.value}
          >
            <SelectTrigger id="automation-event-name" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {events.map((definition) => (
                <SelectItem key={definition.value} value={definition.value}>
                  {definition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <EventResourceField
        tenantId={tenantId}
        provider={values.eventProvider}
        event={selectedEvent}
        onValueChange={(eventResource) =>
          onValuesChange({ ...values, eventResource })
        }
        value={values.eventResource}
      />
    </div>
  )
}

function EventResourceField({
  tenantId,
  provider,
  event,
  onValueChange,
  value,
}: {
  tenantId: string
  provider: AutomationEventProvider
  event: AutomationEventDefinition
  onValueChange: (value: string) => void
  value: string
}) {
  const resource = event.resource

  if (resource === undefined) {
    return <p className="text-muted-foreground text-xs">{event.description}</p>
  }

  if (resource.type === "option") {
    return (
      <div className="grid gap-2">
        <Label htmlFor="automation-event-resource">{resource.label}</Label>
        <EventOptionField
          tenantId={tenantId}
          provider={provider}
          resource={resource}
          value={value}
          onValueChange={onValueChange}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="automation-event-resource">{resource.label}</Label>
      <Input
        id="automation-event-resource"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={resource.placeholder}
        value={value}
      />
    </div>
  )
}

function onProviderChange({
  provider,
  onValuesChange,
  values,
}: {
  provider: AutomationEventProvider
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
}) {
  const event = getDefaultAutomationEvent(provider)

  onValuesChange({
    ...values,
    eventProvider: provider,
    event: event.value,
    eventResource: "",
  })
}

function getEventDefinitions(provider: AutomationEventProvider) {
  return (
    automationEventCatalog.find(
      (definition) => definition.provider === provider
    )?.events ?? [getDefaultAutomationEvent(provider)]
  )
}

function getSelectedEvent(provider: AutomationEventProvider, event: string) {
  return (
    getAutomationEventDefinition(provider, event) ??
    getDefaultAutomationEvent(provider)
  )
}
