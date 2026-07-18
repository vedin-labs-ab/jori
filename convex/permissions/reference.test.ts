import { expect, test } from "vitest"
import { toolPermissions } from "../../contracts/permissions"
import { toolResponseSchemas } from "../runs/agent/tools/schemas/responses"
import { resolveToolReference } from "./reference"

test("every permissioned tool resolves a request and a response schema", () => {
  for (const permission of toolPermissions) {
    const reference = resolveToolReference(permission.tool)

    expect(validSchema(reference.request), `${permission.tool} request`).toBe(
      true
    )
    expect(validSchema(reference.response), `${permission.tool} response`).toBe(
      true
    )
  }
})

test("response schemas cover exactly the permissioned tools", () => {
  const catalog = [
    ...new Set(toolPermissions.map((permission) => permission.tool)),
  ].sort()

  expect(Object.keys(toolResponseSchemas).sort()).toEqual(catalog)
})

test("shaped results carry an authored response schema", () => {
  const reference = resolveToolReference("google_calendar_list_events")

  expect(reference.request).toMatchObject({ type: "object" })
  expect(JSON.stringify(reference.response)).toContain("entityKey")
  expect(JSON.stringify(reference.response)).toContain("contentHash")
})

test("passthrough tools name the provider payload they return", () => {
  const reference = resolveToolReference("notion_get_page")

  expect(reference.request).toMatchObject({ type: "object" })
  expect(reference.response).toMatchObject({
    type: "object",
    additionalProperties: true,
    description: expect.stringContaining("Notion's page object"),
  })
})

test("mail tools share one normalized message schema across providers", () => {
  const gmail = resolveToolReference("google_gmail_get_message")
  const outlook = resolveToolReference("microsoft_email_get_message")

  expect(gmail.response).toEqual(outlook.response)
  expect(JSON.stringify(gmail.response)).toContain("Normalized mail message")
})

test("unknown tools are rejected", () => {
  expect(() => resolveToolReference("missing_tool")).toThrow("Unknown tool.")
})

test("native agent tools resolve with authored responses", () => {
  const reference = resolveToolReference("wait_for_agents")

  expect(reference.request).toMatchObject({ type: "object" })
  expect(JSON.stringify(reference.response)).toContain("finish_run")
  expect(resolveToolReference("bash").response).toMatchObject({
    type: "object",
    required: ["exitCode", "stdout", "stderr"],
  })
})

test("surface tools resolve one labeled request variant per surface", () => {
  for (const tool of ["send_reply", "add_reaction"]) {
    const reference = resolveToolReference(tool)
    const variants = Array.isArray(reference.request.oneOf)
      ? reference.request.oneOf
      : []
    const titles = variants.map((variant) =>
      typeof variant === "object" && variant !== null
        ? (variant as { title?: string }).title
        : undefined
    )

    expect(titles, tool).toEqual(["GitHub", "Linear", "Slack"])
  }

  expect(resolveToolReference("send_reply").response).toMatchObject({
    properties: { status: { const: "sent" } },
  })
})

function validSchema(schema: unknown): boolean {
  if (typeof schema !== "object" || schema === null) {
    return false
  }

  const candidate = schema as Record<string, unknown>

  return candidate.type !== undefined || Array.isArray(candidate.oneOf)
}
