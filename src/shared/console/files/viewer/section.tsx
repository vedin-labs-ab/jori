import { type ReactNode, useRef } from "react"
import { type PreviewKind } from "@/shared/files/kind"
import { usePreloadSiblings } from "../cache/preload"
import { useDisplayUrl } from "../cache/url"
import { type FileSiblings, useSiblingKeys } from "../siblings"
import { FileToolbar } from "../toolbar"
import { type FileDetail } from "../types"
import { ViewerFrame } from "./frame"
import { ZoomableImage, ZoomTools } from "./image"
import { useMediaKeys } from "./keys"
import { useViewerStatus, type ViewerStatus } from "./status"
import { useZoom, type Zoom } from "./zoom"

/** The kinds the inline viewer can render; text goes to the editor and
 *  everything else to the download fallback. */
export type ViewerKind = Exclude<PreviewKind, "none" | "text">

/** Inline viewer for media files: the shared toolbar over one frame that
 *  every kind renders into. The frame holds the media hidden until it has
 *  loaded at its final size, so the reveal never shifts the page. Mount
 *  keyed by file id so state starts fresh per file. */
export function FileViewer({
  file,
  kind,
  meta,
  siblings,
  url: currentUrl,
}: {
  file: FileDetail
  kind: ViewerKind
  meta: ReactNode
  siblings: FileSiblings
  url: string
}) {
  // The blob cache resolves what the media renders: a cached object URL —
  // instantly when the file was viewed or preloaded recently — or the
  // network URL for oversized files. Either way the value is frozen per
  // mount, so loaded media never refetches mid-view. Audio needs no load
  // measurement — its chrome renders at a fixed size right away.
  const url = useDisplayUrl({
    fileId: file.fileId,
    size: file.size,
    updatedAt: file.updatedAt,
    url: currentUrl,
  })
  const { markError, markReady, status } = useViewerStatus(
    url,
    kind === "audio"
  )
  const zoom = useZoom()
  const media = useRef<HTMLMediaElement | null>(null)

  // ←/→ step between files — except on a zoomed-in image, where the same
  // keys read as panning and must not tear the person away from the file.
  useSiblingKeys(siblings, kind !== "image" || !zoom.isZoomed)
  // Space toggles playback on audio and video, the player convention.
  useMediaKeys(media)
  // The neighbors warm only once this file is on screen, so preloading
  // never competes with the view it serves.
  usePreloadSiblings(siblings, status === "ready")

  return (
    <>
      <FileToolbar
        hasArrowKeys
        siblings={siblings}
        tools={viewerTools(kind, status, zoom)}
      >
        {meta}
      </FileToolbar>
      <ViewerFrame dotted={kind !== "pdf"} status={status}>
        {url === null ? null : (
          <ViewerContent
            kind={kind}
            media={media}
            name={file.name}
            onError={markError}
            onReady={markReady}
            url={url}
            zoom={zoom}
          />
        )}
      </ViewerFrame>
    </>
  )
}

/** Per-kind toolbar tools: zoom for images, nothing extra elsewhere —
 *  audio and video carry their controls inline, and the framed documents
 *  need only the shared navigation. */
function viewerTools(
  kind: ViewerKind,
  status: ViewerStatus,
  zoom: Zoom
): ReactNode | undefined {
  return kind === "image" ? (
    <ZoomTools isReady={status === "ready"} zoom={zoom} />
  ) : undefined
}

function ViewerContent({
  kind,
  media,
  name,
  onError,
  onReady,
  url,
  zoom,
}: {
  kind: ViewerKind
  media: React.RefObject<HTMLMediaElement | null>
  name: string
  onError: () => void
  onReady: () => void
  url: string
  zoom: Zoom
}) {
  switch (kind) {
    case "image":
      return (
        // The header's spacing scale as a guarantee: a visible margin on
        // every side says the whole picture is on screen. Zoomed content
        // may bleed into it — that overflow is deliberate.
        <div className="size-full p-4 md:p-6">
          <ZoomableImage
            name={name}
            onError={onError}
            onReady={onReady}
            url={url}
            zoom={zoom}
          />
        </div>
      )
    case "video":
      return (
        // Flex-centered with max constraints rather than object-contain:
        // the element shrinks to the picture, so the controls hug the
        // video and centering holds in every engine.
        <div className="flex size-full items-center justify-center p-4 md:p-6">
          {/* biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks. */}
          <video
            className="max-h-full max-w-full"
            controls
            onError={onError}
            onLoadedMetadata={onReady}
            ref={(element) => {
              media.current = element
            }}
            src={url}
          />
        </div>
      )
    case "audio":
      return (
        <div className="flex size-full items-center justify-center p-6">
          {/* biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks. */}
          <audio
            className="w-full max-w-xl"
            controls
            ref={(element) => {
              media.current = element
            }}
            src={url}
          />
        </div>
      )
    case "pdf":
      return (
        <iframe className="size-full" onLoad={onReady} src={url} title={name} />
      )
  }
}
