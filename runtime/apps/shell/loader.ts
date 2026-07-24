import {
  type MiloStateDocument,
  type RawMiloStateListInput,
  type RawMiloStateReadInput,
  type RawMiloStateUpdateInput,
} from "../template/src/milo/state/types"
import {
  type MiloToolOptions,
  type RawMiloClient,
  type RawPromptInput,
} from "../template/src/milo/types"

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

type MiloWindow = Window &
  typeof globalThis & {
    __MILO_APP_SHELL__?: AppShellConfig
    Milo?: RawMiloClient
  }

const miloWindow = window as MiloWindow
const config = miloWindow.__MILO_APP_SHELL__

if (config === undefined) {
  throw new Error("App shell config is missing")
}

const { appId } = config
const allowedParentOrigins = new Set([
  miloWindow.location.origin,
  ...config.parentOrigins,
])
const loadedAssets = new Map<string, Promise<void>>()

miloWindow.addEventListener("message", async (event) => {
  if (!isAppTokenMessage(event)) {
    return
  }

  try {
    const token = requiredString(event.data.token)
    const payload = parseAppTokenPayload(token)

    if (payload.appId !== appId) {
      throw new Error("Token app mismatch")
    }

    miloWindow.Milo = createMiloSdk({
      appId,
      token,
      versionId: payload.versionId,
    })

    await loadApp(payload.versionId, token)
    miloWindow.parent.postMessage(
      { type: "milo:app-ready", appId },
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
    assetUrl(versionId, "milo-manifest.json"),
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

function createMiloSdk(input: {
  appId: string
  versionId: string
  token: string
}): RawMiloClient {
  async function callTool<T = unknown>(
    tool: string,
    args?: unknown,
    options: MiloToolOptions = {}
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
      read: <T = unknown>(args: RawMiloStateReadInput) =>
        callTool<MiloStateDocument<T> | null>("readState", args),
      list: <T = unknown>(args: RawMiloStateListInput = {}) =>
        callTool<MiloStateDocument<T>[]>("listState", args),
      update: <T = unknown>(args: RawMiloStateUpdateInput) =>
        callTool<MiloStateDocument<T>>("updateState", args),
    }),
    model: Object.freeze({
      prompt: <T = unknown>(args: RawPromptInput, options?: MiloToolOptions) =>
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
      `url(${quote}/${assetPath.replace(/^\/+/, "")}?milo-runtime=1${quote})`
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
    event.data.type === "milo:app-token" &&
    allowedParentOrigins.has(event.origin)
  )
}

function reportLoadError(error: unknown, origin: string) {
  const state = document.querySelector("[data-app-state]")

  if (state !== null) {
    state.textContent =
      error instanceof Error ? error.message : "App failed to load"
  }

  miloWindow.parent.postMessage({ type: "milo:app-error", appId }, origin)
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
