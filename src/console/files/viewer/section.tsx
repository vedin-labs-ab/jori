import { ExternalLink } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type PreviewKind } from "@/shared/files/kind"
import { type FileSiblings, useSiblingKeys } from "../siblings"
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
  siblings,
  url: currentUrl,
}: {
  kind: ViewerKind
  meta: ReactNode
  name: string
  siblings: FileSiblings
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

  // ←/→ step between files — except on a zoomed-in image, where the same
  // keys read as panning and must not tear the person away from the file.
  useSiblingKeys(siblings, kind !== "image" || !zoom.isZoomed)

  return (
    <>
      <FileToolbar
        hasArrowKeys
        siblings={siblings}
        tools={viewerTools(kind, status, currentUrl, zoom)}
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

/** Per-kind toolbar tools: zoom for images, a full-window escape hatch for
 *  PDFs. Audio and video carry their controls inline, so their slot stays
 *  empty and the shared navigation stands alone. */
function viewerTools(
  kind: ViewerKind,
  status: ViewerStatus,
  url: string,
  zoom: Zoom
): ReactNode | undefined {
  switch (kind) {
    case "image":
      return <ZoomTools isReady={status === "ready"} zoom={zoom} />
    case "pdf":
      // The live url, not the frozen one — a tab opened minutes in still
      // deserves a fresh signature.
      return <OpenTool url={url} />
    default:
      return undefined
  }
}

function OpenTool({ url }: { url: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label="Open in new tab"
          asChild
          size="icon-sm"
          variant="ghost"
        >
          <a href={url} rel="noreferrer" target="_blank">
            <ExternalLink />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Open in new tab</TooltipContent>
    </Tooltip>
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
        // Flex-centered with max constraints rather than object-contain:
        // the element shrinks to the picture, so the controls hug the
        // video and centering holds in every engine.
        <div className="flex size-full items-center justify-center">
          {/* biome-ignore lint/a11y/useMediaCaption: uploaded files carry no caption tracks. */}
          <video
            className="max-h-full max-w-full"
            controls
            onError={onError}
            onLoadedMetadata={onReady}
            src={url}
          />
        </div>
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
