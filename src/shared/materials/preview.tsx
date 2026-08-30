import { FileIcon, type LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { fileKind, previewKind } from "@/shared/files/kind"

// The share view's inline preview: images, PDFs, video, audio, and
// text-like files render in place as boxed blocks; everything else keeps
// the quiet download prompt. The console file page has its own richer
// viewer under src/console/files/viewer.

/** Characters of text shown inline before the preview cuts off. */
const textPreviewLimit = 100_000

export function FilePreview({
  mimeType,
  name,
  url,
}: {
  mimeType: string
  name: string
  url: string | null
}) {
  const icon = fileKind(mimeType, name).icon

  if (url === null) {
    return <PreviewFallback icon={icon} />
  }

  const kind = previewKind(mimeType, name)

  if (kind === "none") {
    return <PreviewFallback icon={icon} />
  }

  if (kind === "text") {
    return <TextPreview url={url} />
  }

  return <MediaPreview kind={kind} name={name} url={url} />
}

function MediaPreview({
  kind,
  name,
  url,
}: {
  kind: "audio" | "image" | "pdf" | "video"
  name: string
  url: string
}) {
  switch (kind) {
    case "image":
      return (
        <img
          alt={name}
          className="max-h-[70svh] w-fit max-w-full rounded-md border"
          src={url}
        />
      )
    case "pdf":
      return (
        <iframe
          className="h-[70svh] w-full rounded-md border"
          src={url}
          title={name}
        />
      )
    case "video":
      return (
        // biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks.
        <video
          className="max-h-[70svh] w-full rounded-md border bg-muted/30"
          controls
          src={url}
        />
      )
    case "audio":
      // biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks.
      return <audio className="w-full" controls src={url} />
  }
}

function PreviewFallback({
  icon: Icon,
  message = "No inline preview for this file type.",
}: {
  icon: LucideIcon
  message?: string
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 text-muted-foreground">
      <Icon className="size-6" />
      <p className="text-sm">{message}</p>
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
      <PreviewFallback
        icon={FileIcon}
        message="Could not load a text preview."
      />
    )
  }

  return <TextDocument state={state} />
}

function TextDocument({
  state,
}: {
  state: Extract<TextState, { status: "ready" }>
}) {
  return (
    <div className="grid gap-1">
      <pre
        className={cn(
          scrollFade,
          "max-h-[70svh] min-w-0 overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-xs"
        )}
      >
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
