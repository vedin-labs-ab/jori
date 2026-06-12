import {
  type AutomationEventParameter,
  automationEventParameterResetKeys,
} from "../../../convex/automations/events"

export function applyEventCriteriaChange({
  key,
  parameters,
  value,
  values,
}: {
  key: string
  parameters: readonly AutomationEventParameter[]
  value: string
  values: Record<string, string>
}) {
  if (values[key] === value) {
    return values
  }

  const nextValues = { ...values, [key]: value }

  for (const dependentKey of eventCriteriaDependents(parameters, key)) {
    delete nextValues[dependentKey]
  }

  return nextValues
}

export function eventCriteriaDependents(
  parameters: readonly AutomationEventParameter[],
  changedKey: string
) {
  const dependents = new Set<string>()
  const pendingKeys = [changedKey]

  while (pendingKeys.length > 0) {
    const currentKey = pendingKeys.shift()

    if (currentKey === undefined) {
      continue
    }

    for (const parameter of parameters) {
      if (parameter.key === changedKey || dependents.has(parameter.key)) {
        continue
      }

      if (!automationEventParameterResetKeys(parameter).includes(currentKey)) {
        continue
      }

      dependents.add(parameter.key)
      pendingKeys.push(parameter.key)
    }
  }

  return dependents
}
