import { type Id } from "../../_generated/dataModel"
import { type RuntimeEnvironment, readAppOrigin } from "../../shared/app"
import { readArtifactFramePolicy } from "./frame"

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
