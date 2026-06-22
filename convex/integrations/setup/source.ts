import { type AgentRuntimeInput } from "../../runs/agent/input"
import {
  type Actor,
  getActorDisplayName,
  getActorEmail,
  getActorExternalId,
} from "../../shared/actor"
import { type ToolSurface } from "../../shared/integrations"
import { type SetupLinkSource } from "./schema"

const surfaceIdentityProviders = ["github", "linear", "slack"] as const

export type SurfaceIdentityProvider = (typeof surfaceIdentityProviders)[number]

export function setupSourceFromInput(
  input: AgentRuntimeInput
): SetupLinkSource {
  if (input.type !== "message") {
    return {
      surface: "milo",
      runId: input.run._id,
    }
  }

  return {
    surface: input.messageIntegration,
    integrationId: input.integration._id,
    messageId: input.message._id,
    runId: input.run._id,
    ...sourceActorFields(input.message.actor),
  }
}

export function surfaceIdentityProvider(
  surface: ToolSurface
): SurfaceIdentityProvider | undefined {
  return isSurfaceIdentityProvider(surface) ? surface : undefined
}

function sourceActorFields(actor: Actor | undefined) {
  const externalId = getActorExternalId(actor)

  if (externalId === undefined) {
    return {}
  }

  return {
    actor: {
      externalId,
      ...optionalText("email", getActorEmail(actor)),
      ...optionalText("name", getActorDisplayName(actor)),
    },
  }
}

function isSurfaceIdentityProvider(
  surface: ToolSurface
): surface is SurfaceIdentityProvider {
  return surfaceIdentityProviders.includes(surface as SurfaceIdentityProvider)
}

function optionalText<Key extends string>(key: Key, value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? {} : { [key]: trimmed }
}
