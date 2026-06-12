import { X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { SurfaceLogo } from "../logo"
import { type ScheduleSurfaceProvider } from "../surfaces"

type ScheduleSurfaceRemoveMode = "provider" | "remove"

export function ScheduleSurfaceRemoveButton({
  onRemove,
  provider,
  providerLabel,
}: {
  onRemove: () => void
  provider: ScheduleSurfaceProvider
  providerLabel: string
}) {
  const [mode, setMode] = useState<ScheduleSurfaceRemoveMode>("provider")
  const { providerRef, removeRef, width } = useScheduleSurfaceRemoveWidth(mode)

  return (
    <button
      aria-label={`Remove ${providerLabel} marker`}
      className="relative flex items-center gap-1 overflow-hidden px-2 font-medium outline-none transition-[width] duration-150 ease-out motion-reduce:transition-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30"
      onBlur={() => setMode("provider")}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onRemove()
      }}
      onFocus={() => setMode("remove")}
      onMouseEnter={() => setMode("remove")}
      onMouseLeave={() => setMode("provider")}
      style={width === null ? undefined : { width }}
      title={`Remove ${providerLabel}`}
      type="button"
    >
      <ScheduleSurfaceRemoveContent
        mode={mode}
        provider={provider}
        providerLabel={providerLabel}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1 px-2 opacity-0"
        ref={providerRef}
      >
        <ScheduleSurfaceProviderIcon provider={provider} />
        {providerLabel}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1 px-2 opacity-0"
        ref={removeRef}
      >
        <X className="size-3" />
        Remove
      </span>
    </button>
  )
}

function ScheduleSurfaceRemoveContent({
  mode,
  provider,
  providerLabel,
}: {
  mode: ScheduleSurfaceRemoveMode
  provider: ScheduleSurfaceProvider
  providerLabel: string
}) {
  return (
    <span
      className="flex items-center gap-1 whitespace-nowrap"
      data-schedule-remove-content=""
    >
      {mode === "remove" ? (
        <>
          <X className="size-3" />
          Remove
        </>
      ) : (
        <>
          <ScheduleSurfaceProviderIcon provider={provider} />
          {providerLabel}
        </>
      )}
    </span>
  )
}

function ScheduleSurfaceProviderIcon({
  provider,
}: {
  provider: ScheduleSurfaceProvider
}) {
  return <SurfaceLogo className="size-3" provider={provider} />
}

function useScheduleSurfaceRemoveWidth(mode: ScheduleSurfaceRemoveMode) {
  const providerRef = useRef<HTMLSpanElement>(null)
  const removeRef = useRef<HTMLSpanElement>(null)
  const [widths, setWidths] = useState<
    Record<ScheduleSurfaceRemoveMode, number | null>
  >({
    provider: null,
    remove: null,
  })

  const measure = useCallback(() => {
    const nextWidths = {
      provider: getMeasuredWidth(providerRef.current),
      remove: getMeasuredWidth(removeRef.current),
    }

    setWidths((currentWidths) =>
      currentWidths.provider === nextWidths.provider &&
      currentWidths.remove === nextWidths.remove
        ? currentWidths
        : nextWidths
    )
  }, [])

  useEffect(() => {
    measure()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(measure)

    if (providerRef.current !== null) {
      observer.observe(providerRef.current)
    }

    if (removeRef.current !== null) {
      observer.observe(removeRef.current)
    }

    return () => observer.disconnect()
  }, [measure])

  return { providerRef, removeRef, width: widths[mode] }
}

function getMeasuredWidth(element: HTMLElement | null) {
  if (element === null) {
    return null
  }

  const width = element.getBoundingClientRect().width || element.scrollWidth

  return width > 0 ? Math.ceil(width) : null
}
