import { type ReactNode, useState } from "react"
import { type PreviewKind } from "@/shared/files/kind"
import { FileToolbar } from "../toolbar"
import { ViewerFrame, type ViewerStatus } from "./frame"
import { ZoomableImage, ZoomTools } from "./image"
import { useZoom, type Zoom } from "./zoom"

/** The kinds the inline viewer can render; text goes to the editor and
 *  everything else to the download fallback. */
export type ViewerKind = Exclude<PreviewKind, "none" | "text">

/** Inline viewer for media files: the shared toolbar over one frame that
 *  every kind renders into. The frame holds the media hidden until it has
 *  loaded at its final size, so the reveal never shifts the page. Mount
 *  keyed by file id so state starts fresh per file. */
export function FileViewer({
  kind,
  meta,
  name,
  url: currentUrl,
}: {
  kind: ViewerKind
  meta: ReactNode
  name: string
  url: string
}) {
  // The signed url rotates with every query update; keeping the first one
  // stops loaded media from refetching mid-view. Audio needs no load
  // measurement — its chrome renders at a fixed size right away.
  const [url] = useState(currentUrl)
  const [status, setStatus] = useState<ViewerStatus>(
    kind === "audio" ? "ready" : "loading"
  )
  const zoom = useZoom()

  return (
    <>
      <FileToolbar
        action={
          kind === "image" ? (
            <ZoomTools isReady={status === "ready"} zoom={zoom} />
          ) : undefined
        }
      >
        {meta}
      </FileToolbar>
      <ViewerFrame status={status}>
        <ViewerContent
          kind={kind}
          name={name}
          onError={() => setStatus("error")}
          onReady={() => setStatus("ready")}
          url={url}
          zoom={zoom}
        />
      </ViewerFrame>
    </>
  )
}

function ViewerContent({
  kind,
  name,
  onError,
  onReady,
  url,
  zoom,
}: {
  kind: ViewerKind
  name: string
  onError: () => void
  onReady: () => void
  url: string
  zoom: Zoom
}) {
  switch (kind) {
    case "image":
      return (
        <ZoomableImage
          name={name}
          onError={onError}
          onReady={onReady}
          url={url}
          zoom={zoom}
        />
      )
    case "video":
      return (
        // biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks.
        <video
          className="size-full object-contain"
          controls
          onError={onError}
          onLoadedMetadata={onReady}
          src={url}
        />
      )
    case "audio":
      return (
        <div className="flex size-full items-center justify-center p-6">
          {/* biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks. */}
          <audio className="w-full max-w-xl" controls src={url} />
        </div>
      )
    case "pdf":
      return (
        <iframe className="size-full" onLoad={onReady} src={url} title={name} />
      )
  }
}
