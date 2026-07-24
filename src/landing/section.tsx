import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Two rhythms, and only two. A lead section carries an argument the page is
 * making; a supporting one qualifies the argument beside it. Giving them the
 * same height and the same heading size is what makes a long page read as one
 * undifferentiated stack, so the choice is deliberate at every call site.
 */
export function Section({
  children,
  className,
  id,
  lede,
  support = false,
  title,
}: {
  children: ReactNode
  className?: string
  id?: string
  lede?: string
  support?: boolean
  title: string
}) {
  return (
    <section
      className={cn(
        "scroll-mt-10",
        support ? "py-14 md:py-18" : "py-20 md:py-28",
        className
      )}
      id={id}
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2
            className={cn(
              "font-medium text-balance tracking-tight",
              support ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
            )}
          >
            {title}
          </h2>
          {lede === undefined ? null : (
            <p
              className={cn(
                "text-muted-foreground leading-relaxed",
                support ? "mt-3" : "mt-4 text-lg"
              )}
            >
              {lede}
            </p>
          )}
        </div>
        <div className={support ? "mt-8" : "mt-12"}>{children}</div>
      </div>
    </section>
  )
}

export function PageIntro({ lede, title }: { lede: string; title: string }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-24">
      <div className="max-w-2xl">
        <h1 className="font-medium text-4xl text-balance tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
          {lede}
        </p>
      </div>
    </section>
  )
}

export function Definition({
  children,
  term,
}: {
  children: ReactNode
  term: string
}) {
  return (
    <div>
      <dt className="font-medium">{term}</dt>
      <dd className="mt-1.5 max-w-md text-muted-foreground text-sm leading-relaxed">
        {children}
      </dd>
    </div>
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
