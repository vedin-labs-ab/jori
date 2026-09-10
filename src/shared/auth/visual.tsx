import { useEffect, useRef } from "react"
import { brandHeadline } from "@/shared/brand/content"
import { mountShader } from "./shader"

export function SignInVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const desktop = window.matchMedia("(min-width: 64rem)")
    let destroy: (() => void) | undefined
    const update = () => {
      destroy?.()
      destroy = desktop.matches ? mountShader(canvas) : undefined
    }

    update()
    desktop.addEventListener("change", update)

    return () => {
      desktop.removeEventListener("change", update)
      destroy?.()
    }
  }, [])

  return (
    <aside
      aria-label="About Jori"
      className="relative hidden min-h-svh overflow-hidden border-l bg-[#eaf0e4] lg:block"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <canvas className="size-full" ref={canvasRef} />
      </div>

      <div className="absolute right-12 bottom-11 left-12 max-w-md xl:right-16 xl:bottom-14 xl:left-16">
        <p className="max-w-sm text-balance font-medium text-2xl tracking-tight">
          {brandHeadline}
        </p>
        <p className="mt-3 max-w-sm text-pretty text-foreground/65 text-sm/relaxed">
          Put the jobs nobody wants next to the tables and files they keep
          current, in folders shaped like your teams and projects. Who can see a
          folder, and what it costs to run, come with it.
        </p>
      </div>
    </aside>
  )
}
