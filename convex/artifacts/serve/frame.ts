import { runtimeAssets } from "../../../runtime/artifacts/_generated/assets"
import { type Id } from "../../_generated/dataModel"

const frameAncestorsEnv = "MILO_ARTIFACT_FRAME_ANCESTORS"

type RuntimeEnvironment = Record<string, string | undefined>

export type ArtifactFramePolicy = {
  frameAncestors: string[]
  parentOrigins: string[]
}

export function createArtifactRenderCsp(policy: ArtifactFramePolicy) {
  return [
    "default-src 'none'",
    "script-src 'unsafe-inline' blob:",
    "style-src 'self' 'unsafe-inline' blob:",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    `frame-ancestors ${policy.frameAncestors.join(" ")}`,
  ].join("; ")
}

export function readArtifactFramePolicy(
  environment: RuntimeEnvironment = process.env
): ArtifactFramePolicy {
  const parentOrigins = readConfiguredOrigins(environment[frameAncestorsEnv])

  return {
    frameAncestors: ["'self'", ...parentOrigins],
    parentOrigins,
  }
}

// The shell is served without authentication, so it must stay free of
// artifact data. Everything beyond the artifact id loads through the
// session-token-authorized tool and asset endpoints.
export function renderArtifactShell(
  artifactId: Id<"artifacts">,
  policy: ArtifactFramePolicy
) {
  return runtimeAssets.artifact.shell.html
    .replace("__MILO_ARTIFACT_TITLE__", "Artifact")
    .replace(
      "/* __MILO_ARTIFACT_STYLE__ */",
      runtimeAssets.artifact.shell.style
    )
    .replace(
      "__MILO_ARTIFACT_CONFIG__",
      escapeScriptJson({
        artifactId,
        parentOrigins: policy.parentOrigins,
      })
    )
    .replace(
      "/* __MILO_ARTIFACT_LOADER__ */",
      runtimeAssets.artifact.shell.loader
    )
}

function readConfiguredOrigins(value: string | undefined) {
  return splitOriginList(value).map(normalizeOrigin)
}

function splitOriginList(value: string | undefined) {
  return value?.split(/[\s,]+/).filter(Boolean) ?? []
}

function normalizeOrigin(value: string) {
  let url: URL
  const normalizedValue = value.replace(/\/+$/, "")

  try {
    url = new URL(normalizedValue)
  } catch {
    throw new Error(frameOriginError(value))
  }

  if (
    url.origin !== normalizedValue ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && url.protocol !== "http:")
  ) {
    throw new Error(frameOriginError(value))
  }

  return url.origin
}

function frameOriginError(value: string) {
  return `${frameAncestorsEnv} must contain origins only, received ${JSON.stringify(value)}.`
}

function escapeScriptJson(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c")
}
