import { Loader2 } from "lucide-react"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { cn } from "@/lib/utils"

/** Loading primitives shared by public, console, and artifact routes. */
const fullscreenLoaderHideDelayMs = 150

type FullscreenLoadingContextValue = {
  register: () => () => void
}

const FullscreenLoadingContext =
  createContext<FullscreenLoadingContextValue | null>(null)

const useSafeLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

export function LoadingMessage({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  )
}

export function FullscreenLoadingProvider({
  children,
  initiallyVisible = false,
}: {
  children: ReactNode
  initiallyVisible?: boolean
}) {
  const [activeCount, setActiveCount] = useState(0)
  const [isVisible, setIsVisible] = useState(initiallyVisible)
  const hideTimeoutRef = useRef<number | undefined>(undefined)
  const register = useCallback(() => {
    window.clearTimeout(hideTimeoutRef.current)
    setIsVisible(true)
    setActiveCount((current) => current + 1)

    return () => {
      setActiveCount((current) => Math.max(0, current - 1))
    }
  }, [])
  const value = useMemo(() => ({ register }), [register])

  useEffect(() => {
    if (activeCount > 0) {
      window.clearTimeout(hideTimeoutRef.current)
      return
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false)
    }, fullscreenLoaderHideDelayMs)

    return () => window.clearTimeout(hideTimeoutRef.current)
  }, [activeCount])

  return (
    <FullscreenLoadingContext.Provider value={value}>
      {children}
      <FullscreenLoadingOverlay isVisible={isVisible} />
    </FullscreenLoadingContext.Provider>
  )
}

export function FullscreenSkeletonLoader({
  className,
  mode = "viewport",
  style,
  ...props
}: ComponentProps<"div"> & {
  mode?: "fill" | "viewport"
}) {
  const loadingContext = useContext(FullscreenLoadingContext)

  if (loadingContext !== null) {
    return <FullscreenLoadingSignal />
  }

  return (
    <FullscreenLoadingOverlay
      className={className}
      isVisible
      mode={mode}
      style={style}
      {...props}
    />
  )
}

function FullscreenLoadingSignal() {
  const loadingContext = useContext(FullscreenLoadingContext)

  useSafeLayoutEffect(() => {
    return loadingContext?.register()
  }, [loadingContext])

  return null
}

function FullscreenLoadingOverlay({
  className,
  isVisible,
  mode = "viewport",
  style,
  ...props
}: ComponentProps<"div"> & {
  isVisible: boolean
  mode?: "fill" | "viewport"
}) {
  return (
    <div
      aria-hidden={isVisible ? undefined : true}
      aria-label="Loading"
      className={cn(
        "grid w-full place-items-center bg-muted",
        isVisible
          ? "opacity-100"
          : "pointer-events-none opacity-0 transition-opacity duration-150 motion-reduce:transition-none",
        mode === "viewport"
          ? "fixed inset-0 z-50 min-h-svh"
          : "h-full min-h-0 flex-1",
        className
      )}
      role="status"
      style={style}
      {...props}
    >
      <Loader2
        aria-hidden="true"
        className="size-5 animate-spin text-muted-foreground"
      />
    </div>
  )
}
