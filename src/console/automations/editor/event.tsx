import { Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  type AutomationEventParameter,
  type AutomationEventProvider,
  automationEventCatalog,
  getAutomationEventDefinition,
  getDefaultAutomationEvent,
} from "../../../../convex/automations/events"
import { type AutomationFormValues } from "../types"
import { applyEventCriteriaChange } from "./criteria"
import { EventProviderField } from "./provider/field"
import { EventOptionField } from "./resource"

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
          <Label htmlFor="automation-event-provider">Provider</Label>
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
  const parameters = event.parameters ?? []

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <p className="text-muted-foreground text-xs">{event.description}</p>
        {event.availability.status === "pending" ? (
          <Alert className="py-2">
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              {event.availability.message}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
      {parameters.length === 0 ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          {parameters.map((parameter) => (
            <EventParameterField
              key={parameter.key}
              tenantId={tenantId}
              provider={provider}
              parameter={parameter}
              parameters={parameters}
              values={values}
              onValueChange={(value) =>
                onValuesChange(
                  applyEventCriteriaChange({
                    key: parameter.key,
                    parameters,
                    value,
                    values,
                  })
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventParameterField({
  tenantId,
  provider,
  parameter,
  parameters,
  values,
  onValueChange,
}: {
  tenantId: string
  provider: AutomationEventProvider
  parameter: AutomationEventParameter
  parameters: readonly AutomationEventParameter[]
  values: Record<string, string>
  onValueChange: (value: string) => void
}) {
  const id = `automation-event-${parameter.key}`
  const dependencyLabel = missingDependencyLabel(parameter, parameters, values)

  if (parameter.type === "option") {
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>{parameter.label}</Label>
        <EventOptionField
          tenantId={tenantId}
          provider={provider}
          parameter={parameter}
          criteria={values}
          disabled={dependencyLabel !== undefined}
          disabledMessage={
            dependencyLabel === undefined
              ? undefined
              : `Choose ${dependencyLabel} first`
          }
          id={id}
          value={values[parameter.key] ?? ""}
          onValueChange={onValueChange}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{parameter.label}</Label>
      <Input
        id={id}
        min={parameter.type === "number" ? parameter.min : undefined}
        max={parameter.type === "number" ? parameter.max : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={parameter.placeholder}
        step={parameter.type === "number" ? parameter.step : undefined}
        type={parameter.type}
        value={values[parameter.key] ?? ""}
      />
      {parameter.description === undefined ? null : (
        <p className="text-muted-foreground text-xs">{parameter.description}</p>
      )}
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

function missingDependencyLabel(
  parameter: AutomationEventParameter,
  parameters: readonly AutomationEventParameter[],
  values: Record<string, string>
) {
  if (parameter.type !== "option") {
    return undefined
  }

  const missingKey = parameter.dependsOn?.find(
    (key) => values[key]?.trim() === "" || values[key] === undefined
  )

  if (missingKey === undefined) {
    return undefined
  }

  return (
    parameters.find((candidate) => candidate.key === missingKey)?.label ??
    missingKey
  ).toLowerCase()
}
