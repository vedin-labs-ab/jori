import { marketingUrl } from "../region/paths"
import { BrandIcon } from "."

/** Public navigation keeps the compact icon and live name as separate parts. */
export function BrandLink() {
  return (
    <a
      aria-label="Jori home"
      className="flex items-center gap-2 rounded-md"
      href={marketingUrl()}
      referrerPolicy="no-referrer"
    >
      <BrandIcon className="size-8" />
      <span className="font-medium text-base">Jori</span>
    </a>
  )
}
