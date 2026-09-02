import { type LucideIcon } from "lucide-react"
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
  children?: ReactNode
  className?: string
  id?: string
  lede?: ReactNode
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
        {/* A section with no children is a statement band: the heading and
            lede are the whole content, so no empty block reserves space. */}
        {children === undefined ? null : (
          <div className={support ? "mt-8" : "mt-12"}>{children}</div>
        )}
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
  icon: Icon,
  term,
}: {
  children: ReactNode
  icon?: LucideIcon
  term: ReactNode
}) {
  return (
    <div>
      {/* Aligned to the first line, not to the block: a term that wraps
          would otherwise float its glyph between the two lines. */}
      <dt className="flex items-start gap-2 font-medium">
        {Icon === undefined ? null : (
          <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" />
        )}
        {term}
      </dt>
      <dd className="mt-1.5 max-w-md text-muted-foreground text-sm leading-relaxed">
        {children}
      </dd>
    </div>
  )
}

// Props are illustrations of Jori's work rendered as documents: an email, a
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

const sigils = {
  access: {
    glyph: "@",
    className: "-rotate-[8deg] bg-primary/15 text-primary",
  },
  skill: { glyph: "/", className: "rotate-[6deg] bg-warning/15 text-warning" },
  tool: {
    glyph: "#",
    className: "-rotate-[6deg] bg-chart-1/15 text-chart-1",
  },
}

/** One of the three marks the instructions editor answers to, drawn the
 *  way the editor draws them: a chip, each in its own colour and set at
 *  its own slight angle so the three read as three keys. */
export function Sigil({ kind }: { kind: keyof typeof sigils }) {
  const sigil = sigils[kind]

  return (
    <span
      className={cn(
        "mx-0.5 inline-block rounded-md px-2 py-0.5 font-mono font-semibold text-[0.95em] leading-tight",
        sigil.className
      )}
    >
      {sigil.glyph}
    </span>
  )
}

export function Mention() {
  return (
    <span className="rounded-sm bg-primary/10 px-1 py-px font-medium text-foreground">
      @jori
    </span>
  )
}

export function Chip({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-muted-foreground text-xs",
        className
      )}
    >
      {children}
    </span>
  )
}
