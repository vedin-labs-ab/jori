import { type JobEventParameter } from "@contracts/jobs/events"
import { Input } from "@/components/ui/input"
import { IntegrationOptionPicker } from "@/console/integrations/options"
import { cn } from "@/lib/utils"

export function EventParameterControl({
  organizationId,
  parameter,
  parameters,
  values,
  id,
  className,
  onValueChange,
}: {
  organizationId: string
  parameter: JobEventParameter
  parameters: readonly JobEventParameter[]
  values: Record<string, string>
  id: string
  className?: string
  onValueChange: (value: string) => void
}) {
  const value = values[parameter.key] ?? ""

  if (parameter.type === "option") {
    const dependencyLabel = missingDependencyLabel(
      parameter,
      parameters,
      values
    )

    return (
      <IntegrationOptionPicker
        ariaLabel={parameter.label}
        className={cn("w-full", className)}
        clearLabel={`Clear ${parameter.label}`}
        disabled={dependencyLabel !== undefined}
        emptyLabel="No options found."
        id={id}
        match={values}
        onChange={(option) => onValueChange(option?.value ?? "")}
        placeholder={
          dependencyLabel === undefined
            ? parameter.placeholder
            : `Choose ${dependencyLabel} first`
        }
        source={parameter.source}
        organizationId={organizationId}
        value={value === "" ? null : { label: value, value }}
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
      value={value}
    />
  )
}

function missingDependencyLabel(
  parameter: Extract<JobEventParameter, { type: "option" }>,
  parameters: readonly JobEventParameter[],
  values: Record<string, string>
) {
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
