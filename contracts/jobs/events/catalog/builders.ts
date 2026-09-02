import { type Integration } from "../../../integrations"
import { type IntegrationOptionSource } from "../../../integrations/options"
import {
  type JobEventAvailability,
  type JobEventDefinition,
  type JobEventParameter,
} from "./types"

type ParameterOptions = {
  required?: boolean
  description?: string
  resetsOn?: readonly string[]
}

export function integration<const IntegrationKey extends Integration>(
  integration: IntegrationKey,
  events: readonly JobEventDefinition[]
) {
  return { integration, events }
}

export function event<const Value extends string>(
  value: Value,
  definition: Omit<JobEventDefinition, "value" | "availability"> & {
    availability?: JobEventAvailability
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
  definition: Omit<JobEventDefinition, "value" | "availability"> & {
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
): JobEventParameter {
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
): JobEventParameter {
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
): JobEventParameter {
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
): JobEventParameter {
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
