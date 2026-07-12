import { Link } from "@tanstack/react-router"
import { type SVGProps } from "react"
import { cn } from "@/lib/utils"

type MiloLogoProps = SVGProps<SVGSVGElement> & {
  title?: string
}

/** The brand mark as the way home, for surfaces with nothing else linking
 *  back to the landing page. */
export function BrandLink() {
  return (
    <Link aria-label="Milo home" className="rounded-md" to="/">
      <BrandMark />
    </Link>
  )
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <BrandIcon className="size-8" />
      <span className="text-base font-medium">Milo</span>
    </div>
  )
}

export function BrandIcon({ className }: { className: string }) {
  return <MiloLogo aria-hidden="true" className={className} />
}

export function MiloLogo({
  className,
  title = "Milo logo",
  ...props
}: MiloLogoProps) {
  return (
    <svg
      viewBox="6 6 52 52"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 text-[#0A0A0B] dark:text-[#FBFAF8]", className)}
      fill="none"
      focusable="false"
      role="img"
      {...props}
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M18 6h28c6.6 0 12 5.4 12 12v28c0 6.6-5.4 12-12 12H18C11.4 58 6 52.6 6 46V18C6 11.4 11.4 6 18 6Zm3 33h22c1.7 0 3 1.3 3 3s-1.3 3-3 3H21c-1.7 0-3-1.3-3-3s1.3-3 3-3Z"
      />
    </svg>
  )
}
