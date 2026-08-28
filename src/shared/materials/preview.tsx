import { FileIcon, type LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { fileKind, isTextualKind } from "@/shared/files/kind"

// One inline preview shared by the member file view and the anonymous
// share view: images, PDFs, video, audio, and text-like files render in
// place; everything else keeps the quiet download prompt.
//
// "standalone" (the share view) boxes each preview in its own border;
// "flush" (inside a DetailFrame) drops that chrome so media sits
// edge-to-edge and text gets the terminal's own padding rhythm.

type PreviewVariant = "flush" | "standalone"

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
    return <TextPreview url={url} variant={variant} />
  }

  return <MediaPreview kind={kind} name={name} url={url} variant={variant} />
}

/** Browsers render media by the served mime type, so those stay mime-only;
 *  text previews are fetched by hand, so the registry's read of the file —
 *  extension rescue included — decides what counts as text. */
function previewKind(mimeType: string, name: string) {
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

  return isTextualKind(mimeType, name) ? "text" : "none"
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
        <img
          alt={name}
          className={cn(
            "max-h-[70svh] w-fit max-w-full",
            boxed && "rounded-md border"
          )}
          src={url}
        />
      )
    case "pdf":
      return (
        <iframe
          className={cn("h-[70svh] w-full", boxed && "rounded-md border")}
          src={url}
          title={name}
        />
      )
    case "video":
      return (
        // biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks.
        <video
          className={cn(
            "max-h-[70svh] w-full",
            boxed && "rounded-md border bg-muted/30"
          )}
          controls
          src={url}
        />
      )
    case "audio":
      return (
        <div className={cn(!boxed && "p-2.5")}>
          {/* biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks. */}
          <audio className="w-full" controls src={url} />
        </div>
      )
  }
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
        variant === "standalone" && "rounded-md border bg-muted/30"
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

function TextPreview({
  url,
  variant,
}: {
  url: string
  variant: PreviewVariant
}) {
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
    return (
      <div
        className={cn(
          "h-40 animate-pulse",
          variant === "standalone"
            ? "rounded-md border bg-muted/30"
            : "bg-muted-foreground/10"
        )}
      />
    )
  }

  if (state.status === "error") {
    return (
      <PreviewFallback
        icon={FileIcon}
        message="Could not load a text preview."
        variant={variant}
      />
    )
  }

  return <TextDocument state={state} variant={variant} />
}

function TextDocument({
  state,
  variant,
}: {
  state: Extract<TextState, { status: "ready" }>
  variant: PreviewVariant
}) {
  return (
    <div className={cn("grid", variant === "standalone" && "gap-1")}>
      <pre
        className={cn(
          "max-h-[70svh] min-w-0 overflow-auto font-mono text-xs",
          variant === "standalone"
            ? "rounded-md border bg-muted/30 p-4"
            : "px-2.5 py-2 text-foreground leading-relaxed"
        )}
      >
        {state.text}
      </pre>
      {state.isTruncated ? (
        <p
          className={cn(
            "text-muted-foreground text-xs",
            variant === "flush" && "border-t px-2.5 py-1.5"
          )}
        >
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
