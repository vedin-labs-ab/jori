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

type ArtifactShellConfig = {
  artifactId: string
  parentOrigins: string[]
}

type ArtifactTokenPayload = {
  artifactId: string
  versionId: string
}

type ArtifactManifest = {
  entry: string
  styles?: string[]
}

type MiloWindow = Window &
  typeof globalThis & {
    __MILO_ARTIFACT_SHELL__?: ArtifactShellConfig
    Milo?: RawMiloClient
  }

const miloWindow = window as MiloWindow
const config = miloWindow.__MILO_ARTIFACT_SHELL__

if (config === undefined) {
  throw new Error("Artifact shell config is missing")
}

const { artifactId } = config
const allowedParentOrigins = new Set([
  miloWindow.location.origin,
  ...config.parentOrigins,
])
const loadedAssets = new Map<string, Promise<unknown>>()

miloWindow.addEventListener("message", async (event) => {
  if (!isArtifactTokenMessage(event)) {
    return
  }

  try {
    const token = requiredString(event.data.token)
    const payload = parseArtifactTokenPayload(token)

    if (payload.artifactId !== artifactId) {
      throw new Error("Token artifact mismatch")
    }

    miloWindow.Milo = createMiloSdk({
      artifactId,
      token,
      versionId: payload.versionId,
    })

    await loadArtifact(payload.versionId, token)
    miloWindow.parent.postMessage(
      { type: "milo:artifact-ready", artifactId },
      event.origin
    )
  } catch (error) {
    reportLoadError(error, event.origin)
  }
})

async function loadArtifact(versionId: string, token: string) {
  if (loadedAssets.has(versionId)) {
    return loadedAssets.get(versionId)
  }

  const manifest = await fetchJson<ArtifactManifest>(
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
  const promise = import(moduleUrl)
  loadedAssets.set(versionId, promise)
  return promise
}

function createMiloSdk(input: {
  artifactId: string
  versionId: string
  token: string
}): RawMiloClient {
  async function callTool<T = unknown>(
    tool: string,
    args?: unknown,
    options: MiloToolOptions = {}
  ): Promise<T> {
    const response = await fetch("/artifacts/tools", {
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
    artifactId: input.artifactId,
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
  return `/artifacts/assets/${encodeURIComponent(versionId)}/${path}`
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
    throw new Error("Artifact asset request failed")
  }

  return await response.text()
}

function parseArtifactTokenPayload(token: string): ArtifactTokenPayload {
  const payload = JSON.parse(decodeURIComponent(token)) as unknown

  if (
    !isRecord(payload) ||
    typeof payload.artifactId !== "string" ||
    typeof payload.versionId !== "string"
  ) {
    throw new Error("Artifact token payload is invalid")
  }

  return {
    artifactId: payload.artifactId,
    versionId: payload.versionId,
  }
}

function isArtifactTokenMessage(
  event: MessageEvent
): event is MessageEvent<{ type: string; token: unknown }> {
  return (
    event.source === window.parent &&
    isRecord(event.data) &&
    event.data.type === "milo:artifact-token" &&
    allowedParentOrigins.has(event.origin)
  )
}

function reportLoadError(error: unknown, origin: string) {
  const state = document.querySelector("[data-artifact-state]")

  if (state !== null) {
    state.textContent =
      error instanceof Error ? error.message : "Artifact failed to load"
  }

  miloWindow.parent.postMessage(
    { type: "milo:artifact-error", artifactId },
    origin
  )
}

function requiredString(value: unknown) {
  if (typeof value !== "string" || value === "") {
    throw new Error("Artifact token is missing")
  }

  return value
}

function readResponseError(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Artifact tool request failed"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
