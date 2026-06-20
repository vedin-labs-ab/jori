import {
  type AutomationEventDefinition,
  type AutomationEventIntegration,
  automationEventCatalog,
  getAutomationEventDefinition,
  getDefaultAutomationEvent,
} from "@contracts/automations/events"
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
import { type AutomationFormValues } from "../../types"
import { EventIntegrationField } from "./options/field"
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
  const events = getEventDefinitions(values.eventIntegration)
  const selectedEvent = getSelectedEvent(values.eventIntegration, values.event)
  const hasMultipleEvents = events.length > 1

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label htmlFor="automation-event-integration">Integration</Label>
          <EventIntegrationField
            tenantId={tenantId}
            value={values.eventIntegration}
            onValueChange={(integration) =>
              onIntegrationChange({
                integration,
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
                eventMatch: {},
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
        integration={values.eventIntegration}
        event={selectedEvent}
        onValuesChange={(eventMatch) =>
          onValuesChange({ ...values, eventMatch })
        }
        values={values.eventMatch}
      />
    </div>
  )
}

function EventParameterFields({
  tenantId,
  integration,
  event,
  onValuesChange,
  values,
}: {
  tenantId: string
  integration: AutomationEventIntegration
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
        key={`${integration}:${event.value}`}
        tenantId={tenantId}
        integration={integration}
        event={event}
        onValuesChange={onValuesChange}
        values={values}
      />
    </div>
  )
}

function onIntegrationChange({
  integration,
  onValuesChange,
  values,
}: {
  integration: AutomationEventIntegration
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
}) {
  const event = getDefaultAutomationEvent(integration)

  onValuesChange({
    ...values,
    eventIntegration: integration,
    event: event.value,
    eventMatch: {},
  })
}

function getEventDefinitions(integration: AutomationEventIntegration) {
  return (
    automationEventCatalog.find(
      (definition) => definition.integration === integration
    )?.events ?? [getDefaultAutomationEvent(integration)]
  )
}

function getSelectedEvent(
  integration: AutomationEventIntegration,
  event: string
) {
  return (
    getAutomationEventDefinition(integration, event) ??
    getDefaultAutomationEvent(integration)
  )
}
