import { type Doc } from "../../_generated/dataModel"
import {
  type PermissionMode,
  type ToolProvider,
} from "../../permissions/catalog"
import { createRuntimeToolCapability, getProviderSkillNames } from "../bundles"
import { createMiloToolBundle } from "./milo"
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
  toolModes: ReadonlyMap<string, PermissionMode>
}): RuntimeToolBundle {
  const bundles: ToolBundle[] = []
  const skillNames = new Set<string>()
  const capabilities: RuntimeToolCapability[] = []
  const miloPermissions = getEnabledToolPermissions("milo", args.toolModes)

  if (miloPermissions.length > 0) {
    bundles.push(
      createMiloToolBundle({
        convexSiteUrl: args.milo.convexSiteUrl,
        executionToken: args.milo.executionToken,
        permissions: miloPermissions,
        toolModes: args.toolModes,
      })
    )
    addProviderSkillNames(skillNames, "milo")
    capabilities.push(createRuntimeToolCapability("milo", miloPermissions))
  }

  for (const integration of args.integrations) {
    const integrationBundle = createIntegrationToolBundle({
      broker: args.milo,
      integration,
      toolModes: args.toolModes,
    })

    if (integrationBundle !== null) {
      bundles.push(integrationBundle.bundle)
      addProviderSkillNames(skillNames, integrationBundle.provider)
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
  provider: ToolProvider
) {
  for (const skillName of getProviderSkillNames(provider)) {
    skillNames.add(skillName)
  }
}
