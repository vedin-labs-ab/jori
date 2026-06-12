import { type IntegrationProvider } from "../../providers/catalog"
import {
  type AutomationEventAvailability,
  type AutomationEventDefinition,
  type AutomationEventOptionSource,
  type AutomationEventParameter,
} from "./types"

export function provider<const Provider extends IntegrationProvider>(
  provider: Provider,
  events: readonly AutomationEventDefinition[]
) {
  return { provider, events }
}

export function event<const Value extends string>(
  value: Value,
  definition: Omit<AutomationEventDefinition, "value" | "availability"> & {
    availability?: AutomationEventAvailability
  }
) {
  return {
    ...definition,
    value,
    availability: definition.availability ?? { status: "available" },
  }
}

export function pendingEvent<const Value extends string>(
  value: Value,
  definition: Omit<AutomationEventDefinition, "value" | "availability"> & {
    message: string
  }
) {
  const { message, ...eventDefinition } = definition

  return event(value, {
    ...eventDefinition,
    availability: { status: "pending", message },
  })
}

export function optionParameter(
  key: string,
  label: string,
  placeholder: string,
  options: {
    source: AutomationEventOptionSource
    required?: boolean
    dependsOn?: readonly string[]
    description?: string
  }
): AutomationEventParameter {
  return {
    type: "option",
    key,
    label,
    placeholder,
    required: options.required ?? false,
    source: options.source,
    dependsOn: options.dependsOn,
    description: options.description,
  }
}

export function textParameter(
  key: string,
  label: string,
  placeholder: string,
  options: { required?: boolean; description?: string } = {}
): AutomationEventParameter {
  return {
    type: "text",
    key,
    label,
    placeholder,
    required: options.required ?? false,
    description: options.description,
  }
}

export function emailParameter(
  key: string,
  label: string,
  placeholder: string,
  options: { required?: boolean; description?: string } = {}
): AutomationEventParameter {
  return {
    type: "email",
    key,
    label,
    placeholder,
    required: options.required ?? false,
    description: options.description,
  }
}

export function numberParameter(
  key: string,
  label: string,
  placeholder: string,
  options: {
    required?: boolean
    min?: number
    max?: number
    step?: number
    description?: string
  } = {}
): AutomationEventParameter {
  return {
    type: "number",
    key,
    label,
    placeholder,
    required: options.required ?? false,
    min: options.min,
    max: options.max,
    step: options.step,
    description: options.description,
  }
}
