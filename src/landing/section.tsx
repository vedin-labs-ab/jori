import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Section({
  children,
  className,
  id,
  lede,
  title,
}: {
  children: ReactNode
  className?: string
  id?: string
  lede: string
  title: string
}) {
  return (
    <section className={cn("scroll-mt-10 py-20 md:py-28", className)} id={id}>
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="font-medium text-3xl text-balance tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {lede}
          </p>
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  )
}

// Props are illustrations of Milo's work rendered as documents: an email, a
// thread, a run. They share one quiet frame so the page reads as one system.
export function Prop({
  children,
  className,
  label,
}: {
  children: ReactNode
  className?: string
  label: ReactNode
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-card-foreground",
        className
      )}
    >
      <figcaption className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5 text-muted-foreground text-xs">
        {label}
      </figcaption>
      {children}
    </figure>
  )
}

export function Mention() {
  return (
    <span className="rounded-sm bg-primary/10 px-1 py-px font-medium text-primary">
      @milo
    </span>
  )
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-muted-foreground text-xs">
      {children}
    </span>
  )
}

// Entrance reveal for the hero only: one orchestrated moment, gated behind
// motion-safe so the page is complete without it.
const revealDelays = [
  "",
  "[animation-delay:100ms]",
  "[animation-delay:200ms]",
  "[animation-delay:320ms]",
] as const

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: 0 | 1 | 2 | 3
}) {
  return (
    <div
      className={cn(
        "[animation-fill-mode:backwards] motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:animate-in motion-safe:duration-700",
        revealDelays[delay],
        className
      )}
    >
      {children}
    </div>
  )
}
