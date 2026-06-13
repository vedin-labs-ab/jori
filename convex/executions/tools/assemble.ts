import { type Doc } from "../../_generated/dataModel"
import { type AutomationAccess } from "../../automations/access"
import {
  type PermissionMode,
  type ToolProvider,
} from "../../permissions/catalog"
import { createRuntimeToolCapability, getProviderSkillNames } from "./bundles"
import { createMiloToolBundle } from "./milo"
import { type ToolExecutionType } from "./policy"
import {
  createIntegrationToolBundle,
  getEnabledToolPermissions,
} from "./resolve"
import {
  type RuntimeToolBundle,
  type RuntimeToolCapability,
  type ToolBundle,
} from "./types"

export function assembleToolsForRun(args: {
  milo: {
    convexSiteUrl: string
    executionToken: string
  }
  integrations: Doc<"integrations">[]
  access?: AutomationAccess
  executionType?: ToolExecutionType
  toolModes: ReadonlyMap<string, PermissionMode>
}): RuntimeToolBundle {
  const bundles: ToolBundle[] = []
  const skillNames = new Set<string>()
  const capabilities: RuntimeToolCapability[] = []
  const executionType = args.executionType ?? "message"
  const miloPermissions = getEnabledToolPermissions(
    "milo",
    args.toolModes,
    executionType
  )

  if (miloPermissions.length > 0) {
    bundles.push(
      createMiloToolBundle({
        convexSiteUrl: args.milo.convexSiteUrl,
        executionType,
        executionToken: args.milo.executionToken,
        permissions: miloPermissions,
        toolModes: args.toolModes,
      })
    )
    addProviderSkillNames(skillNames, "milo", miloPermissions)
    capabilities.push(createRuntimeToolCapability("milo", miloPermissions))
  }

  for (const integration of args.integrations) {
    const integrationBundle = createIntegrationToolBundle({
      broker: args.milo,
      executionType,
      integration,
      access: args.access,
      toolModes: args.toolModes,
    })

    if (integrationBundle !== null) {
      bundles.push(integrationBundle.bundle)
      addProviderSkillNames(
        skillNames,
        integrationBundle.provider,
        integrationBundle.permissions
      )
      capabilities.push(integrationBundle.capability)
    }
  }

  return {
    mcpServers: bundles.flatMap((bundle) => bundle.mcpServers),
    sandboxFiles: bundles.flatMap((bundle) => bundle.sandboxFiles),
    preflights: bundles.flatMap((bundle) => bundle.preflights),
    promptedTools: bundles.flatMap((bundle) => bundle.promptedTools),
    skillNames: [...skillNames],
    capabilities,
  }
}

function addProviderSkillNames(
  skillNames: Set<string>,
  provider: ToolProvider,
  permissions: Parameters<typeof getProviderSkillNames>[1]
) {
  for (const skillName of getProviderSkillNames(provider, permissions)) {
    skillNames.add(skillName)
  }
}
