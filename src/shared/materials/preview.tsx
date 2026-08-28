import { FileIcon } from "lucide-react"
import { useEffect, useState } from "react"

// One inline preview shared by the member file view and the anonymous
// share view: images, PDFs, video, audio, and text-like files render in
// place; everything else keeps the quiet download prompt.

/** Characters of text shown inline before the preview cuts off. */
const textPreviewLimit = 100_000

const textualTypes = new Set([
  "application/javascript",
  "application/json",
  "application/sql",
  "application/toml",
  "application/typescript",
  "application/x-javascript",
  "application/x-sh",
  "application/x-yaml",
  "application/xml",
  "application/yaml",
])

export function FilePreview({
  mimeType,
  name,
  url,
}: {
  mimeType: string
  name: string
  url: string | null
}) {
  const kind = url === null ? "none" : previewKind(mimeType)

  switch (kind) {
    case "image":
      return (
        <img
          alt={name}
          className="max-h-[70svh] w-fit max-w-full rounded-md border"
          src={url ?? undefined}
        />
      )
    case "pdf":
      return (
        <iframe
          className="h-[70svh] w-full rounded-md border"
          src={url ?? undefined}
          title={name}
        />
      )
    case "video":
      return (
        // biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks.
        <video
          className="max-h-[70svh] w-full rounded-md border bg-muted/30"
          controls
          src={url ?? undefined}
        />
      )
    case "audio":
      return (
        // biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks.
        <audio className="w-full" controls src={url ?? undefined} />
      )
    case "text":
      return url === null ? <PreviewFallback /> : <TextPreview url={url} />
    case "none":
      return <PreviewFallback />
  }
}

function previewKind(mimeType: string) {
  // Strip parameters like "; charset=utf-8" before matching.
  const base = (mimeType.split(";")[0] ?? "").trim().toLowerCase()

  if (base.startsWith("image/")) {
    return "image"
  }

  if (base === "application/pdf") {
    return "pdf"
  }

  if (base.startsWith("video/")) {
    return "video"
  }

  if (base.startsWith("audio/")) {
    return "audio"
  }

  return isTextual(base) ? "text" : "none"
}

/** Text-like types rendered as monospace text: text/* (plain, CSV,
 *  markdown, HTML source, …), JSON, XML, and common code types. */
function isTextual(base: string) {
  return (
    base.startsWith("text/") ||
    textualTypes.has(base) ||
    base.endsWith("+json") ||
    base.endsWith("+xml")
  )
}

function PreviewFallback() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 text-muted-foreground">
      <FileIcon className="size-6" />
      <p className="text-sm">No inline preview for this file type.</p>
    </div>
  )
}

type TextState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; text: string; isTruncated: boolean }

function TextPreview({ url }: { url: string }) {
  const [state, setState] = useState<TextState>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()

    setState({ status: "loading" })
    readTextPreview(url, controller.signal)
      .then((preview) => setState({ status: "ready", ...preview }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: "error" })
        }
      })

    return () => controller.abort()
  }, [url])

  if (state.status === "loading") {
    return <div className="h-40 animate-pulse rounded-md border bg-muted/30" />
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 text-muted-foreground">
        <FileIcon className="size-6" />
        <p className="text-sm">Could not load a text preview.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-1">
      <pre className="max-h-[70svh] overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-xs">
        {state.text}
      </pre>
      {state.isTruncated ? (
        <p className="text-muted-foreground text-xs">
          Preview shows the first part of the file. Download it for the rest.
        </p>
      ) : null}
    </div>
  )
}

/** Stream the file just far enough to fill the preview, then stop, so a
 *  huge log or CSV never downloads in full. */
async function readTextPreview(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal })

  if (!response.ok || response.body === null) {
    throw new Error("Could not fetch the file.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ""

  while (text.length <= textPreviewLimit) {
    const { done, value } = await reader.read()

    if (done) {
      return { text, isTruncated: false }
    }

    text += decoder.decode(value, { stream: true })
  }

  await reader.cancel()

  return { text: text.slice(0, textPreviewLimit), isTruncated: true }
}
