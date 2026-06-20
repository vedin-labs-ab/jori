import {
  type AutomationEventIntegration,
  type AutomationEventParameter,
} from "@contracts/automations/events"
import { Input } from "@/components/ui/input"
import { EventOptionField } from "./resource"

export function EventParameterControl({
  tenantId,
  integration,
  parameter,
  parameters,
  values,
  id,
  className,
  onValueChange,
}: {
  tenantId: string
  integration: AutomationEventIntegration
  parameter: AutomationEventParameter
  parameters: readonly AutomationEventParameter[]
  values: Record<string, string>
  id: string
  className?: string
  onValueChange: (value: string) => void
}) {
  const dependencyLabel = missingDependencyLabel(parameter, parameters, values)

  if (parameter.type === "option") {
    return (
      <EventOptionField
        tenantId={tenantId}
        integration={integration}
        parameter={parameter}
        match={values}
        disabled={dependencyLabel !== undefined}
        disabledMessage={
          dependencyLabel === undefined
            ? undefined
            : `Choose ${dependencyLabel} first`
        }
        id={id}
        className={className}
        value={values[parameter.key] ?? ""}
        onValueChange={onValueChange}
      />
    )
  }

  return (
    <Input
      id={id}
      className={className}
      min={parameter.type === "number" ? parameter.min : undefined}
      max={parameter.type === "number" ? parameter.max : undefined}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={parameter.placeholder}
      step={parameter.type === "number" ? parameter.step : undefined}
      type={parameter.type}
      value={values[parameter.key] ?? ""}
    />
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
