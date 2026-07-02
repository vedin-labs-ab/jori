import { type JsonObject } from "./json"
import { finalProperty } from "./runtime"

export const approvalTtlSeconds = 30 * 60
export const approvalTtlMs = approvalTtlSeconds * 1000
export const approvalWaitTimeout = `${approvalTtlSeconds}s`
export const approvalSummaryMaxLength = 500

const approvalSummaryDescription =
  "One concise user-facing sentence stating the exact action and the key details needed to judge it, such as destination, parent, title, recipient, account, or permissions."

export function withApprovalSchema(schema: Record<string, unknown> = {}) {
  const properties = readObject(schema.properties)
  const required = readStringArray(schema.required)

  return {
    ...schema,
    type: "object",
    properties: {
      ...properties,
      approval: approvalMetadataSchema(),
      final: finalProperty(),
    },
    required: [...new Set([...required, "approval"])],
  }
}

export function readApprovalSummary(input: JsonObject) {
  const approval = input.approval

  if (!isObject(approval)) {
    return null
  }

  const summary = approval.summary

  if (typeof summary !== "string") {
    return null
  }

  const trimmed = summary.trim()

  return trimmed.length > 0 && trimmed.length <= approvalSummaryMaxLength
    ? trimmed
    : null
}

export function approvalSummaryValidationError(tool: string) {
  return [
    `Tool requires approval: ${tool}.`,
    `Include approval.summary as a 1-${approvalSummaryMaxLength} character user-facing sentence describing the exact action.`,
    "Retry the same tool call with approval.summary included.",
  ].join(" ")
}

function approvalMetadataSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary"],
    properties: {
      summary: {
        type: "string",
        minLength: 1,
        maxLength: approvalSummaryMaxLength,
        description: approvalSummaryDescription,
      },
    },
  }
}

function readObject(value: unknown) {
  return isObject(value) ? value : {}
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
