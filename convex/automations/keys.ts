import { type Doc } from "../_generated/dataModel"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"

const organizationPartition = "organization"
const maxKeyLength = 240

export function normalizeAutomationKey(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  const key = value.trim()

  if (key === "" || key.length > maxKeyLength) {
    throw new Error(`Automation key must be 1-${maxKeyLength} characters.`)
  }

  return key
}

export function automationKeyPartition(principal: ExecutionPrincipal) {
  if (principal.kind === "organization") {
    return organizationPartition
  }

  const personId = executionPrincipalPersonId(principal)

  if (personId === undefined) {
    throw new Error("Personal keyed automations require an owner.")
  }

  return `person:${personId}`
}

export async function findAutomationByKey(
  ctx: QueryLikeCtx,
  args: { organizationId: string; keyPartition: string; key: string }
) {
  return await ctx.db
    .query("automations")
    .withIndex("by_organization_and_key_partition_and_key", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("keyPartition", args.keyPartition)
        .eq("key", args.key)
    )
    .unique()
}

export function sameAutomationDefinition(
  existing: Doc<"automations">,
  candidate: AutomationDefinition
) {
  return definitionKey(existing) === definitionKey(candidate)
}

type AutomationDefinition = Pick<
  Doc<"automations">,
  | "access"
  | "artifactId"
  | "instructions"
  | "name"
  | "parentId"
  | "parentConfigurationVersion"
  | "playbook"
  | "principal"
  | "scope"
  | "trigger"
  | "type"
>

function definitionKey(definition: AutomationDefinition) {
  return JSON.stringify({
    access: {
      integrations: [...definition.access.integrations]
        .map((entry) => ({
          id: entry.id,
          tools: [...entry.tools].sort(),
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id))),
      web: definition.access.web,
    },
    artifactId: definition.artifactId ?? null,
    instructions: definition.instructions,
    name: definition.name,
    parentId: definition.parentId ?? null,
    parentConfigurationVersion: definition.parentConfigurationVersion ?? null,
    playbook: definition.playbook ?? null,
    principal: definition.principal,
    scope: definition.scope,
    trigger: triggerKey(definition.trigger),
    type: definition.type,
  })
}

function triggerKey(trigger: Doc<"automations">["trigger"]) {
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
