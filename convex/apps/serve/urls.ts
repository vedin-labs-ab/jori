import { shareFragment } from "../../../contracts/apps/share"
import { type Id } from "../../_generated/dataModel"
import { type RuntimeEnvironment, readOrigin } from "../../shared/origin"
import { readAppFramePolicy } from "./frame"

export type AppConsoleLink = {
  url?: string
  urlPath: string
}

export function appConsoleLink(
  appId: Id<"apps">,
  environment: RuntimeEnvironment = process.env
): AppConsoleLink {
  const urlPath = `/apps/${encodeURIComponent(appId)}`
  const appOrigin =
    readOrigin(environment) ?? readAppFramePolicy(environment).parentOrigins[0]

  return appOrigin === undefined
    ? { urlPath }
    : { url: new URL(urlPath, appOrigin).toString(), urlPath }
}

/** The console link plus the share secret in the fragment. */
export function appShareLink(
  appId: Id<"apps">,
  secret: string,
  environment: RuntimeEnvironment = process.env
): AppConsoleLink {
  const link = appConsoleLink(appId, environment)
  const fragment = `#${shareFragment(secret)}`

  return {
    urlPath: `${link.urlPath}${fragment}`,
    ...(link.url === undefined ? {} : { url: `${link.url}${fragment}` }),
  }
}
