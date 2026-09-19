import { type Doc } from "../_generated/dataModel"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"

const organizationPartition = "organization"
const maxKeyLength = 240

export function normalizeJobKey(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  const key = value.trim()

  if (key === "" || key.length > maxKeyLength) {
    throw new Error(`Job key must be 1-${maxKeyLength} characters.`)
  }

  return key
}

export function jobKeyPartition(principal: ExecutionPrincipal) {
  if (principal.kind === "organization") {
    return organizationPartition
  }

  const personId = executionPrincipalPersonId(principal)

  if (personId === undefined) {
    throw new Error("Personal keyed jobs require an owner.")
  }

  return `person:${personId}`
}

export async function findJobByKey(
  ctx: QueryLikeCtx,
  args: { organizationId: string; keyPartition: string; key: string }
) {
  return await ctx.db
    .query("jobs")
    .withIndex("by_organization_and_key_partition_and_key", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("keyPartition", args.keyPartition)
        .eq("key", args.key)
    )
    .unique()
}

export function sameJobDefinition(
  existing: Doc<"jobs">,
  candidate: JobDefinition
) {
  return definitionKey(existing) === definitionKey(candidate)
}

type JobDefinition = Pick<
  Doc<"jobs">,
  | "access"
  | "instructions"
  | "name"
  | "parent"
  | "principal"
  | "trigger"
  | "type"
>

function definitionKey(definition: JobDefinition) {
  return JSON.stringify({
    access: {
      integrations: [...definition.access.integrations]
        .map((entry) => ({
          id: entry.id,
          tools: [...entry.tools].sort(),
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id))),
      jori: [...definition.access.jori].sort(),
    },
    instructions: definition.instructions,
    name: definition.name,
    parent:
      definition.parent === undefined
        ? null
        : {
            id: definition.parent.id,
            version: definition.parent.version ?? null,
          },
    principal: definition.principal,
    trigger: triggerKey(definition.trigger),
    type: definition.type,
  })
}

function triggerKey(trigger: Doc<"jobs">["trigger"]) {
  if ("at" in trigger) {
    return { at: trigger.at }
  }

  if ("expression" in trigger) {
    return { expression: trigger.expression, timezone: trigger.timezone }
  }

  return {
    event: trigger.event,
    integrationId: trigger.integrationId,
    match: trigger.match ?? null,
  }
}
