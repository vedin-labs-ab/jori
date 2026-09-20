import { type SVGProps } from "react"
import { cn } from "@/lib/utils"
import { brand } from "./geometry"
import { wordmarkPaths, wordmarkTransform, wordmarkWidth } from "./lettering"

type JoriLogoProps = SVGProps<SVGSVGElement> & {
  title?: string
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Jori"
      className={cn("h-8 w-auto shrink-0", className)}
      fill="none"
      focusable="false"
      role="img"
      viewBox={`0 0 ${wordmarkWidth} ${brand.size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Jori</title>
      <MarkArtwork />
      <g className="fill-black dark:fill-white" transform={wordmarkTransform}>
        {wordmarkPaths.map((path) => (
          <path d={path} key={path} />
        ))}
      </g>
    </svg>
  )
}

export function BrandIcon({ className }: { className: string }) {
  return <JoriLogo aria-hidden="true" className={className} />
}

/** How the mark carries itself where it stands for Jori at work. The slit
 *  is its one moving part: it pulses like a cursor while Jori is busy, and
 *  widens, once, when the work is done. Still for anyone who asks for less
 *  motion, where only the widened slit remains. */
export type BrandMood = "idle" | "working" | "done"

export function BrandFace({
  className,
  mood,
}: {
  className: string
  mood: BrandMood
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      fill="none"
      focusable="false"
      viewBox={`0 0 ${brand.size} ${brand.size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path className="fill-black dark:fill-white" d={brand.body} />
      <path
        className={cn(
          "origin-center fill-white transition-transform duration-500 ease-out [transform-box:fill-box] dark:fill-black",
          mood === "working" && "motion-safe:animate-pulse",
          mood === "done" && "scale-x-125"
        )}
        d={brand.slit}
      />
    </svg>
  )
}

export function JoriLogo({
  className,
  title = "Jori logo",
  ...props
}: JoriLogoProps) {
  return (
    <svg
      viewBox={`0 0 ${brand.size} ${brand.size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      fill="none"
      focusable="false"
      role="img"
      {...props}
    >
      <title>{title}</title>
      <MarkArtwork />
    </svg>
  )
}

function MarkArtwork() {
  return (
    <>
      <path className="fill-black dark:fill-white" d={brand.body} />
      <path className="fill-white dark:fill-black" d={brand.slit} />
    </>
  )
}
