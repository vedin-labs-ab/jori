import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { RegionFlag } from "@/shared/region/flags"

/**
 * Two rhythms, and only two. A lead section carries an argument the page is
 * making; a supporting one qualifies the argument beside it. Giving them the
 * same height and the same heading size is what makes a long page read as one
 * undifferentiated stack, so the choice is deliberate at every call site.
 *
 * Either rhythm can set its heading `beside` the content instead of over it,
 * for a list that reads on its own once the heading has named it.
 */
export function Section({
  beside = false,
  children,
  className,
  id,
  lede,
  support = false,
  title,
}: {
  beside?: boolean
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
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-6",
          beside &&
            "md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-x-12 lg:gap-x-16"
        )}
      >
        <div className={beside ? "max-w-sm" : "max-w-2xl"}>
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
          <div className={cn(support ? "mt-8" : "mt-12", beside && "md:mt-0")}>
            {children}
          </div>
        )}
      </div>
    </section>
  )
}

export function PageIntro({ lede, title }: { lede: ReactNode; title: string }) {
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
  hint,
  label,
}: {
  children: ReactNode
  className?: string
  /** What the label is showing, after a dot: the audience, the source, the
   *  workspace. */
  hint?: ReactNode
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
        <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-foreground">
          {label}
        </span>
        {hint === undefined ? null : (
          <>
            <span aria-hidden>·</span>
            <span className="min-w-0 truncate">{hint}</span>
          </>
        )}
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
 *  way the editor draws them: a chip, each in its own color and set at
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

const tilts = {
  left: { mark: "-rotate-[9deg]", name: "rotate-[3deg]" },
  right: { mark: "rotate-[8deg]", name: "-rotate-[3deg]" },
  slight: { mark: "-rotate-[6deg]", name: "rotate-[2deg]" },
  steep: { mark: "rotate-[11deg]", name: "-rotate-[4deg]" },
}

/** Marketing mentions keep the mark and live name at opposing angles. */
export function Jori({ tilt = "left" }: { tilt?: keyof typeof tilts }) {
  return (
    <span className="whitespace-nowrap font-semibold text-foreground">
      <BrandIcon
        className={cn(
          "mr-[0.3em] inline-block size-[0.95em] align-[-0.15em]",
          tilts[tilt].mark
        )}
      />
      <span className={cn("inline-block", tilts[tilt].name)}>Jori</span>
    </span>
  )
}

/** A region named beside its flag, set in the foreground so the two
 *  choices stand out of the muted line that offers them. */
export function Region({ region }: { region: "eu" | "us" }) {
  return (
    <span className="whitespace-nowrap font-medium text-foreground">
      <RegionFlag
        className="mr-1 inline-block align-[-0.125em]"
        region={region}
      />
      {region.toUpperCase()}
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
