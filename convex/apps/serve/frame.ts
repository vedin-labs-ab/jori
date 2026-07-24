import { runtimeAssets } from "../../../runtime/apps/_generated/assets"
import { type Id } from "../../_generated/dataModel"
import { type RuntimeEnvironment } from "../../shared/origin"

const frameAncestorsEnv = "MILO_APP_FRAME_ANCESTORS"

export type AppFramePolicy = {
  frameAncestors: string[]
  parentOrigins: string[]
}

export function createAppRenderCsp(policy: AppFramePolicy) {
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

export function readAppFramePolicy(
  environment: RuntimeEnvironment = process.env
): AppFramePolicy {
  const parentOrigins = readConfiguredOrigins(environment[frameAncestorsEnv])

  return {
    frameAncestors: ["'self'", ...parentOrigins],
    parentOrigins,
  }
}

// The shell is served without authentication, so it must stay free of
// app data. Everything beyond the app id loads through the
// session-token-authorized tool and asset endpoints.
export function renderAppShell(appId: Id<"apps">, policy: AppFramePolicy) {
  return runtimeAssets.app.shell.html
    .replace("__MILO_APP_TITLE__", "App")
    .replace("/* __MILO_APP_STYLE__ */", runtimeAssets.app.shell.style)
    .replace(
      "__MILO_APP_CONFIG__",
      escapeScriptJson({
        appId,
        parentOrigins: policy.parentOrigins,
      })
    )
    .replace("/* __MILO_APP_LOADER__ */", runtimeAssets.app.shell.loader)
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
