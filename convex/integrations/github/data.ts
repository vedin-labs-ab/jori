import { type Doc } from "../../_generated/dataModel"
import {
  type Actor,
  getActorDisplayName,
  getActorExternalId,
} from "../../shared/actor"
import { readDataString } from "../../shared/data"

export function getGitHubBotLogin(data: unknown) {
  return (
    readDataString(data, "botLogin") ??
    botLogin(readDataString(data, "appSlug"))
  )
}

export function isGitHubSelfActor(
  actor: Actor | undefined,
  integration: Pick<Doc<"integrations">, "data" | "integration">
) {
  if (actor?.kind === "self") {
    return true
  }

  if (integration.integration !== "github" || actor?.kind !== "bot") {
    return false
  }

  const login = getGitHubBotLogin(integration.data)
  const name = getActorDisplayName(actor)

  return (
    login !== undefined &&
    name !== undefined &&
    login.toLowerCase() === name.toLowerCase()
  )
}

export function githubActorId(actor: Actor | undefined) {
  const externalId = getActorExternalId(actor)

  if (externalId === undefined || externalId === "") {
    return []
  }

  return [`github:${actor?.kind === "bot" ? "bot" : "user"}:${externalId}`]
}

export function githubIntegrationData(profile: { app_slug?: string }) {
  const appSlug = profile.app_slug

  return appSlug === undefined || appSlug === ""
    ? undefined
    : { appSlug, botLogin: botLogin(appSlug) }
}

function botLogin(appSlug: string | undefined) {
  return appSlug === undefined || appSlug === "" ? undefined : `${appSlug}[bot]`
}
