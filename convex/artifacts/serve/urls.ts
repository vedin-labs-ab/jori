import { type Id } from "../../_generated/dataModel"
import { readArtifactFramePolicy } from "./frame"

const appUrlEnv = "MILO_APP_URL"

type RuntimeEnvironment = Record<string, string | undefined>

export type ArtifactConsoleLink = {
  url?: string
  urlPath: string
}

export function artifactConsoleLink(
  artifactId: Id<"artifacts">,
  environment: RuntimeEnvironment = process.env
): ArtifactConsoleLink {
  const urlPath = artifactConsolePath(artifactId)
  const appOrigin =
    readAppOrigin(environment) ??
    readArtifactFramePolicy(environment).parentOrigins[0]

  return appOrigin === undefined
    ? { urlPath }
    : { url: new URL(urlPath, appOrigin).toString(), urlPath }
}

export function artifactConsolePath(artifactId: Id<"artifacts">) {
  return `/artifacts/${encodeURIComponent(artifactId)}`
}

function readAppOrigin(environment: RuntimeEnvironment) {
  const value = environment[appUrlEnv]?.trim()

  if (value === undefined || value === "") {
    return undefined
  }

  let url: URL

  try {
    url = new URL(value.replace(/\/+$/, ""))
  } catch {
    throw new Error(appUrlError(value))
  }

  if (
    url.origin !== value.replace(/\/+$/, "") ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && url.protocol !== "http:")
  ) {
    throw new Error(appUrlError(value))
  }

  return url.origin
}

function appUrlError(value: string) {
  return `${appUrlEnv} must be an http(s) origin, received ${JSON.stringify(value)}.`
}
