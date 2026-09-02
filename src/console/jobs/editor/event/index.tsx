import {
  getDefaultJobEvent,
  getJobEventDefinition,
  type JobEventDefinition,
  type JobEventIntegration,
  jobEventCatalog,
} from "@contracts/jobs/events"
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
import { type JobFormValues } from "../../types"
import { EventIntegrationField } from "./options/field"
import { EventScopeFields } from "./scope"

export function EventFields({
  organizationId,
  onValuesChange,
  values,
}: {
  organizationId: string
  onValuesChange: (values: JobFormValues) => void
  values: JobFormValues
}) {
  const events = getEventDefinitions(values.eventIntegration)
  const selectedEvent = getSelectedEvent(values.eventIntegration, values.event)
  const hasMultipleEvents = events.length > 1

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label htmlFor="job-event-integration">Integration</Label>
          <EventIntegrationField
            organizationId={organizationId}
            scope={values.scope}
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
          <Label htmlFor="job-event-name">Event</Label>
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
            <SelectTrigger id="job-event-name" className="w-full">
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
        organizationId={organizationId}
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
  organizationId,
  integration,
  event,
  onValuesChange,
  values,
}: {
  organizationId: string
  integration: JobEventIntegration
  event: JobEventDefinition
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
        organizationId={organizationId}
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
  integration: JobEventIntegration
  onValuesChange: (values: JobFormValues) => void
  values: JobFormValues
}) {
  const event = getDefaultJobEvent(integration)

  onValuesChange({
    ...values,
    eventIntegration: integration,
    event: event.value,
    eventMatch: {},
  })
}

function getEventDefinitions(integration: JobEventIntegration) {
  return (
    jobEventCatalog.find((definition) => definition.integration === integration)
      ?.events ?? [getDefaultJobEvent(integration)]
  )
}

function getSelectedEvent(integration: JobEventIntegration, event: string) {
  return (
    getJobEventDefinition(integration, event) ?? getDefaultJobEvent(integration)
  )
}
