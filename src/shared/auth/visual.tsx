import { useEffect, useRef } from "react"
import { mountShader } from "./shader"

export function SignInVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    return mountShader(canvas)
  }, [])

  return (
    <aside
      aria-label="About Milo"
      className="relative hidden min-h-svh overflow-hidden border-l bg-[#edf1eb] lg:block"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <canvas className="size-full" ref={canvasRef} />
      </div>

      <div className="absolute right-12 bottom-11 left-12 max-w-md xl:right-16 xl:bottom-14 xl:left-16">
        <p className="max-w-sm text-balance font-medium text-2xl tracking-tight">
          Start the day already caught up.
        </p>
        <p className="mt-3 max-w-sm text-pretty text-foreground/65 text-sm/relaxed">
          Milo keeps work moving across your tools and asks before it acts.
        </p>
      </div>
    </aside>
  )
}
