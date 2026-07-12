import { type Integration } from "../../../integrations"
import { type IntegrationOptionSource } from "../../../integrations/options"
import {
  type AutomationEventAvailability,
  type AutomationEventDefinition,
  type AutomationEventParameter,
} from "./types"

type ParameterOptions = {
  required?: boolean
  description?: string
  resetsOn?: readonly string[]
}

export function integration<const IntegrationKey extends Integration>(
  integration: IntegrationKey,
  events: readonly AutomationEventDefinition[]
) {
  return { integration, events }
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
  options: ParameterOptions & {
    source: IntegrationOptionSource
    dependsOn?: readonly string[]
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
    resetsOn: options.resetsOn,
  }
}

export function textParameter(
  key: string,
  label: string,
  placeholder: string,
  options: ParameterOptions = {}
): AutomationEventParameter {
  return {
    type: "text",
    key,
    label,
    placeholder,
    required: options.required ?? false,
    description: options.description,
    resetsOn: options.resetsOn,
  }
}

export function emailParameter(
  key: string,
  label: string,
  placeholder: string,
  options: ParameterOptions = {}
): AutomationEventParameter {
  return {
    type: "email",
    key,
    label,
    placeholder,
    required: options.required ?? false,
    description: options.description,
    resetsOn: options.resetsOn,
  }
}

export function numberParameter(
  key: string,
  label: string,
  placeholder: string,
  options: ParameterOptions & {
    min?: number
    max?: number
    step?: number
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
    resetsOn: options.resetsOn,
  }
}
