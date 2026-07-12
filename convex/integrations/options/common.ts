import {
  type IntegrationOption,
  type IntegrationOptionMatch,
} from "../../../contracts/integrations/options"
import { type Doc } from "../../_generated/dataModel"

export const maxOptions = 50

export function requireMatch(
  match: IntegrationOptionMatch | undefined,
  key: string,
  label: string
) {
  const value = optionalMatch(match, key)

  if (value === undefined) {
    throw new OptionUnavailable(`Choose ${label} first.`)
  }

  return value
}

export function optionalMatch(
  match: IntegrationOptionMatch | undefined,
  key: string
) {
  const value = match?.[key]

  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

export function optionMatches(
  option: IntegrationOption,
  normalizedQuery: string
) {
  return (
    normalizedQuery === "" ||
    normalizeQuery([option.label, option.description].join(" ")).includes(
      normalizedQuery
    )
  )
}

export function compactDescription(parts: Array<string | undefined>) {
  const description = parts.filter(Boolean).join(" - ")

  return description === "" ? undefined : description
}

export function readRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

export function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function readNestedString(
  value: Record<string, unknown>,
  key: string,
  nestedKey: string
) {
  return optionalOptionString(readRecord(value[key])[nestedKey])
}

export function requiredOptionString(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Provider option is missing a required value")
  }

  return value.trim()
}

export function optionalOptionString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

export function requiredOptionNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Provider option is missing a required number")
  }

  return value
}

export function optionalOptionNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export function normalizeQuery(value: string) {
  return value.trim().toLowerCase()
}

export type OptionLoaderArgs = {
  integration: Doc<"integrations">
  query: string
  match: IntegrationOptionMatch | undefined
}

export class OptionUnavailable extends Error {}
