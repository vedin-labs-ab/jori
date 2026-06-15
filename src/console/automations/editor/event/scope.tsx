import {
  type AutomationEventDefinition,
  type AutomationEventIntegration,
  type AutomationEventParameter,
} from "@contracts/automations/events"
import { Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { applyEventCriteriaChange, removeEventCriterion } from "./criteria"
import { EventParameterControl } from "./parameter"

export function EventScopeFields({
  tenantId,
  provider,
  event,
  onValuesChange,
  values,
}: {
  tenantId: string
  provider: AutomationEventIntegration
  event: AutomationEventDefinition
  onValuesChange: (values: Record<string, string>) => void
  values: Record<string, string>
}) {
  const parameters = event.parameters ?? []
  const requiredParameters = parameters.filter(
    (parameter) => parameter.required
  )
  const conditions = parameters.filter((parameter) => !parameter.required)
  const [addedKeys, setAddedKeys] = useState(() =>
    conditionKeysWithValues(conditions, values)
  )

  if (parameters.length === 0) {
    return null
  }

  const visibleConditions = conditions.filter((condition) =>
    addedKeys.includes(condition.key)
  )
  const availableConditions = conditions.filter(
    (condition) => !addedKeys.includes(condition.key)
  )
  const visibleParameters = [...requiredParameters, ...visibleConditions]

  function addCondition(key: string) {
    setAddedKeys((keys) => (keys.includes(key) ? keys : [...keys, key]))
  }

  function removeCondition(key: string) {
    setAddedKeys((keys) => keys.filter((addedKey) => addedKey !== key))
    onValuesChange(removeEventCriterion({ key, parameters, values }))
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleParameters.map((parameter) => (
        <ScopeField
          key={parameter.key}
          tenantId={tenantId}
          provider={provider}
          parameter={parameter}
          parameters={parameters}
          removable={addedKeys.includes(parameter.key)}
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
          onRemove={() => removeCondition(parameter.key)}
        />
      ))}
      {availableConditions.length > 0 ? (
        <div className="grid gap-2">
          <span className="font-medium text-muted-foreground text-xs/relaxed leading-none">
            Condition
          </span>
          <AddConditionMenu
            available={availableConditions}
            onAdd={addCondition}
          />
        </div>
      ) : null}
    </div>
  )
}

function AddConditionMenu({
  available,
  onAdd,
}: {
  available: readonly AutomationEventParameter[]
  onAdd: (key: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          type="button"
          variant="outline"
        >
          <Plus />
          Add condition
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[70] w-72">
        {available.map((parameter) => (
          <DropdownMenuItem
            key={parameter.key}
            onSelect={() => onAdd(parameter.key)}
          >
            <div className="grid min-w-0 gap-0.5">
              <span>{parameter.label}</span>
              {parameter.description === undefined ? null : (
                <span className="text-muted-foreground">
                  {parameter.description}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ScopeField({
  tenantId,
  provider,
  parameter,
  parameters,
  removable,
  values,
  onValueChange,
  onRemove,
}: {
  tenantId: string
  provider: AutomationEventIntegration
  parameter: AutomationEventParameter
  parameters: readonly AutomationEventParameter[]
  removable: boolean
  values: Record<string, string>
  onValueChange: (value: string) => void
  onRemove: () => void
}) {
  const id = `automation-event-${parameter.key}`
  const controlClassName = removable
    ? "min-w-0 flex-1 basis-0 shrink"
    : undefined
  const control = (
    <EventParameterControl
      tenantId={tenantId}
      provider={provider}
      parameter={parameter}
      parameters={parameters}
      values={values}
      id={id}
      className={controlClassName}
      onValueChange={onValueChange}
    />
  )

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{parameter.label}</Label>
      {removable ? (
        <ButtonGroup
          aria-label={`${parameter.label} condition`}
          className="w-full"
        >
          {control}
          <Button
            aria-label={`Remove ${parameter.label} condition`}
            className="h-auto w-8 shrink-0 self-stretch text-muted-foreground hover:text-foreground"
            onClick={onRemove}
            size="icon"
            type="button"
            variant="outline"
          >
            <X />
          </Button>
        </ButtonGroup>
      ) : (
        control
      )}
      {removable || parameter.description === undefined ? null : (
        <p className="text-muted-foreground text-xs">{parameter.description}</p>
      )}
    </div>
  )
}

function conditionKeysWithValues(
  conditions: readonly AutomationEventParameter[],
  values: Record<string, string>
) {
  return conditions
    .filter((condition) => (values[condition.key] ?? "") !== "")
    .map((condition) => condition.key)
}
