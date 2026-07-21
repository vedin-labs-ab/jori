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
    <span className="rounded-sm bg-primary/10 px-1 py-px font-medium text-foreground">
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
