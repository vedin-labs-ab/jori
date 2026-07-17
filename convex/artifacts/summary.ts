import { getToolPermission } from "../../contracts/permissions"
import { type Doc, type Id } from "../_generated/dataModel"

/**
 * Where an artifact came from, when a template produced it: the most
 * recent stamped version names the template, and a stamp-less head means
 * the user has published their own version since — customized.
 */
export function templateProvenance(
  versions: Doc<"artifactVersions">[],
  currentVersionId: Id<"artifactVersions"> | undefined
) {
  const stamped = versions.find((version) => version.template !== undefined)

  if (stamped?.template === undefined) {
    return null
  }

  const head = versions.find((version) => version._id === currentVersionId)

  return {
    key: stamped.template.key,
    version: stamped.template.version,
    customized: head !== undefined && head.template === undefined,
  }
}

export function summarizeVersion(
  version: Doc<"artifactVersions">,
  currentVersionId: Id<"artifactVersions"> | undefined
) {
  return {
    versionId: version._id,
    parentVersionId: version.parentVersionId,
    treeId: version.treeId,
    entrypoint: version.entrypoint,
    sdk: version.sdk,
    message: version.message,
    template: version.template,
    createdBy: version.createdBy,
    createdAt: version.createdAt,
    isCurrent: version._id === currentVersionId,
  }
}

export function summarizeAutomations(automations: Doc<"automations">[]) {
  return automations.map((automation) => ({
    automationId: automation._id,
    name: automation.name,
    status: automation.status,
    firedAt: automation.firedAt,
    nextAt: automationNextAt(automation),
    updatedAt: automation.updatedAt,
  }))
}

function automationNextAt(automation: Doc<"automations">) {
  if ("nextAt" in automation.trigger) {
    return automation.trigger.nextAt
  }

  return "at" in automation.trigger ? automation.trigger.at : undefined
}

export function summarizeCapabilities(capabilities: Doc<"artifactTools">[]) {
  const activeCapabilities = capabilities.filter(
    (capability) => capability.revokedAt === undefined
  )

  return activeCapabilities
    .map((capability) => summarizeCapabilityForConsole(capability))
    .filter((capability) => capability !== null)
}

export function summarizeCapabilityForConsole(
  capability: Pick<
    Doc<"artifactTools">,
    "approvedAt" | "integrationId" | "tool" | "versionId"
  >
) {
  const permission = getToolPermission(capability.tool)

  if (permission === undefined) {
    return null
  }

  return {
    access: permission.access,
    approvedAt: capability.approvedAt,
    description: permission.description,
    integrationId: capability.integrationId,
    label: permission.label,
    surface: permission.surface,
    tool: permission.tool,
    versionId: capability.versionId,
  }
}
