import { type JobEventParameter } from "@contracts/jobs/events"
import { IntegrationOptionPicker } from "@/console/integrations/options"
import { cn } from "@/lib/utils"

type EventOptionFieldProps = {
  organizationId: string
  parameter: Extract<JobEventParameter, { type: "option" }>
  match: Record<string, string>
  disabled: boolean
  disabledMessage: string | undefined
  id: string
  className?: string
  value: string
  onValueChange: (value: string) => void
}

export function EventOptionField({
  organizationId,
  parameter,
  match,
  disabled,
  disabledMessage,
  id,
  className,
  value,
  onValueChange,
}: EventOptionFieldProps) {
  const selected = value === "" ? null : { label: value, value }

  return (
    <IntegrationOptionPicker
      ariaLabel={parameter.label}
      className={cn("w-full", className)}
      clearLabel={`Clear ${parameter.label}`}
      disabled={disabled}
      emptyLabel="No options found."
      id={id}
      match={match}
      onChange={(option) => onValueChange(option?.value ?? "")}
      placeholder={
        disabled
          ? (disabledMessage ?? parameter.placeholder)
          : parameter.placeholder
      }
      source={parameter.source}
      organizationId={organizationId}
      value={selected}
    />
  )
}
