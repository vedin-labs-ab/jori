import {
  type AutomationEventParameter,
  automationEventParameterResetKeys,
} from "@contracts/automations/events"

export function applyEventMatchChange({
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

  for (const dependentKey of eventMatchDependents(parameters, key)) {
    delete nextValues[dependentKey]
  }

  return nextValues
}

export function removeEventMatch({
  key,
  parameters,
  values,
}: {
  key: string
  parameters: readonly AutomationEventParameter[]
  values: Record<string, string>
}) {
  const nextValues = { ...values }

  delete nextValues[key]

  for (const dependentKey of eventMatchDependents(
    parameters,
    key,
    hardDependencyKeys
  )) {
    delete nextValues[dependentKey]
  }

  return nextValues
}

export function eventMatchDependents(
  parameters: readonly AutomationEventParameter[],
  changedKey: string,
  resetKeys: (
    parameter: AutomationEventParameter
  ) => readonly string[] = automationEventParameterResetKeys
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

      if (!resetKeys(parameter).includes(currentKey)) {
        continue
      }

      dependents.add(parameter.key)
      pendingKeys.push(parameter.key)
    }
  }

  return dependents
}

/** Keys a parameter cannot load without, unlike soft `resetsOn` scoping. */
function hardDependencyKeys(parameter: AutomationEventParameter) {
  return parameter.type === "option" ? (parameter.dependsOn ?? []) : []
}
