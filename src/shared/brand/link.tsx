import { marketingUrl } from "../region/paths"
import { BrandMark } from "."

/** The brand mark as the way home on public surfaces. */
export function BrandLink() {
  return (
    <a
      aria-label="Jori home"
      className="rounded-md"
      href={marketingUrl()}
      referrerPolicy="no-referrer"
    >
      <BrandMark />
    </a>
  )
}
