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
import {
  type AutomationEventDefinition,
  type AutomationEventParameter,
  type AutomationEventProvider,
} from "../../../../convex/automations/events"
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
  provider: AutomationEventProvider
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

  return (
    <ScopeFieldGrid
      tenantId={tenantId}
      provider={provider}
      parameters={[...requiredParameters, ...visibleConditions]}
      allParameters={parameters}
      availableConditions={conditions.filter(
        (condition) => !addedKeys.includes(condition.key)
      )}
      removableKeys={addedKeys}
      values={values}
      onAdd={(key) => setAddedKeys((keys) => [...keys, key])}
      onValuesChange={onValuesChange}
      onRemove={(key) => {
        setAddedKeys((keys) => keys.filter((addedKey) => addedKey !== key))
        onValuesChange(removeEventCriterion({ key, parameters, values }))
      }}
    />
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
          disabled={available.length === 0}
          type="button"
          size="lg"
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
            <div className="grid gap-0.5">
              <span>{parameter.label}</span>
              {parameter.description === undefined ? null : (
                <span className="text-muted-foreground text-xs">
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

function ScopeFieldGrid({
  tenantId,
  provider,
  parameters,
  allParameters,
  availableConditions,
  removableKeys,
  values,
  onAdd,
  onValuesChange,
  onRemove,
}: {
  tenantId: string
  provider: AutomationEventProvider
  parameters: readonly AutomationEventParameter[]
  allParameters: readonly AutomationEventParameter[]
  availableConditions: readonly AutomationEventParameter[]
  removableKeys: readonly string[]
  values: Record<string, string>
  onAdd: (key: string) => void
  onValuesChange: (values: Record<string, string>) => void
  onRemove: (key: string) => void
}) {
  if (parameters.length === 0 && availableConditions.length === 0) {
    return null
  }

  const hasVisibleScopeFields = parameters.length > 0

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {parameters.map((parameter) => (
        <ScopeField
          key={parameter.key}
          tenantId={tenantId}
          provider={provider}
          parameter={parameter}
          parameters={allParameters}
          removable={removableKeys.includes(parameter.key)}
          values={values}
          onValueChange={(value) =>
            onValuesChange(
              applyEventCriteriaChange({
                key: parameter.key,
                parameters: allParameters,
                value,
                values,
              })
            )
          }
          onRemove={() => onRemove(parameter.key)}
        />
      ))}
      {availableConditions.length > 0 ? (
        <div className="grid gap-2">
          {hasVisibleScopeFields ? (
            <span
              aria-hidden="true"
              className="invisible font-medium text-xs/relaxed leading-none"
            >
              Condition
            </span>
          ) : (
            <span className="font-medium text-muted-foreground text-xs/relaxed leading-none">
              Conditions
            </span>
          )}
          <AddConditionMenu available={availableConditions} onAdd={onAdd} />
        </div>
      ) : null}
    </div>
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
  provider: AutomationEventProvider
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
