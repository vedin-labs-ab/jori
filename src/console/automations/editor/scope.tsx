import { Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
    <div className="grid gap-3">
      <Separator />
      <div className="grid gap-3">
        <ScopeHeader
          available={conditions.filter(
            (condition) => !addedKeys.includes(condition.key)
          )}
          hasConditions={conditions.length > 0}
          onAdd={(key) => setAddedKeys((keys) => [...keys, key])}
        />
        <ScopeFieldGrid
          tenantId={tenantId}
          provider={provider}
          parameters={[...requiredParameters, ...visibleConditions]}
          allParameters={parameters}
          removableKeys={addedKeys}
          values={values}
          onValuesChange={onValuesChange}
          onRemove={(key) => {
            setAddedKeys((keys) => keys.filter((addedKey) => addedKey !== key))
            onValuesChange(removeEventCriterion({ key, parameters, values }))
          }}
        />
      </div>
    </div>
  )
}

function ScopeHeader({
  available,
  hasConditions,
  onAdd,
}: {
  available: readonly AutomationEventParameter[]
  hasConditions: boolean
  onAdd: (key: string) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="grid gap-0.5">
        <h3 className="font-medium text-xs">Scope</h3>
        <p className="text-muted-foreground text-xs">
          Set where this event applies.
        </p>
      </div>
      {hasConditions ? (
        <AddConditionMenu available={available} onAdd={onAdd} />
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
          className="shrink-0"
          disabled={available.length === 0}
          type="button"
          variant="secondary"
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
  removableKeys,
  values,
  onValuesChange,
  onRemove,
}: {
  tenantId: string
  provider: AutomationEventProvider
  parameters: readonly AutomationEventParameter[]
  allParameters: readonly AutomationEventParameter[]
  removableKeys: readonly string[]
  values: Record<string, string>
  onValuesChange: (values: Record<string, string>) => void
  onRemove: (key: string) => void
}) {
  if (parameters.length === 0) {
    return null
  }

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

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{parameter.label}</Label>
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <EventParameterControl
            tenantId={tenantId}
            provider={provider}
            parameter={parameter}
            parameters={parameters}
            values={values}
            id={id}
            onValueChange={onValueChange}
          />
        </div>
        {removable ? (
          <Button
            aria-label={`Remove ${parameter.label} condition`}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        ) : null}
      </div>
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
