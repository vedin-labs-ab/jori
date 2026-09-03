import { Scan, ZoomIn, ZoomOut } from "lucide-react"
import {
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type Zoom, zoomStep } from "./zoom"

// The image half of the viewer: a contain-fitted image that zooms with the
// dock's buttons, the wheel (pinch included), and double-click, and pans
// by dragging once zoomed. All state lives in the shared zoom hook so the
// dock and the canvas stay one machine.

/** The dock's controls for the image viewer. Rendered from the start — the
 *  dock never reflows — and enabled once the image is on screen. */
export function ZoomTools({ isReady, zoom }: { isReady: boolean; zoom: Zoom }) {
  return (
    <>
      <ZoomButton
        disabled={!(isReady && zoom.isZoomed)}
        icon={<ZoomOut />}
        label="Zoom out"
        onClick={() => zoom.zoomBy(1 / zoomStep)}
      />
      <ZoomButton
        disabled={!(isReady && zoom.canZoomIn)}
        icon={<ZoomIn />}
        label="Zoom in"
        onClick={() => zoom.zoomBy(zoomStep)}
      />
      <ZoomButton
        disabled={!(isReady && zoom.isZoomed)}
        icon={<Scan />}
        label="Fit to view"
        onClick={zoom.reset}
      />
    </>
  )
}

function ZoomButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          size="icon"
          type="button"
          variant="ghost"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function ZoomableImage({
  name,
  onError,
  onReady,
  url,
  zoom,
}: {
  name: string
  onError: () => void
  onReady: () => void
  url: string
  zoom: Zoom
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const pan = usePan(zoom)

  useWheelZoom(viewport, zoom)

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-to-pan and double-click zoom mirror the toolbar buttons, which stay the accessible path.
    <div
      className={cn(
        "size-full touch-none",
        zoom.isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
      )}
      onDoubleClick={(event) => {
        if (zoom.isZoomed) {
          zoom.reset()
        } else {
          zoom.zoomBy(2.5, anchorOf(event, viewport.current))
        }
      }}
      ref={viewport}
      {...pan}
    >
      <img
        alt={name}
        className="size-full select-none object-contain"
        draggable={false}
        onError={onError}
        onLoad={(event) => {
          zoom.measure({
            natural: {
              height: event.currentTarget.naturalHeight,
              width: event.currentTarget.naturalWidth,
            },
          })
          onReady()
        }}
        src={url}
        style={{
          transform: `translate(${zoom.state.x}px, ${zoom.state.y}px) scale(${zoom.state.scale})`,
        }}
      />
    </div>
  )
}

/** Drag-to-pan pointer handlers, active only while zoomed in. */
function usePan(zoom: Zoom) {
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null)

  function release(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null
    }
  }

  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (!zoom.isZoomed || event.button !== 0) {
        return
      }

      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (drag.current === null || drag.current.pointerId !== event.pointerId) {
        return
      }

      zoom.panBy(event.clientX - drag.current.x, event.clientY - drag.current.y)
      drag.current = { ...drag.current, x: event.clientX, y: event.clientY }
    },
    onPointerCancel: release,
    onPointerUp: release,
  }
}

/** Wheel and pinch zoom toward the pointer, plus a resize observer that
 *  keeps the pan clamps honest as the pane changes size. React's synthetic
 *  wheel handler is passive, so preventDefault needs a native listener. */
function useWheelZoom(viewport: RefObject<HTMLDivElement | null>, zoom: Zoom) {
  const { measure, zoomBy } = zoom

  useEffect(() => {
    const element = viewport.current

    if (element === null) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomBy(wheelFactor(event), anchorOf(event, element))
    }
    const observer = new ResizeObserver(() => {
      const box = element.getBoundingClientRect()
      measure({ viewport: { height: box.height, width: box.width } })
    })

    element.addEventListener("wheel", handleWheel, { passive: false })
    observer.observe(element)

    return () => {
      element.removeEventListener("wheel", handleWheel)
      observer.disconnect()
    }
  }, [measure, viewport, zoomBy])
}

/** Trackpad pinches arrive as ctrl-wheel with fine deltas; mouse wheels
 *  tick in coarse steps — both map onto a smooth exponential zoom. */
function wheelFactor(event: WheelEvent) {
  const delta =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? event.deltaY * 16
      : event.deltaY

  return Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.004))
}

/** The pointer's offset from the viewport center — the zoom anchor. */
function anchorOf(
  event: { clientX: number; clientY: number },
  element: HTMLElement | null
) {
  if (element === null) {
    return { x: 0, y: 0 }
  }

  const box = element.getBoundingClientRect()

  return {
    x: event.clientX - box.left - box.width / 2,
    y: event.clientY - box.top - box.height / 2,
  }
}
