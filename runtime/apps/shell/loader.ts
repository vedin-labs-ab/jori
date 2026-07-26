import {
  type JoriStateDocument,
  type RawJoriStateListInput,
  type RawJoriStateReadInput,
  type RawJoriStateUpdateInput,
} from "../template/src/jori/state/types"
import {
  type JoriToolOptions,
  type RawJoriClient,
  type RawPromptInput,
} from "../template/src/jori/types"

type AppShellConfig = {
  appId: string
  parentOrigins: string[]
}

type AppTokenPayload = {
  appId: string
  versionId: string
}

type AppManifest = {
  entry: string
  styles?: string[]
}

type JoriWindow = Window &
  typeof globalThis & {
    __JORI_APP_SHELL__?: AppShellConfig
    Jori?: RawJoriClient
  }

const joriWindow = window as JoriWindow
const config = joriWindow.__JORI_APP_SHELL__

if (config === undefined) {
  throw new Error("App shell config is missing")
}

const { appId } = config
const allowedParentOrigins = new Set([
  joriWindow.location.origin,
  ...config.parentOrigins,
])
const loadedAssets = new Map<string, Promise<void>>()

joriWindow.addEventListener("message", async (event) => {
  if (!isAppTokenMessage(event)) {
    return
  }

  try {
    const token = requiredString(event.data.token)
    const payload = parseAppTokenPayload(token)

    if (payload.appId !== appId) {
      throw new Error("Token app mismatch")
    }

    joriWindow.Jori = createJoriSdk({
      appId,
      token,
      versionId: payload.versionId,
    })

    await loadApp(payload.versionId, token)
    joriWindow.parent.postMessage(
      { type: "jori:app-ready", appId },
      event.origin
    )
  } catch (error) {
    reportLoadError(error, event.origin)
  }
})

async function loadApp(versionId: string, token: string): Promise<void> {
  const loadedAsset = loadedAssets.get(versionId)

  if (loadedAsset !== undefined) {
    await loadedAsset
    return
  }

  const manifest = await fetchJson<AppManifest>(
    assetUrl(versionId, "jori-manifest.json"),
    token
  )

  for (const stylePath of manifest.styles ?? []) {
    const css = await fetchText(assetUrl(versionId, stylePath), token)
    const style = document.createElement("style")
    style.textContent = rewriteCssAssetUrls(css)
    document.head.append(style)
  }

  const js = await fetchText(assetUrl(versionId, manifest.entry), token)
  const moduleUrl = URL.createObjectURL(
    new Blob([js], { type: "text/javascript" })
  )
  const promise = import(moduleUrl).then(() => undefined)
  loadedAssets.set(versionId, promise)
  await promise
}

function createJoriSdk(input: {
  appId: string
  versionId: string
  token: string
}): RawJoriClient {
  async function callTool<T = unknown>(
    tool: string,
    args?: unknown,
    options: JoriToolOptions = {}
  ): Promise<T> {
    const response = await fetch("/apps/tools", {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tool,
        args,
        cacheTtlMs: options.cacheTtlMs,
        forceRefresh: options.forceRefresh,
        integrationId: options.integrationId,
      }),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(readResponseError(result))
    }

    return result as T
  }

  return Object.freeze({
    appId: input.appId,
    versionId: input.versionId,
    getToken: () => input.token,
    callTool,
    state: Object.freeze({
      read: <T = unknown>(args: RawJoriStateReadInput) =>
        callTool<JoriStateDocument<T> | null>("readState", args),
      list: <T = unknown>(args: RawJoriStateListInput = {}) =>
        callTool<JoriStateDocument<T>[]>("listState", args),
      update: <T = unknown>(args: RawJoriStateUpdateInput) =>
        callTool<JoriStateDocument<T>>("updateState", args),
    }),
    model: Object.freeze({
      prompt: <T = unknown>(args: RawPromptInput, options?: JoriToolOptions) =>
        callTool<T>("promptModel", args, options),
    }),
  })
}

function assetUrl(versionId: string, path: string) {
  return `/apps/assets/${encodeURIComponent(versionId)}/${path}`
}

function rewriteCssAssetUrls(css: string) {
  return css.replace(
    /url\((["']?)(\/?assets\/geist-latin-wght-normal-[\w-]+\.woff2)\1\)/g,
    (_source, quote: string, assetPath: string) =>
      `url(${quote}/${assetPath.replace(/^\/+/, "")}?jori-runtime=1${quote})`
  )
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  return JSON.parse(await fetchText(url, token)) as T
}

async function fetchText(url: string, token: string) {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error("App asset request failed")
  }

  return await response.text()
}

function parseAppTokenPayload(token: string): AppTokenPayload {
  const payload = JSON.parse(decodeURIComponent(token)) as unknown

  if (
    !isRecord(payload) ||
    typeof payload.appId !== "string" ||
    typeof payload.versionId !== "string"
  ) {
    throw new Error("App token payload is invalid")
  }

  return {
    appId: payload.appId,
    versionId: payload.versionId,
  }
}

function isAppTokenMessage(
  event: MessageEvent
): event is MessageEvent<{ type: string; token: unknown }> {
  return (
    event.source === window.parent &&
    isRecord(event.data) &&
    event.data.type === "jori:app-token" &&
    allowedParentOrigins.has(event.origin)
  )
}

function reportLoadError(error: unknown, origin: string) {
  const state = document.querySelector("[data-app-state]")

  if (state !== null) {
    state.textContent =
      error instanceof Error ? error.message : "App failed to load"
  }

  joriWindow.parent.postMessage({ type: "jori:app-error", appId }, origin)
}

function requiredString(value: unknown) {
  if (typeof value !== "string" || value === "") {
    throw new Error("App token is missing")
  }

  return value
}

function readResponseError(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "App tool request failed"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
