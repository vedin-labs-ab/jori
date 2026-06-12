import { Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
} from "../../../../convex/automations/events"
import { type AutomationFormValues } from "../types"
import { EventProviderField } from "./provider/field"
import { EventScopeFields } from "./scope"

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
  const hasMultipleEvents = events.length > 1

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label htmlFor="automation-event-provider">Integration</Label>
          <EventProviderField
            tenantId={tenantId}
            value={values.eventProvider}
            onValueChange={(provider) =>
              onProviderChange({
                provider,
                onValuesChange,
                values,
              })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="automation-event-name">Event</Label>
          <Select
            disabled={!hasMultipleEvents}
            onValueChange={(event) =>
              onValuesChange({
                ...values,
                event,
                eventCriteria: {},
              })
            }
            value={selectedEvent.value}
          >
            <SelectTrigger id="automation-event-name" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[70]">
              {events.map((definition) => (
                <SelectItem key={definition.value} value={definition.value}>
                  {definition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <EventParameterFields
        tenantId={tenantId}
        provider={values.eventProvider}
        event={selectedEvent}
        onValuesChange={(eventCriteria) =>
          onValuesChange({ ...values, eventCriteria })
        }
        values={values.eventCriteria}
      />
    </div>
  )
}

function EventParameterFields({
  tenantId,
  provider,
  event,
  onValuesChange,
  values,
}: {
  tenantId: string
  provider: AutomationEventProvider
  event: AutomationEventDefinition
  onValuesChange: (values: Record<string, string>) => void
  values: Record<string, string>
}) {
  return (
    <div className="grid gap-3">
      {event.availability.status === "pending" ? (
        <Alert className="py-2">
          <Info className="size-4" />
          <AlertDescription className="text-xs">
            {event.availability.message}
          </AlertDescription>
        </Alert>
      ) : null}
      <EventScopeFields
        key={`${provider}:${event.value}`}
        tenantId={tenantId}
        provider={provider}
        event={event}
        onValuesChange={onValuesChange}
        values={values}
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
    eventCriteria: {},
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
