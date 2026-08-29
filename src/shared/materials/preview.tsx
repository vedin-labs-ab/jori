import { FileIcon, type LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { fileKind, previewKind } from "@/shared/files/kind"

// One inline preview shared by the member file view and the anonymous
// share view: images, PDFs, video, audio, and text-like files render in
// place; everything else keeps the quiet download prompt.
//
// "standalone" (the share view) boxes each preview in its own border;
// "full" (the console file page) fills the given region edge-to-edge,
// centering media on a neutral surface.

type PreviewVariant = "full" | "standalone"

/** Characters of text shown inline before the preview cuts off. */
const textPreviewLimit = 100_000

export function FilePreview({
  mimeType,
  name,
  url,
  variant = "standalone",
}: {
  mimeType: string
  name: string
  url: string | null
  variant?: PreviewVariant
}) {
  const icon = fileKind(mimeType, name).icon

  if (url === null) {
    return <PreviewFallback icon={icon} variant={variant} />
  }

  const kind = previewKind(mimeType, name)

  if (kind === "none") {
    return <PreviewFallback icon={icon} variant={variant} />
  }

  if (kind === "text") {
    return <TextPreview url={url} />
  }

  return <MediaPreview kind={kind} name={name} url={url} variant={variant} />
}

function MediaPreview({
  kind,
  name,
  url,
  variant,
}: {
  kind: "audio" | "image" | "pdf" | "video"
  name: string
  url: string
  variant: PreviewVariant
}) {
  const boxed = variant === "standalone"

  switch (kind) {
    case "image":
      return (
        <MediaSurface boxed={boxed}>
          <img
            alt={name}
            className={cn(
              boxed
                ? "max-h-[70svh] w-fit max-w-full rounded-md border"
                : "max-h-full max-w-full object-contain"
            )}
            src={url}
          />
        </MediaSurface>
      )
    case "pdf":
      return (
        <iframe
          className={cn(
            boxed ? "h-[70svh] rounded-md border" : "h-full",
            "w-full"
          )}
          src={url}
          title={name}
        />
      )
    case "video":
      return (
        <MediaSurface boxed={boxed}>
          {/* biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks. */}
          <video
            className={cn(
              boxed
                ? "max-h-[70svh] w-full rounded-md border bg-muted/30"
                : "max-h-full max-w-full"
            )}
            controls
            src={url}
          />
        </MediaSurface>
      )
    case "audio":
      return (
        <div className={cn(!boxed && "flex h-full items-center p-6")}>
          {/* biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks. */}
          <audio
            className={cn("w-full", !boxed && "max-w-xl")}
            controls
            src={url}
          />
        </div>
      )
  }
}

/** Full-variant media sits centered on a quiet surface; the standalone
 *  variant keeps each element as its own boxed block. */
function MediaSurface({
  boxed,
  children,
}: {
  boxed: boolean
  children: React.ReactNode
}) {
  if (boxed) {
    return children
  }

  return (
    <div className="flex h-full items-center justify-center bg-muted/30 p-4">
      {children}
    </div>
  )
}

function PreviewFallback({
  icon: Icon,
  message = "No inline preview for this file type.",
  variant,
}: {
  icon: LucideIcon
  message?: string
  variant: PreviewVariant
}) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-2 text-muted-foreground",
        variant === "standalone" ? "rounded-md border bg-muted/30" : "h-full"
      )}
    >
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
        variant="standalone"
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
      <pre className="max-h-[70svh] min-w-0 overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-xs">
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
